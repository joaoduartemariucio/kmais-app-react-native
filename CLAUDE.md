@AGENTS.md

## Claude Code

For any feature that touches maintenance, fuel or vehicle rules, follow the workflow in
[docs/agents.md](docs/agents.md):

1. `automotive-expert` — what the rule should be in the real world.
2. `react-native-specialist` — how it fits this codebase.
3. `reviewer` — checks both before any code is written; send back on "changes requested".
4. `executor` — implements the approved plan and runs `make ci`.
5. `reviewer` — reviews the resulting diff.

Small changes with no domain impact (a typo, a layout tweak, a build fix) can go straight to
`executor`.
