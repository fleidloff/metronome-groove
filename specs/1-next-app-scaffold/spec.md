# V1. Next.js app scaffold

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 1`

## What

* "let's initialise the next.js app with typescript"
* The repo has no `package.json`, no `src/`, no toolchain. `docs/`, `.claude/`
  and `specs/` are all that exist today, so this change is the one that turns a
  documentation repo into an app.
* The documents were written before the code, which is unusual and load-bearing
  here: `docs/coding-guidelines.md` describes lint zones, structural tests and a
  folder layout **that do not exist yet**. This change is where they become
  true, or where we decide they land later.

## Done when

1. `npm run lint`, `npm test` and `npm run build` all pass on a clean checkout
   after `npm install`, with no warnings suppressed to get there.
2. Opening the app renders the metronome slice's placeholder, and
   `src/app/page.tsx` imports it as `@/features/metronome` — nothing deeper.
3. Structural tests read the tree from disk and fail on drift: the design-system
   folder set, the absence of barrels under `src/components/`, and the route
   importing only the slice's `index.ts` (specifiers **and** `vi.mock` paths).
4. A test drives ESLint's Node API over this repo's own `eslint.config.mjs` and
   shows every live zone both **firing** on a bad import and **staying quiet** on
   a good one, on synthetic source with a virtual `filePath`.
5. `src/app/globals.css` carries a Tailwind v4 `@theme` block, and
   `src/components/tokens.ts` declares the closed spacing scale the layout
   primitives will take.

## Decided

Nothing in this conversation yet. The entries below are **settled by the
documents already in the repo** — recorded here so the build has them in one
place, not re-asked. If one of them is wrong, that is an ADR, not a spec
question.

* **The folder layout** — `src/app/`, `src/components/`, `src/features/<feature>/`,
  `src/lib/`, because [docs/architecture.md](../../docs/architecture.md) says so.
* **The design-system groups** — `layout/`, `surfaces/`, `controls/`,
  `typography/`, `display/`, plus `tokens.ts` at the root, per
  [docs/coding-guidelines.md](../../docs/coding-guidelines.md#the-design-system).
* **The import graph** — `src/app/` → a feature's `index.ts`, `src/components/`,
  `src/lib/`; a feature → `src/components/`, `src/lib/`; `src/components/` →
  `src/lib/`. Every pair not drawn is an error, enforced by
  `import/no-restricted-paths` in `eslint.config.mjs`, zones numbered 1, 2, 3, 4
  and 6 with 5 deliberately skipped.
* **The three commands** — `npm run lint`, `npm test`, `npm run build`. Every
  agent definition names exactly these and forbids inventing others.
* **Tests are colocated and run under `npm test`**, per
  [docs/testing.md](../../docs/testing.md). The docs reference `vi.mock`
  throughout, so the runner is Vitest.
* **No offline generator.** Settled when these docs were adapted: the click is
  synthesized at runtime, so there is no `scripts/` tier and no `npm run test:gen`.

And one decided in this conversation:

* **The guardrails land in V1, with the scaffold** — `eslint.config.mjs` with
  zones 1, 2, 3, 4 and 6, plus the structural tests, rather than as a later
  change. Because every agent definition in `.claude/` already tells a worker
  those zones bind them: a first feature built before they exist is built
  unguarded against rules its builder was told were enforced.

  **Known and accepted:** with zero features, zones 2 and 3 generate an empty
  `target` list and are inert until the first slice lands. They are written
  anyway, for the reason `docs/coding-guidelines.md` gives — a generated zone
  becomes load-bearing at exactly the moment someone would have forgotten to
  add it by hand.

* **Tailwind v4** — CSS-first theming through `@theme` in
  `src/app/globals.css`. Because the `prototype` skill already tells a reader to
  copy that block, so the docs had assumed it; confirming it costs nothing and
  leaving it unconfirmed would have made a skill lie. `tokens.ts` stays the
  closed spacing scale the layout primitives take, per the guidelines — Tailwind
  is the styling layer, not a replacement for that vocabulary.

* **V1 renders one real feature slice, stubbed** — `src/features/metronome/`
  with an `index.ts` exporting a placeholder component, and `src/app/page.tsx`
  importing it through that index and nothing deeper. Because it exercises the
  whole import graph end to end rather than describing it: zones 2 and 3 stop
  being inert, and the route-boundary structural test gets a real file to read.
  The slice is the one the next change fills in, so nothing built here is thrown
  away.

  **Not in V1:** any design-system primitive. Zone 1 and the components
  structural test therefore ship without a subject to bind, and that is
  deliberate — a `Button` nothing renders is scaffolding written before anything
  needs it.

* **The test suite proves the guardrails, not just the render** — structural
  tests that read the tree, plus a test that runs ESLint's Node API over this
  repo's own config on synthetic source, asserting each zone fires on a bad
  import *and* stays quiet on a good one. Because `docs/coding-guidelines.md`
  makes the argument itself: a fixture that breaks a zone would fail
  `npm run lint` for everyone, so a virtual `filePath` through the Node API is
  the only way a zone is ever seen to reject anything. A rule that has only been
  watched to pass is a comment.

## Open

* Nothing. The spec is settled — next phase is `tech-spec.md`.
