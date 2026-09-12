# 0012. A groove is data, and `lib/groove/` is machinery over it

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

`lib/groove/` was written for exactly one groove and said so in every name:
`figure.ts` held funk's lines beside the four-bar cycle, `humanize.ts` exported
`STRAIGHT_FUNK_HUMANIZE`, `swing.ts` exported `STRAIGHT_FUNK_SWING`, and
`source.ts` exported `createStraightFunkSource`. Only `kit.ts` belonged to no
particular groove.

V10 adds rock. Three shapes were available and two of them get worse with every
groove after this one.

## Decision

**A groove is a `GrooveDefinition` — data — and `lib/groove/` is the machinery
that plays any of them.**

`cycle.ts` owns the bar index, the four-bar cycle and `hitsAt`. `source.ts` owns
one `createGrooveSource(definition, options)`. `humanize.ts` and `swing.ts` keep
their helpers and lose their named records. `grooves/definition.ts` states the
shape, and `grooves/straightFunk.ts` and `grooves/rock.ts` hold nothing but
lines, humanize, swing, seed and subdivision.

The third groove costs one file in `grooves/` and one entry in the transport's
registry. Nothing else.

## Consequences

- **A timing fix lands once.** The alternative — a parallel `lib/rock/` — would
  have copied `barIndexFor` and the source factory, so the next correction to
  either would have had two homes and would have been applied to one.
- **`createGrooveSource` must populate `takeStep`**, which
  [ADR 0011](0011-a-pre-roll-is-a-source-that-wraps-a-source.md) added and the
  old factory predates. A groove does not shift its own timeline, so identity
  is the right value — but a definition-driven factory is exactly the shape in
  which an optional member gets forgotten, and a groove behind a count-in would
  then draw the wrong samples.
- **The six invariants become a function, not a test.**
  `groove/invariants.ts` exports `sixInvariantViolations(definition)`, so a new
  groove's test calls it rather than restating ADR 0010. Funk's own assertions
  were consolidated behind it, which is a real loss: funk no longer
  independently asserts that step 0 carries `kick` at 0.95. The helper has its
  own negative tests, and that is what the coverage now rests on.
- **One groove's data file may import another's.** `rock.ts` takes
  `STRAIGHT_FUNK_HUMANIZE` from `straightFunk.ts` because the record is shared
  and a second copy would be a second thing to drift. It means deleting funk
  would break rock. When a third groove wants it, the record moves to a
  `grooves/shared.ts` and this line comes out.
- **A groove's data file is now the only place its sound lives**, so a
  definition that type-checks is not thereby a groove. `subdivision` in
  particular is a *declaration* — under-declaring it (saying 4 where the figure
  states 8) makes invariant 2 pass a bar with real holes in it. The declaration
  is the load-bearing part and each groove's test pins it.

## Alternatives considered

- **A parallel `lib/rock/`** — no refactor, and every piece of machinery
  duplicated on day one. It loses on the second timing fix.
- **Rock's lines added to `figure.ts`** — the cheapest diff, and it leaves a
  folder called `groove` and constants called `STRAIGHT_FUNK_*` describing two
  grooves. It defers this refactor to a moment when there is more to move.
