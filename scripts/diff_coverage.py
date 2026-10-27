#!/usr/bin/env python3
"""Fails when the lines changed since a base commit are not covered enough by tests.

Reads line coverage from the lcov report written by `jest --coverage`, intersects it
with the lines added or modified since `--base` (whitespace-only changes ignored), and compares
the result to `--min`. Files matching a glob in `--ignore-file` are left out. Lines that are not
executable (comments, braces, declarations) never count, and neither do files the coverage
report does not list, which have no executable code.
"""

import argparse
import fnmatch
import os
import re
import subprocess
import sys


def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def changed_lines(base, source_dir):
    try:
        merge_base = run("git", "merge-base", base, "HEAD").strip()
    except subprocess.CalledProcessError:
        sys.exit(f"Base '{base}' is not in the local history. Fetch it (CI needs fetch-depth: 0) or pass another --base.")
    diff = run(
        "git", "diff", "--unified=0", "--ignore-all-space", "--diff-filter=AM", merge_base, "--", f"{source_dir}/*.ts", f"{source_dir}/*.tsx"
    )

    changes, current = {}, None
    for line in diff.splitlines():
        if line.startswith("+++ "):
            path = line[4:]
            current = path[2:] if path.startswith("b/") else None
        elif line.startswith("@@") and current:
            match = re.search(r"\+(\d+)(?:,(\d+))?", line)
            start, count = int(match.group(1)), int(match.group(2) or 1)
            changes.setdefault(current, set()).update(range(start, start + count))

    untracked = run("git", "ls-files", "--others", "--exclude-standard", "--", f"{source_dir}/*.ts", f"{source_dir}/*.tsx").split()
    for path in untracked:
        with open(path) as file:
            changes[path] = set(range(1, sum(1 for _ in file) + 1))
    return changes


def ignored_patterns(path):
    if not path or not os.path.exists(path):
        return []
    with open(path) as file:
        return [line.strip() for line in file if line.strip() and not line.startswith("#")]


def read_lcov(path):
    coverage, current = {}, None
    with open(path) as file:
        for line in file:
            line = line.strip()
            if line.startswith("SF:"):
                current = os.path.relpath(line[3:]) if os.path.isabs(line[3:]) else line[3:]
                coverage.setdefault(current, {})
            elif line.startswith("DA:") and current:
                number, hits = line[3:].split(",")[:2]
                coverage[current][int(number)] = int(hits)
            elif line == "end_of_record":
                current = None
    return coverage


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lcov", default="coverage/lcov.info")
    parser.add_argument("--base", required=True, help="commit or ref the changes are compared to")
    parser.add_argument("--source-dir", default="src")
    parser.add_argument("--min", type=float, default=80.0)
    parser.add_argument("--ignore-file", default=".coverageignore")
    args = parser.parse_args()

    if not os.path.exists(args.lcov):
        sys.exit(f"Coverage report '{args.lcov}' not found. Run `make test` first.")

    patterns = ignored_patterns(args.ignore_file)
    ignored = lambda path: any(fnmatch.fnmatch(path, pattern) for pattern in patterns)
    changes = {path: lines for path, lines in changed_lines(args.base, args.source_dir).items() if not ignored(path)}
    report = read_lcov(args.lcov)

    rows, executable, covered = [], 0, 0
    for path, lines in sorted(changes.items()):
        coverage = report.get(path)
        if not coverage:
            continue
        relevant = sorted(line for line in lines if line in coverage)
        if not relevant:
            continue

        missed = [line for line in relevant if coverage[line] == 0]
        executable += len(relevant)
        covered += len(relevant) - len(missed)
        rows.append((path, len(relevant), len(relevant) - len(missed), missed))

    counted = {path: lines for path, lines in report.items() if path.startswith(args.source_dir + "/") and not ignored(path)}
    total_lines = sum(len(lines) for lines in counted.values())
    total_hit = sum(1 for lines in counted.values() for hits in lines.values() if hits > 0)
    summary = [f"Overall line coverage of `{args.source_dir}` (ignored files excluded): {total_hit / total_lines * 100:.1f}%" if total_lines else ""]

    if executable == 0:
        summary.append("No executable lines changed outside the ignored files — nothing to check.")
        passed = True
    else:
        percent = covered / executable * 100
        passed = percent >= args.min
        summary += [
            "",
            "| File | Changed executable lines | Covered | Uncovered lines |",
            "|---|---|---|---|",
            *[
                f"| `{path}` | {count} | {hit} | {', '.join(map(str, missed)) or '—'} |"
                for path, count, hit, missed in rows
            ],
            "",
            f"**Coverage of changed lines: {percent:.1f}% ({covered}/{executable}) — minimum {args.min:.0f}%**",
        ]

    text = "\n".join(summary)
    print(text)
    if summary_path := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(summary_path, "a") as file:
            file.write("## Coverage\n\n" + text + "\n")

    if not passed:
        print(f"\nChanged lines are below the {args.min:.0f}% coverage minimum.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
