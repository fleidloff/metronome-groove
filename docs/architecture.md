# Architecture

This document holds the model and the reasoning: how the tree is shaped and why.
The rules that follow from it — what you may import from where, where a file
goes, what a linter will reject — live in one place:

**[coding-guidelines.md](coding-guidelines.md)** — the concrete rulebook, every
rule tagged *lint-enforced* or *human-checked* and named after the file that
motivated it. Read that before writing code.

See also [testing.md](testing.md) for what must be tested, and
**[adr/](adr/)** for why the shape is this one — the decisions behind it, in the
order they were taken, including the ones that have since been replaced.

## The model

The app is built as vertical feature slices. Two directories carry the weight:

- `src/components` — the design system: generic, reusable building blocks.
- `src/features/<feature>` — one self-contained feature per folder.

Everything else is glue: `src/app` for routing, `src/lib` for code that sits
below the app.

A feature owns everything it needs in one folder — its UI, its hooks, its state,
its data and its business logic — and exposes one public surface, `index.ts`.
Its tests live inside it. The point of the shape is that a slice is a unit you
can reason about, hand to someone else, or delete, without tracing it through
the rest of the app.

The design system is the other half of that bargain. Its components are reusable
*by construction*: driven by props, holding no app state, knowing no domain
concept. A primitive that has learned about the metronome is no longer a
primitive, and the feature it learned about is no longer removable.

## Why the dependency direction is the load-bearing part

Almost every rule in the guidelines is one arrow in a graph the app is allowed to
draw. The direction is what makes the slices work:

- The design system may use shared utilities, but never a feature. That one-way
  dependency is what keeps it reusable.
- Features do not reach each other. There is no sideways arrow, so anything two
  slices need moves *up* into `src/lib` or `src/components` rather than making
  one slice a dependency of the other.
- `src/lib` is a leaf — it imports nothing from the app. That is what lets it
  hold knowledge the whole app shares without any of it depending on which
  feature is on screen.

The guidelines draw the full graph and name the ESLint zone behind each arrow.
Since V1 those zones exist and are tested rather than described — see
[ADR 0001](adr/0001-enforced-import-graph.md).

```
src/app/         → a feature's index.ts, src/components/, src/lib/
a feature slice  → src/components/, src/lib/
src/components/  → src/lib/
```

Every pair not drawn is an error.

## The arrows inside a slice

The graph above is between directories. Inside a feature folder there is a
second graph that the directories do not show: which of the slice's concerns may
reach which. **V3 pulled that trigger**: the slice now holds two concern
folders, `lib/click/` and `lib/tap/`, which is exactly what this section said
would mean it was time to draw one. So here it is, small because the graph is
small.

**V6 reshaped it.** `lib/click/` used to hold both the transport and the click's
own sound. A second source made that name wrong, so the clock, the scheduler and
`tempo.ts` moved to `lib/transport/`, `lib/click/` kept the claves and its
pattern, and `lib/groove/` arrived beside them. Each folder now says what it
computes, which is the rule
[coding-guidelines.md](coding-guidelines.md#feature-slices) already gave.

The arrows, each with an import behind it:

| Arrow | Behind it |
| :-- | :-- |
| `components/` → `lib/transport/` | the composer reads `tempo.ts`'s range |
| `components/` → `lib/tap/` | the composer records taps and commits on the silence |
| `components/` → `lib/setup/` | the composer reads the remembered setup after mount and writes it on change |
| `lib/setup/` → `lib/transport/` | `storedSetup.ts` validates a stored tempo with `isTempo` and a stored id against `SOURCE_IDS`, rather than keeping second copies |
| `hooks/` → `lib/remote/` | `useRemoteControl.ts` binds the speaker's button |
| `lib/tap/` → `lib/transport/` | `tapTempo.ts` reads `MIN_BPM`/`MAX_BPM` to refuse a tempo it cannot play |
| `hooks/` → `lib/transport/` | `useClickTransport.ts` builds the scheduler and the audio clock |
| `hooks/` → `lib/click/`, `lib/groove/` | the hook picks which `Source` is playing and builds that voice bank |
| `hooks/` → `lib/countIn/` | the hook wraps the groove's source when a run is started with the box ticked, and never wraps the click |
| `lib/countIn/` → `lib/click/` | **a sideways arrow between concern folders.** `countIn/source.ts` imports `CLICK_PATTERN` — the count bar is the click's own accent pattern, and a second copy of those velocities is the thing that drifts |
| `lib/countIn/` → `lib/transport/` | `countIn/source.ts` implements the `Source` it also wraps |
| `lib/groove/` → `lib/transport/` | `groove/source.ts` implements the `Source` the transport walks |
| `lib/groove/`, `lib/setup/`, `hooks/`, `components/` → `lib/mute/` | four readers, one direction. `groove/source.ts` filters each rendered step, `storedSetup.ts` validates a stored set, `useClickTransport.ts` carries the getter to the device, and `MuteRow.tsx` renders the row. `lib/mute/` imports none of them |
| `components/` → `lib/groove/` | `Metronome.tsx` reads `grooves/registry.ts` for the selected `GrooveDefinition`, which the mute row needs to know which toggles to show. V15 moved `GROOVES` out of `useClickTransport.ts` for this: a component may not reach into a hook for data |
| `lib/click/` → `lib/transport/` | `click/source.ts` does the same for the click |
| `hooks/` → `components/` | **type-only**: the hook imports `Transport` from `Metronome.tsx`, pointing at its own consumer. No zone forbids it and it erases at build, but the contract would sit better in `lib/transport/` |
| `lib/transport/`, `lib/groove/` → `@/lib/velocity` | gain per hit |
| `lib/transport/`, `lib/groove/` → `@/lib/steps` | the step grid, and what lands on a quarter |
| `components/`, `lib/` → `@/lib/snippets` | every word the user is shown |

Zone 6 enforces the one that matters: nothing in `lib/` reaches back up into
UI, a hook or the store.

The slice now holds eight concern folders — `click/`, `countIn/`, `groove/`,
`mute/`, `remote/`, `setup/`, `tap/` and `transport/`.

**`lib/mute/` is the most-read of them, and that is why it is a folder rather
than a function somewhere.** It holds one mapping — which kit voices each of the
three row toggles covers — plus the last-audible rule and the filter itself.
`groove/` filters its rendered steps through it, `setup/` stores its sets,
`hooks/` carries the getter into the audio device and the slice's `components/`
render its row — so **four** places read it and it reads none of them. It
imports types only.

The mapping is also where a guarantee lives that would otherwise be a branch:
`claves` appears in no entry, so the click and the count-in are outside muting
**by construction**. Nothing checks for them; there is nothing to check.

**`lib/groove/` is the first to have grown an inner split**, and it is the one
worth knowing about: `cycle.ts`, `source.ts`, `invariants.ts`, `humanize.ts`,
`swing.ts` and `kit.ts` are machinery that plays any groove, and `grooves/` holds
one data file per groove and nothing else
([ADR 0012](adr/0012-a-groove-is-data.md)). A new groove is a file in `grooves/`
plus an entry in the transport's registry. The arrow inside the folder runs one
way — machinery never imports a definition, except that `source.ts` and
`cycle.ts` take one as an argument.

**"It touches no machinery" was the claim here until V12, and the shuffle broke
it.** A groove costs nothing in machinery while it uses a mechanism that already
works. Shuffle was the first groove to turn swing on, and swing had never run at
a non-zero value, so it was the first to find one that did not —
[ADR 0014](adr/0014-swing-warps-the-grid.md). The rule that survives is narrower
and more useful: **a groove that reaches for a mechanism nothing has exercised
is buying that mechanism, not just adding a file.**

**There is no sideways arrow inside `grooves/` any more, and there is a test
that says so.** Every groove file imports exactly `./definition` for the shape,
`./shared` for the humanize record and `@/lib/steps` for the grid — nothing
else, and never another groove.

That was not always true. The record lived in `grooves/straightFunk.ts` from V6,
under funk's name, and this document carried the exception with a trigger:
*when a third groove wants it, the record moves to `grooves/shared.ts`*. The
third arrived in V11, and V12 and V13 each added a fourth and fifth consumer
without paying it. The move finally happened after V16, and the record is now
`KIT_HUMANIZE` — a name no groove owns.

**The lesson is about the trigger, not the record.** A rule that names its own
condition still needs something that checks the condition; three changes read
that sentence and none of them noticed it had fired. What holds it now is
`grooves/structure.test.ts`, which reads the folder from disk and fails when a
groove imports a sibling — so the next reach sideways is a red test rather than
a paragraph someone has to remember to act on.

**`lib/countIn/` is the second sideways arrow**, and it was weighed rather than
added quietly. It reaches into `lib/click/` for `CLICK_PATTERN` because a
count-in *is* the click, stated for one bar in front of something else — the
alternative was a second copy of the accent velocities, which is worse. If a
third folder wants `CLICK_PATTERN`, the pattern has outgrown `click/` and
belongs in `@/lib/` beside the step grid.

**`lib/remote/` is the one that**
touches a platform API the app cannot schedule around. It owns the media
session and the silent element that claims it; nothing else in the slice knows
either exists. Why it is shaped that way — and why the feature is absent on
Firefox rather than degraded — is
[ADR 0004](adr/0004-bluetooth-media-buttons.md).

**Two arrows now run between concern folders, and nothing guards either
direction.** `lib/tap/` → `lib/transport/` reads the tempo range; `lib/setup/` →
`lib/transport/` validates a stored tempo and a stored source id against the
same place. Both reverses would be wrong — the scheduler has no business knowing
how a tempo was arrived at, or that one was ever stored — and both would pass
lint today.

**That is the measured growth a zone waits for.** One such pair was a
review-only rule; two is the point at which it is worth writing down that
`lib/transport/` is a leaf among the concern folders. Adding the zone is one
entry in `eslint.config.mjs`, and the next change that touches this area should
weigh it rather than adding a third arrow quietly.

**V6 added three more such arrows and one of them matters more than the others.**
`lib/click/` and `lib/groove/` both depend on `lib/transport/`, which is the
right direction: the transport defines `Source` and neither source-shaped folder
is anything the transport knows about. The rule to hold at review is that
`lib/transport/` must never import either of them. It would pass lint, and it
would make the transport know about one particular groove — which is exactly why
`displace` and `trim` sit on the `Source` rather than in the scheduler.

No concern folder in the slice has an `index.ts`, and none has earned one — the
modules are imported directly, which
[coding-guidelines.md](coding-guidelines.md#feature-slices) says is correct
until measured growth says otherwise.

When it is worth writing, this is the section it goes in, and three things have
to be true of it:

- **Each line names a file**, so the map can be re-measured rather than believed.
- **It says what holds each arrow** — a lint zone, a structural test, or nothing
  but review. "Review only" rows are the useful ones: a guard that follows
  measured growth leaves everything that has not grown unguarded, and naming
  which parts those are is the difference between a scope and an oversight.
- **The map describes the tree, not the other way round.** If a module here does
  not survive contact with a lint zone, a guard or a folder that moved, this
  section is what changes. A map that has drifted from the import graph is worse
  than no map, because it is believed.

**A map is how a reader groups the code; a door is what an import rule can
check.** The two rarely line up. A door can only ever be one folder's
`index.ts`, so a concern spanning three folders and four hooks cannot have one
even if it wants one.
[coding-guidelines.md](coding-guidelines.md#feature-slices) says on what terms a
folder earns a door.

## Every feature must be removable

This is the standard the shape exists to serve:

> Delete `src/features/<feature>/`, delete its route folder under `src/app`,
> remove its one registration entry — and the app still builds and runs.

Removability is a test of coupling, not a plan to delete anything. A feature
whose internals have leaked into the route, into the design system, or into a
sibling cannot be moved, rewritten or replaced in one step either — deletion is
just the cheapest way to notice.

What keeps it true: a feature's inbound references are countable on one hand —
its route(s) in `src/app`, and, where it must appear in shared UI, a single
registration point such as a nav entry. Its state, its types and its styles stay
inside the folder. Its consumers, tests included, know only its `index.ts`.

Before merging a feature, ask: could I `rm -rf` this folder and still get a clean
build? If not, something leaked, and the guidelines will name what.
