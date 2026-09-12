# Testing

This document holds the standard: what must be tested and how a test is judged.
Where a test file goes, and the shapes to avoid, are rules —
**[coding-guidelines.md](coding-guidelines.md)** owns those, with the file in
this repo that motivated each one. See also [architecture.md](architecture.md)
for the shape the tests are protecting.

## What must be tested

- **Every feature must be unit tested.** A feature is not done without tests.
- **Design-system components are tested against their own contract** — props,
  states, accessibility — independently of any feature. A primitive that can
  only be tested through a feature has stopped being a primitive.
- **Logic in `lib/` is tested directly.** It is plain functions; test them as
  plain functions.

## How a test is judged

- **Test behaviour through the feature's public surface, not its internals.** A
  test that reaches past `index.ts` couples the feature's internal layout to its
  test suite, and the feature stops being something you can refactor in one step.
  A `vi.mock` of an internal path is the same coupling wearing a different hat.
- **Test rendered behaviour, not implementation details.** What the user sees
  and does, not which hook fired or how state is held.
- **A relocated assertion keeps its subject.** Moving a test to the file that
  owns its subject is a move; rewriting it as an isolated render with hand-made
  props is a different assertion wearing the old one's name.

## Timing is not a wall clock

A metronome's correctness is a scheduling question, so the audio clock and the
test clock both have to be substitutable. Drive time from an injected source —
a fake `AudioContext`, a fake scheduler — never from `Date.now()` or a real
`setTimeout` the test has to wait out. A test that sleeps is a test that will be
flaky on a loaded machine, and a drift assertion that sleeps proves nothing
about drift.

**An assertion nothing but an ear can settle is stated as such**, in the spec
and in the report, rather than dressed up as a passing test.

## Not every assertion runs under `npm test`

A type-level assertion is checked by `tsc`, which runs in `npm run build` — not
by Vitest. `src/components/tokens.test.ts` pins the closed `Space` scale with a
`@ts-expect-error`, and widening the type to `number` passes all of `npm test`
while failing the build. Know which command holds a given guard before trusting
a green run, and say so in the test when it is not the obvious one.

## Structural tests

Some conventions no linter can check are guarded by tests that read the tree or
the source from disk and fail when it drifts. They run under `npm test`, not
`npm run lint`. Today:

| Test | Guards |
| :-- | :-- |
| `src/components/structure.test.ts` | the five design-system groups, `tokens.ts` at the root, no barrels, no import climbing out of its folder |
| `src/app/route-boundary.test.ts` | a route reaches a feature only through its `index.ts` — including `vi.mock`, dynamic `import()` and `require()`, which lint cannot see |
| `src/app/theme.test.ts` | every custom property `@theme` reaches for is declared somewhere, and the body is dressed in the theme |
| `eslint.config.test.ts` | each live lint zone fires on a bad import and stays quiet on a good one |

The guidelines say which rule each one stands behind, and which rules
`npm run lint` enforces instead.

Write one when a convention is a fact about the tree — a folder set, a public
surface, a file that may not import something a linter cannot see, such as a
`vi.mock` path. A guard that reads source has to keep itself out of its own
search: spell any constant it looks for as an expression, so the test file is
not a second place that constant is written.
