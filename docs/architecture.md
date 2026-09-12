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

```
src/app/         → a feature's index.ts, src/components/, src/lib/
a feature slice  → src/components/, src/lib/
src/components/  → src/lib/
```

Every pair not drawn is an error.

## The arrows inside a slice

The graph above is between directories. Inside a feature folder there is a
second graph that the directories do not show: which of the slice's concerns may
reach which. **This project has not drawn one yet**, and that is the honest
state rather than an omission — a map is worth writing when a slice has grown
enough concerns that a reader cannot hold them, and not before.

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
