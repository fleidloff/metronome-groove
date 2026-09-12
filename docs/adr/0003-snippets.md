# 0003. User-facing text lives in `src/lib/snippets/`, by language

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

`docs/coding-guidelines.md` has said since V1 that no user-facing string is
written inside a component and that the app's words live in
`src/lib/snippets/`. Until V2 that folder did not exist, so the rule was stated
and honoured nowhere — `Start`, `Stop`, `Tempo`, `Bar` and the page title were
inline.

A second thing was true and worse: the **tests** wrote the same words out.
`getByRole('button', { name: 'Start' })` makes a test file a second place the
wording lives, so rewording a button breaks a test that has nothing to do with
wording. That teaches everyone that changing a word is risky, which is how
copy stops being changed.

## Decision

**All user-facing text lives in `src/lib/snippets/`, one file per area under a
language folder, behind one index.**

```
src/lib/snippets/
├── types.ts          the shape each area must satisfy
├── en/app.ts         the app's name and tagline
├── en/metronome.ts   the controls and the bar
└── index.ts          re-exports each area under its own name
```

Consumers import `@/lib/snippets` and read a key off an area object. **No file
outside `src/lib/snippets/` may name `snippets/en` in a specifier** — the
language folder is what a second language replaces, so a consumer that names it
pins the app to English. English is the only language today; the folder exists
so adding a second one is a folder rather than a refactor.

An area satisfies a type in `types.ts`, so a new language fails to compile
until it is complete rather than being quietly half-translated.

**And the rule that has teeth: changing a snippet must never fail a test.** A
test asserts *which* snippet a thing shows by importing it, never by copying
what it says.

## Consequences

**What this buys.** Rewording anything is one edit in one file, and the suite
stays green — proven, not asserted: every snippet in the app was rewritten into
German and all 77 tests passed, then restored.

**What enforces it.** `src/lib/snippets/snippets.test.ts` reads every string the
module can render, including what its interpolating functions return, and fails
if any test file outside the module writes one down. Three exclusions, each
because flagging it would be wrong rather than inconvenient:

- **Module specifiers.** `@/features/metronome/components/Metronome` contains
  the app's name, and renaming the app does not move the file.
- **Test titles.** `it('schedules four beats at 120 bpm')` is prose about the
  test. Rewording a snippet cannot fail it, and flagging it would train people
  to route around the guard.
- **The module's own tests**, which must write sentences out — that is where a
  sentence is defined.

**What it cost to get right.** The guard was wrong twice before it was right,
and both were found by mutation rather than by reading. It first skipped
template literals containing substitutions, which let `` `${MIN_BPM} bpm` ``
hide the unit in three assertions. Fixed by splitting templates on their
substitutions, it then matched module paths and test titles, which is what the
three exclusions above are for.

**What it rules out.** A string in a component, an `aria-label` written inline,
and a test that quotes the app's words. An accessible name is a word the user is
read, so it is a snippet like any other.

**What is still open.** Only the words this app has today are covered. There is
no pluralisation, no number or date formatting, and no runtime language switch —
`index.ts` re-exports `en/` directly. A second language needs that indirection
and this ADR does not pre-decide its shape.

## Alternatives considered

- **An i18n library** (`next-intl`, `react-i18next`) — buys pluralisation, a
  locale router and message extraction. Rejected for now: the app has eight
  strings, and the library's message catalogue would still need the discipline
  above to keep tests from quoting it. Worth revisiting when a second language
  is real rather than hypothetical.
- **Strings in components, tests importing a shared constant** — half the
  benefit, none of the language boundary, and nothing stops the next component
  from writing its own.
- **Keeping daily-groove's guard as-is** — that project's `snippets.test.ts`
  pins sentences directly (`expect(puzzle.drumCredit).toBe('Drum samples from
  …')`), so rewording that credit fails a test. Deliberately not copied.
