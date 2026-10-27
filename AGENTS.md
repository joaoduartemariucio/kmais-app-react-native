# AGENTS.md

Guide for AI coding agents working on Kmais — a React Native (Expo) app that tracks car and
motorcycle maintenance: fuel log, consumption, cost per km and service reminders. It is the
React Native version of [kmais-app-ios](https://github.com/joaoduartemariucio/kmais-app-ios):
same screens, rules, tests, agents and CI gates.

## Commands

```bash
npm ci             # install dependencies (Node 22, see .nvmrc)
make ci            # everything CI runs, in order — must pass before handing work back
make format        # fix formatting
make lint          # ESLint, zero warnings, including the layer-boundary rules
make build         # typecheck + bundle the app for iOS and Android
make test          # unit tests with coverage
make coverage      # ≥ 80% of changed executable lines must be covered
npx expo run:ios   # run the app in the iOS Simulator (EXPO_PUBLIC_PREVIEW_DATA=true seeds demo data)
```

Expo changes every SDK release. Before touching an Expo or React Native API, read the docs for
the SDK in `package.json` (`https://docs.expo.dev/versions/v<major>.0.0/`) instead of relying on
memory, and add native packages with `npx expo install` so versions match the SDK.

## Architecture — do not break these

Pragmatic Clean Architecture in one package, folders as layers. Details: [docs/architecture.md](docs/architecture.md).

- `src/domain/` is **plain TypeScript** (plus `decimal.js`). Entities are immutable objects
  built by `make…` functions; calculations are pure functions and never read the clock.
- `src/data/` is the only place that knows SQLite and native modules. Rows never leave it;
  schema changes are a **new** migration in `KmaisSchema`.
- `src/presentation/` talks to Domain contracts only. One MobX ViewModel class per screen,
  rendered by `observer` components.
- `src/composition/AppDependencies.ts` is the only place that creates concrete types.
- `src/app/` holds the Expo Router routes: thin files that pick the screen to show.

## Conventions

- **No comments in TypeScript code.** The why goes in [docs/decisions.md](docs/decisions.md).
- Money is `Decimal` (`decimal.js`); distance and volume are `number`.
- Optional values are `null`, never `undefined`, in entities and calculation results.
- Form fields are `string` with a `NumberInputStyle`; validation is `ValidationIssue[]`,
  blocking (red) or warning (orange).
- Every user-facing string goes in `src/presentation/i18n/locales/en.json` **and** `pt-BR.json`,
  keyed by its English text. A test fails if a key is missing, untranslated or unused.
- After every `await` in a ViewModel, state changes go through `runInAction`.

## Tests

- Jest (`describe`, `test`, `expect`) through `jest-expo`.
- Domain calculations in `test/calculations/`, ViewModels and presentation helpers in
  `test/presentation/`, SQLite repositories in `test/data/`.
- Use the fakes in `test/fakes/` and `FixedDateProvider`; repository tests run against an
  in-memory SQLite through `better-sqlite3`, never a device.
- New or changed logic needs tests: the CI gate is 80% of changed lines
  (views, routes and native glue are excluded — see `.coverageignore`).

## Before handing work back

1. `make ci` passes.
2. `docs/decisions.md` has an entry for any choice a reader could not infer from the code.
3. Never commit, push or create branches unless the user asks.

## Agent workflow

This repo defines four Claude Code subagents in `.claude/agents/` — a car and motorcycle
expert, a React Native specialist, a reviewer and an executor. How and why they work together:
[docs/agents.md](docs/agents.md).
