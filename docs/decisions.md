# Decisions

Short record of choices that are not obvious from the code. Each one says what was decided,
why, and what it costs. Newest first within each group.

## Port from iOS

### Same product, same rules, idiomatic React Native

Kmais exists as a SwiftUI app ([kmais-app-ios](https://github.com/joaoduartemariucio/kmais-app-ios)).
This repository is its React Native version: the same screens, features, domain rules, tests,
agents and CI gates, with the architecture translated to what the React Native community uses.

| iOS                                  | React Native                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| SwiftUI views                        | React Native components styled like iOS grouped lists, `observer` from `mobx-react-lite` |
| `@Observable` ViewModels (MVVM)      | MobX classes (`makeAutoObservable`)                                                      |
| `@Environment(\.dependencies)`       | `DependenciesProvider` / `useDependencies()`, filled only by `AppDependencies`           |
| `NavigationStack` + `AppRoute`       | Expo Router (native stack) + `AppRoute`                                                  |
| `.sheet(item:)`                      | `Modal` with `presentationStyle="pageSheet"`                                             |
| SwiftData `@ModelActor` repositories | `expo-sqlite` behind the `SqlDatabase` port                                              |
| `Decimal` (Foundation)               | `Decimal` (`decimal.js`)                                                                 |
| Foundation `Calendar`                | `src/domain/entities/Calendar.ts` (UTC or device-local)                                  |
| UserNotifications                    | `expo-notifications`                                                                     |
| Swift Charts                         | `react-native-svg` drawn by hand                                                         |
| SF Symbols                           | `expo-symbols` (SF Symbols on iOS, Material Symbols on Android)                          |
| `Localizable.xcstrings`              | `i18next` with `en.json` / `pt-BR.json` keyed by the English text                        |
| SwiftLint custom rules               | ESLint `no-restricted-imports` per layer                                                 |
| SwiftFormat                          | Prettier                                                                                 |
| Swift Testing + fakes                | Jest (`jest-expo`) + the same fakes                                                      |
| `xccov`                              | `lcov` from `jest --coverage`                                                            |

- **Why:** the value of the app is in its rules and its tests; keeping them identical means
  both apps give the same numbers. The stack follows the most common Expo choices so the code
  reads familiar to React Native developers.
- **Cost:** some rules are re-implemented instead of shared (calendar arithmetic, number
  formatting). The ported test suite — every iOS scenario, same dates and numbers — is what
  keeps them in line.

### MobX for ViewModels

Each screen keeps a ViewModel class with plain fields and getters, made observable by
`makeAutoObservable`; views are `observer` components.

- **Why:** it is the closest match to Swift's Observation — computed properties stay getters,
  tests read `viewModel.issues` exactly as the Swift tests do, and nothing in the ViewModel knows
  React, so it is tested without rendering.
- **Cost:** state changed after an `await` must go through `runInAction`, and fields that hold
  entities are `observableRef` so MobX does not wrap `Decimal` and `Date` values in proxies.

### Routes pass ids, sheets pass objects

The vehicle screen is the route `/vehicles/[id]`; it looks the vehicle up with
`VehicleRepository.vehicle(id)`. Forms are not routes: they open as page sheets from the screen
that owns them, which hands them entities, readings and an `onSaved` callback.

- **Why:** Expo Router params are URL strings, so entities can't travel through them, while
  forms need the parent's state (readings, last price, rules) and to tell it to reload — exactly
  what SwiftUI's `.sheet(item:)` gives the iOS app.
- **Cost:** opening a vehicle costs one extra read; a sheet can't be deep-linked.

### SQLite behind a five-method port

Repositories talk to `SqlDatabase`, not to `expo-sqlite` directly. The app uses
`ExpoSqlDatabase`; the tests use `better-sqlite3` with the same migrations and SQL.

- **Why:** `expo-sqlite` only runs inside the app, and the iOS rule "a repository needs tests"
  still applies. With the port the repositories and schema are tested in Jest against a real
  SQLite engine.
- **Cost:** two thin adapters to keep in sync; SQLite builds differ slightly between the device
  and Node, so SQL stays on the common subset.

### Strict schema with migrations instead of a CloudKit-ready schema

The tables have primary keys, `NOT NULL` vehicle references and `ON DELETE CASCADE`. Schema
changes are new entries in the `KmaisSchema` migration list, tracked by `PRAGMA user_version`.

- **Why:** the iOS schema avoids unique constraints and required relationships only because
  CloudKit forbids them. SQLite has no such limit, so the database enforces what the iOS app
  has to check by hand (`fetchByID` asserting a single match, mappers dropping orphans).
- **Cost:** sync, if it ever comes, needs its own design instead of flipping a switch.

### Native folders are generated

`ios/` and `android/` are not in the repository; `npx expo run:ios` (or EAS) generates them from
`app.json` and the config plugins.

- **Why:** Expo's Continuous Native Generation keeps native configuration declarative and
  upgrades to new SDKs mechanical.
- **Cost:** native tweaks must go through `app.json` or a config plugin, never by editing the
  generated projects.

### Tooling pins

- `.npmrc` sets `legacy-peer-deps`: an optional peer of Expo's CLI (`react-dom`) asks for a
  newer React than React Native ships with. Nothing in the app uses `react-dom`.
- ESLint stays on 9: `eslint-plugin-react`, part of `eslint-config-expo`, does not support 10 yet.

## Data entry

### Odometer out of order is a warning, not an error

When the odometer typed in a fuel-up or service does not fit between the previous and the
next record (by date), the form shows an orange note — "the next record has 56,000 km;
saving this changes the vehicle's history" — and still lets the user save.

- **Why:** people log old receipts, fix typos and register a car after the fact. Blocking
  the save made editing old records impossible.
- **Cost:** the history can hold inconsistent readings. Domain already copes:
  `Consumption.anomalies` flags them and they are left out of consumption stats.

### Numeric fields are digit-shifting masks

Typing fills from the right, like banking apps: `5899` becomes `R$ 5,899`. Each field has
a `NumberInputStyle`:

| Style                  | Fraction digits | Used for                                               |
| ---------------------- | --------------- | ------------------------------------------------------ |
| `kilometers`, `months` | 0               | odometer, rule intervals                               |
| `liters`               | 2               | liters, tank capacity                                  |
| `fuelPrice`            | 3               | price per liter (pumps in Brazil charge in 3 decimals) |
| `money`                | 2               | service cost                                           |

- **Why:** a plain number pad is enough (no decimal separator to type or get wrong), the
  value is always shown formatted for the locale, and parsing is just
  `digits / 10^fractionDigits` — identical in any locale.
- **Cost:** the caret always sits at the end; editing in the middle of a number is not
  supported. Deleting a non-digit (a trailing currency symbol) removes the last digit.

### Keyboard closes on drag, tap outside or "Done"

Each form sheet scrolls with `keyboardDismissMode="interactive"` and
`keyboardShouldPersistTaps="handled"`, and every field shares an `InputAccessoryView` with a
"Done" button (the number pad has no return key).

- **Why:** the same three gestures as the iOS app, with React Native's own props instead of a
  window-level gesture recognizer. Taps on buttons and switches still go through.
- **Cost:** the "Done" bar is iOS-only; Android's number pad has its own close key.

### Relative days are worded in the catalog

"in 30 days", "yesterday" and the other relative dates come from the locale files, not from
`Intl.RelativeTimeFormat`.

- **Why:** `Intl.RelativeTimeFormat` support varies between Hermes builds, and the catalog gives
  the same words Apple's named style uses in English and Portuguese.
- **Cost:** a new language needs those strings translated too — the catalog test fails until it is.

## Quality gates

### Coverage is checked on changed lines, not on the whole project

CI requires 80% of the executable lines added or modified by a change to run in tests
(see [CI](ci.md#coverage-of-changed-lines)). Views, routes and native glue are left out via
`.coverageignore`.

- **Why:** a global threshold either blocks everything from day one or is set so low it
  means nothing. Checking new code raises coverage with every change and puts the cost on
  whoever writes the code, while it is still fresh.
- **Cost:** old untested code only gets tests when someone touches it — refactors and even
  reformatting pull those lines into the check. The ignore list needs judgment: a view that
  grows real logic should move it to its ViewModel rather than stay excluded.

### Prettier with community defaults

The formatter runs on defaults, with options pinned only where defaults are ambiguous or
differ from the iOS project ([CI](ci.md#format--prettier)). Formatting is checked, never
discussed in review.

### Every string is checked against the catalogs

A test scans `src/` for `t('…')` calls and fails when a key is missing from the catalogs, when
a catalog key is no longer used, or when the Portuguese catalog is missing or blank for a key.

- **Why:** Xcode's string catalog flags missing translations on its own; i18next silently falls
  back to the key.
- **Cost:** keys must be string literals at the call site, which is the convention anyway.

## Architecture

### Layers as folders in one package, guarded by lint

- **Why:** one developer, one app. Separate packages would add build and workspace
  maintenance for little gain today.
- **Cost:** TypeScript can't stop `presentation` from importing `data`; ESLint does, by path.
- **Revisit when:** a second target (widget, watch app, web) needs the same code — then `domain`
  and `data` become workspace packages.

### Reload on focus, no reactive queries

- **Why:** the same choice as the iOS app's "no `@Query`": repositories return plain entities,
  ViewModels reload when the screen gains focus and after each write.
- **Cost:** a change made elsewhere shows up on the next load. Fine for a single-user, offline app.
- **Revisit when:** a screen needs live updates — `expo-sqlite`'s change listener fits inside
  the repositories behind an additive `observe…()` method, with no contract changes.

### No use-case layer

- **Why:** most use cases would be one-line pass-throughs to a repository. Business rules
  live in `src/domain/calculations` and are tested there.
- **Revisit when:** the same flow is triggered from three or more screens, or one operation
  has to coordinate several repositories consistently.

## Calculations

### Money is `Decimal`; distance and volume are `number`

Prices and totals never go through floating-point arithmetic: they are `Decimal` from
`decimal.js` in memory and text in SQLite. `decimalApproximating()` converts a `number` through
its shortest string form (`String(0.1)`), so `0.1` stays `0.1` — the same rule as Swift's
`Decimal(approximating:)`.

### Consumption only between full tanks

A km/L value needs a full tank at both ends; partial fill-ups in between add their liters
to the interval. Entries with non-positive liters are skipped entirely and reported as
anomalies.

### Forecasts are deterministic

`Maintenance.forecast` never reads the clock; the latest reading is "now". The next
service is the earlier of the distance-based date (from the vehicle's km/day pace) and
the calendar-based date. Months use `365.25 / 12` days only when shown to the user.

### The current odometer is the most recent reading, not the highest

A reading that goes backwards is bad data; returning the maximum would hide it.

## Reminders

### Reminders are re-planned from scratch on every sync

`ServiceReminderSync` loads every active vehicle, asks `ReminderPlan` (pure, in `Domain`)
when each rule is due, cancels pending notifications that no longer match a rule and
schedules the rest. Each notification's id is its rule's id, so scheduling again replaces it.

- **Why:** due dates move whenever anything changes — a fuel-up shifts the km/month pace, a
  service resets the interval, a rule is edited or a vehicle archived. Recomputing everything
  is simpler and harder to get wrong than updating reminders incrementally per event.
- **Cost:** a sync reads all active vehicles. Fine for one driver's garage; revisit if a
  sync ever shows up in a profile.

### Sync runs at the end of the list and detail `load()`

Those two screens already reload after every write and when the app opens, so syncing there
covers every change without each form knowing about reminders.

- **Cost:** a sync also runs when the user just navigates. It is idempotent and cheap.
- **Revisit when:** reads become reactive — then sync on data changes instead.

### When a reminder fires

Reminders use the same status as the screen (`Maintenance.status`), so a notification never
calls something overdue that the app shows as due soon.

- **Ahead of time:** at 9:00 on the forecast due day.
- **Overdue** (calendar date passed, or the odometer reached the due km): at the next 9:00,
  daily for the first 7 days, then weekly, until the service is logged. "Overdue since" is
  the calendar due date, or the date of the first reading at or past the due km. Daily
  nagging forever teaches people to turn notifications off.
- **Pace estimate passed, not overdue:** no repeats. The notification already fired on the
  estimated day; repeating it daily for a car that sits in the garage would be noise. A rule
  that also has a months interval is still reminded at 9:00 on its calendar due day.
- **Km-only rule without a km/day pace** (one reading, or no movement): no date to schedule,
  so it is notified only once a logged reading reaches the due km. Readings only change when
  the user logs something, and every log triggers a sync, so that is when it fires.

When a rule is overdue both ways, "since" is the earlier of the two dates and the text says
"Overdue since" the calendar date. A rule with both intervals whose pace estimate has passed
still gets a reminder at 9:00 on its calendar due day.

Only one notification is pending per rule, and it is re-planned on every sync, so the daily
and weekly repeats happen only while the app keeps being opened.

Each notification names the vehicle and the service. Overdue by km says the due km and the
last reading, because the app only knows the last logged odometer, not the live one.
Permission to notify is asked only when there is something to schedule.

### `ServiceReminderSync` is the first use case

It coordinates three repositories and the scheduler and is triggered from two screens — the
trigger the "No use-case layer" decision set for revisiting. It lives in
`src/presentation/reminders` because it builds localized notification text; the scheduling rule
itself is in `src/domain/calculations/ReminderPlan.ts`.

### Service status: on track, due soon, overdue

Each reminder shows a status computed by `Maintenance.status(of:currentOdometer:now:calendar:)`,
counted from the last service of that kind (or the vehicle's creation).

- **Overdue** only when the calendar due date has passed or the odometer reached the due km.
  The distance-based date is an estimate from the km/day pace; a car parked for weeks must
  not turn red just because the estimate passed.
- **Due soon** when km left ≤ 15% of the interval, clamped to 300–1,000 km, or days left to
  the forecast date ≤ 15% of the period, clamped to 15–30 days. The floors keep short
  intervals (a 1,000 km chain) from warning one day ahead; the caps keep long ones (40,000 km
  spark plugs) from warning months ahead. Same rule for cars and motorcycles.
- A km-only rule on a vehicle without a km/day pace yet still shows, from km alone, with a
  hint to log another reading; it has no date until there is a second reading with distance.

## Presentation

### Dashboard on the vehicle screen

The detail screen leads with the odometer and km/month, a 2×2 grid of metrics, every
reminder with its status and progress, a km/L chart (two or more intervals) and a six-month
spending chart (months without records count as zero), then the history with an
All / Fuel / Services filter. Adding records moved to a bottom bar so it is one tap.

### New fuel-ups start with the last price

The price per liter is filled in from the latest fuel-up, with a footer saying so. Most
fill-ups happen at the same station, so this saves typing; the field stays editable.

### Category colors

Fuel is teal and services indigo everywhere (rows, charts, badges), using the iOS system
colors on both platforms. Status uses green,
orange and red, so fuel deliberately avoids orange.

### Transparent large-title header on iOS only

The Stack header is transparent only on iOS (`headerTransparent: Platform.OS === 'ios'`). On iOS
the scroll views use `contentInsetAdjustmentBehavior="automatic"`, which pushes the content
below the large title and lets it scroll under the blurred bar. That prop does nothing on
Android, so a transparent header there draws the title and back arrow on top of the first
card. Android gets a solid header in the background color and the content starts below it.
`headerLargeTitle` stays on every screen; Android ignores it.

### Form sheets add the status bar inset on Android

`FormSheet` opens a `Modal` with `presentationStyle="pageSheet"`. iOS shows it as a card below
the status bar; Android shows it full screen and edge to edge, so the Cancel / title / Save bar
would sit under the status bar. On Android the sheet pads its top by the safe-area top inset.
The modal gets its own `SafeAreaProvider` because on Android a `Modal` is a separate window and
the app's provider does not report its insets. iOS keeps no extra padding.

### Service kind grid is built from rows, not `flexWrap`

`ServiceKindGrid` used to give each cell a computed fractional width inside a wrapping row.
Android rounds layout to physical pixels, so three cells plus gaps could end up a fraction wider
than the container and the third cell wrapped, leaving two columns. The grid now splits the kinds
into rows (`gridRows`) and each cell is `flex: 1`, so Yoga divides the row itself and it can never
overflow; the last row is padded with empty cells so its items keep the same width. Yoga adds
padding on top of `flexBasis: 0`, so the empty cells share the real cells' box style (`cellBox`:
`flex: 1` plus the same padding); otherwise the real cells in the last row grow wider.

## Tooling

### Four specialized AI agents instead of one

Development uses four Claude Code subagents — a car and motorcycle expert, a React Native specialist,
a reviewer and an executor — with shared rules in `AGENTS.md`. Only the executor edits code,
and nothing is done until `make ci` passes. Rationale and workflow: [agents.md](agents.md).
