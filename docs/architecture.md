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

The arrows, each with an import behind it:

| Arrow | Behind it |
| :-- | :-- |
| `components/` → `lib/click/` | the composer reads `tempo.ts`'s range |
| `components/` → `lib/tap/` | the composer records taps and commits on the silence |
| `lib/tap/` → `lib/click/` | `tapTempo.ts` reads `MIN_BPM`/`MAX_BPM` to refuse a tempo it cannot play |
| `hooks/` → `lib/click/` | `useClickTransport.ts` builds the scheduler and the audio clock |
| `hooks/` → `components/` | **type-only**: the hook imports `Transport` from `Metronome.tsx`, pointing at its own consumer. No zone forbids it and it erases at build, but the contract would sit better in `lib/click/` |
| `lib/click/` → `@/lib/velocity` | gain per beat, and nothing else in the app |
| `components/`, `lib/` → `@/lib/snippets` | every word the user is shown |

Zone 6 enforces the one that matters: nothing in `lib/` reaches back up into
UI, a hook or the store.

**`lib/tap/` → `lib/click/` is the first arrow between two concern folders, and
nothing guards its direction.** The reverse — `lib/click/` importing `lib/tap/`
— would be wrong (the scheduler has no business knowing how a tempo was
arrived at) and would pass lint today. That is a review-only rule until a
second such pair makes a zone worth writing, which is the same measured-growth
test a door has to meet.

`lib/click/` has no `index.ts` and has not earned one — its modules are imported
directly, which
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
