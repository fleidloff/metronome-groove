# V1. Next.js app scaffold — tech spec

**Phase:** settled — `/implement-vibe-with-docs 1`

## Decided

* **Scaffold with `create-next-app`, then extend its ESLint config** — keep the
  generated `eslint-config-next` block and append our own named block with
  `import/no-restricted-paths` after it. Because Next's own rules catch real
  Next mistakes we would otherwise re-derive, and appending a named block is
  already how `docs/coding-guidelines.md` describes the config reading. Adds
  `eslint-plugin-import` as a dependency.
* **One epic, one track, built in the lead** — no dispatch. Because
  `/implement-vibe-with-docs` §4 says a single-track spec is the common case and
  dispatching one agent throws away the reading §3 just forced; this is an hour
  of serial work where coordination would cost more than the parallelism buys.

## Contracts

Frozen. Everything below is what later changes build against, so a rename here
is a change to this spec rather than a detail.

```ts
// src/features/metronome/index.ts — the slice's entire public surface
export { Metronome } from './components/Metronome'
```

```ts
// src/components/tokens.ts — the closed spacing scale
export type Space = 0 | 1 | 2 | 3 | 4 | 6 | 8
```

| Thing | Value |
| :-- | :-- |
| Path alias | `@/*` → `src/*` |
| Slice folder | `src/features/metronome/` |
| Slice surface | `src/features/metronome/index.ts`, exporting `Metronome` and nothing else |
| Design-system groups | `layout/`, `surfaces/`, `controls/`, `typography/`, `display/` — created empty, with `tokens.ts` at the `src/components/` root |
| ESLint block name | `metronome/import-boundaries`, appended after the `eslint-config-next` block |
| Zone numbering | 1, 2, 3, 4, 6 — **5 is skipped deliberately**, per `docs/coding-guidelines.md` |
| Test runner | Vitest + jsdom + Testing Library, `npm test` |

## Epics

### Epic 1 — the scaffold

#### Track A — everything

* **Role:** `implementer` — built in the lead, not dispatched
* **Owns:** the whole tree. There is no second track to collide with.
* **Needs to start:** nothing

**Step 1 — scaffold.** `create-next-app@latest` with TypeScript, Tailwind,
App Router, `src/`, ESLint and the `@/*` alias. Then delete the generated
splash page's markup and its assets. Add `eslint-plugin-import`, `vitest`,
`@vitejs/plugin-react`, `jsdom`, `@testing-library/react`,
`@testing-library/jest-dom`. Wire `npm test` to Vitest with a jsdom
environment and a setup file.

*This step has no red.* It is the one place in this spec where a test cannot
come first, because there is no project for a test to live in. Say so in the
report rather than inventing a green.

**Step 2 — the design system's shape.**
1. **red** — `src/components/structure.test.ts` reads `src/components/` from
   disk and asserts the five group folders exist, that `tokens.ts` sits at the
   root outside every group, and that no `index.ts` exists anywhere beneath it.
   Fails: the directory does not exist.
2. **green** — create the five folders (each with a `.gitkeep`, since they ship
   empty) and `tokens.ts` holding the `Space` scale above.

**Step 3 — the slice and the route.**
1. **red** — `src/app/route-boundary.test.ts` reads every file under `src/app/`
   and asserts that any specifier naming `@/features` is exactly
   `@/features/metronome` — checking `vi.mock` paths by the same rule, since
   lint cannot see those. Fails: no route, no slice.
2. **green** — `src/features/metronome/components/Metronome.tsx` renders a
   placeholder, `index.ts` re-exports it per the contract, `src/app/page.tsx`
   imports `@/features/metronome` and renders it.

**Step 4 — the placeholder actually renders.**
1. **red** — `src/features/metronome/components/Metronome.test.tsx` asserts the
   placeholder's visible text through a Testing Library render. Fails until the
   component exists; if step 3 already made it pass, say so rather than
   pretending it was red.
2. **green** — the component.

**Step 5 — the zones, and proof they fire.**
1. **red** — `eslint.config.test.ts` at the repo root drives ESLint's Node API
   over this repo's own `eslint.config.mjs`, on synthetic source with a virtual
   `filePath`, and asserts for each live zone that a bad import **errors** and a
   good one **does not**. Fails: no zones configured.
2. **green** — append the `metronome/import-boundaries` block: zones 1, 2, 3, 4
   and 6, with 2 and 3 generated from `readdirSync('src/features')`,
   `basePath` pinned to `import.meta.dirname`, and a `message` on every zone
   naming the rule and the reason.
3. **refactor** — check the zone table in `docs/coding-guidelines.md` still
   describes what was written. If it does not, the document is what changes.

**Step 6 — the theme.** Confirm `src/app/globals.css` carries a Tailwind v4
`@theme` block with the palette, radii and shadow the `prototype` skill tells a
reader to copy. If `create-next-app` generated a different shape, this step
reconciles it and says which way it went.

## Waves

* **Wave 1:** Track A, in the lead. There is no wave 2.

## Checks

* `npm run lint`, `npm test`, `npm run build`

## Risks

| Risk | What holds it |
| :-- | :-- |
| `create-next-app` flags or output shape have moved since these notes | Step 1 reads what it actually generated rather than assuming; steps 5 and 6 reconcile the config and the theme against the docs |
| `eslint-plugin-import` and flat config under ESLint 9 | Step 5's red is exactly this — if the plugin cannot express a zone, the test fails before any rule is believed |
| Zones 2 and 3 are generated from `readdirSync` and were inert with zero features | One slice now exists, so step 5 asserts them live rather than vacuous |
| Next's own ESLint block and ours disagree | Ours is appended after, and named, so precedence is readable rather than emergent |
| The `@theme` block the `prototype` skill describes may not match what v4 generates | Step 6 makes that a decision with a stated direction, not a silent mismatch |
| Step 1 has no test in front of it | Stated in the step rather than papered over; steps 2–5 are what actually gate the tree |
