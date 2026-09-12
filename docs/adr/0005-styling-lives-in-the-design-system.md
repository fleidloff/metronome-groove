# 0005. Styling lives in the design system, and a feature holds none

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

The design-system rules were all in place and none of them had a subject.
`docs/architecture.md` drew the arrow from a feature to `src/components/`,
`coding-guidelines.md` gave five role groups with a one-line test each, a
generic-naming rule and a no-barrels rule, `structure.test.ts` asserted the
folder set from disk, and zone 1 stopped a primitive importing a feature.

Behind all of it, `src/components/` held `tokens.ts`, `structure.test.ts` and
five folders containing nothing but `.gitkeep`. Every visual decision the app
had ever made — the button, the slider, the tempo readout, the four beat dots,
the page frame — lived in `src/features/metronome/components/` as Tailwind
utilities on a feature's own JSX.

That was not drift. **No rule anywhere said styling may not live in a feature.**
A grep of `coding-guidelines.md` for tailwind, className or styling returned
three hits and not one of them was that rule. The design system was a described
place that nothing was obliged to use.

## Decision

**No `className` appears anywhere under `src/features/`.** Styling lives in
`src/components/`; a feature composes primitives and holds composition, state
and domain. A look the design system does not have is added there as a variant
and selected with a prop.

Layout counts. The page frame and the gaps between things are `layout/`
primitives taking the `Space` scale from `tokens.ts`, not a `gap-*` on a feature
`<div>`.

The rule binds `src/features/` and stops there. `src/app/layout.tsx` keeps its
`<html>` and `<body>` classes, because `next/font` must put its CSS-variable
classes on `<html>` and a document shell is not a component you compose. That is
the whole exception and it is expressed as a path rather than an allowlist.

It is enforced by `metronome/no-styling-in-features` in `eslint.config.mjs`: a
`no-restricted-syntax` selector on the `className` **JSX attribute**, scoped to
`src/features/**/*.tsx`.

## Consequences

**What this buys.** Every visual decision has one home, so a primitive is
reusable by construction rather than by intention. `tokens.ts` finally has a
consumer — it had been a closed scale with nothing taking it since V1. And a
feature's diff becomes readable as behaviour, because the styling is not in it.

**What it costs.** A new look is now two files and two tests rather than one
class: the variant in `src/components/`, its test, then the feature's call. That
cost is the point — it is what makes someone ask whether the variant is the
system's or the feature's — but it is a real tax on a one-off tweak.

**It obliges the `Space` scale to be able to say what the app renders.** V5
found two gaps the scale could not express and resolved them in opposite
directions: `Space` widened to carry `10` and `12`, and the one wrapper at
`gap-5` moved to `gap-4`. `5` is `tokens.test.ts`'s worked example of a value a
closed scale rejects, so admitting it would have cost that test its point. The
4px that moved is the only rendering change V5 made.

**The guard is `npm run lint`, not `npm test`.** `eslint.config.test.ts` lints
fixture strings, so it proves the rule block is configured and would fail if the
block were deleted — but it never reads `src/features/` from disk. A `className`
reintroduced into a real feature file passes the whole Vitest suite and is
caught only by lint. Any pre-push or CI path that runs `npm test` without
`npm run lint` does not carry this rule. `docs/testing.md` records it under
*Not every assertion runs under `npm test`*.

**What it rules out.** Reaching for a utility class in a feature file, including
as a debugging shortcut. And it rules out a primitive that takes a `className`
passthrough, which would reinstate the whole thing behind a prop.

## Alternatives considered

- **A structural test reading `src/features/` from disk** — the shape
  `route-boundary.test.ts` and `structure.test.ts` already use, and it would put
  the guard under `npm test`. It lost because it is a text scan: a test helper
  reading `element.className` trips it, so it arrives needing an ignore list.
  The AST rule matches the attribute and leaves a DOM read alone.
- **Both guards** — the lint rule for fast feedback and the structural test for
  the suite. It lost because the second one catches no case the first misses,
  and it is two places to edit when the rule changes. The coverage gap it would
  have closed is named above instead.
- **Banning visual utilities and allowing layout ones** — `bg-`, `text-`,
  `rounded-` out; `flex`, `gap`, `px` in. It lost because it needs a prefix
  allowlist a reviewer maintains, and every new Tailwind utility becomes a
  judgement call at review time.
- **Extracting the components and leaving the rule human-checked** — consistent
  with how the naming and region rules are treated. It lost because an
  unenforced rule is how the styling ended up in the feature in the first place.
