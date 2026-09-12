# 0001. Enforce the import graph with generated per-feature ESLint zones

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

`docs/architecture.md` describes an import graph — the design system may not know
about features, features do not reach each other, `src/lib/` is a leaf — and
`docs/coding-guidelines.md` tags several rules *lint-enforced*. Until V1 neither
was true: the documents described machinery the repository did not have, and
every agent definition under `.claude/` told a worker those zones bound them.

A graph that is written down but not enforced decays in one direction only. The
first violation is cheap to fix and invisible; the tenth is a refactor.

## Decision

`eslint.config.mjs` carries one named block, `metronome/import-boundaries`,
appended after `eslint-config-next`, configuring `import/no-restricted-paths` as
an **error**. The zones are built by `eslint.zones.mjs`, which exports
`buildZones(features)` and reads the feature list from disk.

- **Zones 2 and 3 are generated per feature**, not hand-listed. A new slice
  inherits both with no config edit.
- **Zone numbering skips 5.** It held a generator boundary in the project these
  documents came from; this project synthesizes at runtime and has none. The gap
  is kept so the two configs can be read side by side.
- **The block carries no `files` key**, so a boundary binds a test exactly as it
  binds source.
- **Every zone carries a `message`** naming the rule and the reason, because a
  lint error is where most people meet these rules first.

The zones are proven rather than believed: `eslint.config.test.ts` drives
ESLint's Node API over this repo's own config on synthetic source with a virtual
`filePath`, asserting each live zone both **fires** on a bad import and **stays
quiet** on a good one.

## Consequences

**What this buys.** The graph is now a fact about the repository rather than a
claim in a document. A slice added later is bounded on the day it is created.
And because the proof runs through the Node API, a zone can be *watched to
reject* something — a fixture committed to the tree would fail `npm run lint`
for everyone, so this is the only way to see one fail.

**What it costs.** `eslint-import-resolver-typescript` is now load-bearing:
without it the `@/` alias does not resolve and every zone silently passes. That
is a dependency whose absence looks like success, which is the worst failure
mode a guard can have. The Node API test is what stands between us and it.

**What it rules out.** Reaching into a slice from outside, sideways imports
between features, and app imports inside `src/lib/`. Each now needs a config
change and an ADR superseding this one, rather than a reviewer not noticing.

**What is still unguarded, and deliberately.** Zone 3 does not exist while there
is one feature — its target is the sibling features and there are none. It is
asserted at the generator instead, with a two-feature list. Lint also reads
import specifiers only: a `vi.mock` of a cross-boundary path passes. That half
is covered by `src/app/route-boundary.test.ts`, which reads source from disk,
and the two guards are complementary rather than redundant.

## Alternatives considered

- **Hand-listed zones** — loses the property that matters most. Zone 3 would
  silently stop existing at exactly the moment someone forgot to update it.
- **Replace `eslint-config-next` rather than extend it** — total control over
  the config's shape, at the cost of Next's own rules and of re-adding them one
  at a time the first time one would have helped.
- **Trust review** — what the sibling project measured and found wanting: a
  composer there was cut three times and grew back twice while nothing watched.
