# V7. Remembered setup — tech spec

**Phase:** settled — `/implement-vibe-with-docs 7`

## Decided

* **One JSON object under one key, carrying a version.** `metronome.setup` holds
  `{ version, bpm, source }`. Because one read on load and one write per change
  is the cheapest shape, and adding a remembered value later is a *field* rather
  than a new key — beat mutes and subdivisions are both on the candidate list.

  **The version is the part that earns its keep.** Without it, the first time
  the shape changes, old data is indistinguishable from corrupt data and the
  per-value fallback silently resets everything the player had. With it, a
  future change migrates or discards deliberately.

* **The defaults move out of the component and into the setup module.**
  `DEFAULT_BPM` and `DEFAULT_SOURCE` are currently consts in `Metronome.tsx`;
  they become the fallbacks the reader returns, because "what a missing value
  falls back to" and "what a first visit opens with" are the same fact and
  should not be written twice.

## Contracts

### `src/features/metronome/lib/setup/storedSetup.ts`

A sixth concern folder, named for what the persona calls it: *"The setup lives
in the browser."*

```ts
import { type SourceId } from '../transport/source'

export const SETUP_KEY = 'metronome.setup'

/** Bumped when the stored shape changes. Anything else is discarded whole —
 *  the per-value fallback is for bad values, not for a shape we stopped
 *  understanding. */
export const SETUP_VERSION = 1

export const DEFAULT_BPM = 100
export const DEFAULT_SOURCE: SourceId = 'click'

export interface Setup {
  readonly bpm: number
  readonly source: SourceId
}

export const DEFAULT_SETUP: Setup

/**
 * Reads what was stored, validating each value on its own: a bad bpm falls
 * back without taking a good source with it, and vice versa.
 *
 * Never throws. Private mode, a refused read and unparseable JSON all return
 * the defaults, because a metronome that will not open because of a storage
 * quota is worse than one that forgot the tempo.
 */
export function readSetup(storage?: Storage): Setup

/** Never throws. A refused write is a tempo that is not remembered, which is
 *  not worth an error the player cannot act on. */
export function writeSetup(setup: Setup, storage?: Storage): void
```

**`storage` is injected** so a test can pass one that throws, is full, or
returns junk — none of which jsdom's `localStorage` will do on request.
Defaults to `window.localStorage` when present.

**Validation is delegated, not re-implemented.** `isTempo` already exists in
`lib/transport/tempo.ts`; the source id is checked against the sources the app
actually has rather than a second copy of the union.

## Epics

### Epic 1 — remembered setup

One track, built in the lead per `/implement-vibe-with-docs` §4.

#### Track A — the setup module and its wiring

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/setup/`, and the three `useState` lines
  plus two handlers in `components/Metronome.tsx`

1. **red** — `readSetup` on empty storage returns 100 and the click.
2. **green** — the reader and the defaults.
3. **red** — a round trip: `writeSetup` then `readSetup` returns what went in.
4. **green** — the writer.
5. **red** — **each value falls back on its own**: `{ bpm: 9999, source:
   'straight-funk' }` keeps the groove and resets the tempo; `{ bpm: 140,
   source: 'nonsense' }` keeps the tempo and resets the groove. This is the
   spec's sharpest decision and the one a later refactor would flatten.
6. **green** — per-field validation, reusing `isTempo`.
7. **red** — a wrong or missing `version` discards the whole object rather than
   falling back field by field.
8. **green** — the version check.
9. **red** — junk that is not JSON, a JSON array, `null`, and a storage that
   throws on `getItem` all return the defaults and never throw.
10. **green** — the guards.
11. **red** — a storage that throws on `setItem` does not throw out of
    `writeSetup`.
12. **green** — the write guard.
13. **red** — in the component: changing the tempo writes; changing the source
    writes; a mounted component starts from what was stored.
14. **green** — seed `useState` from `readSetup()`, write in the two handlers.

**A note for whoever builds step 14.** The tempo has two writers — the slider
and a committed tap — and both already funnel through `changeTempo`. Write
there, not in each caller, or the tap path will be forgotten.

## Waves

* **Wave 1:** Track A, in the lead. There is no wave 2.

## Checks

* `npm run lint`, `npm test`, `npm run build`

## Risks

| Risk | What holds it |
| :-- | :-- |
| Reading storage during render breaks a server render | `readSetup` guards on `typeof window`; the lazy `useState` initialiser runs on the client. A test covers the no-storage path |
| The defaults end up written in two places | They move into the setup module and the component imports them. `DEFAULT_BPM` currently appears in `Metronome.tsx` **and** its test — both must point at the one source |
| A tap-committed tempo is not persisted | Called out in Track A step 14; the write goes in `changeTempo`, which both paths already use |
| The version check makes the per-value fallback unreachable | They are different layers and step 7 pins that: a *wrong version* discards, a *bad field* falls back |
| Storage quota or private mode | `## Done when` 5. Both read and write swallow, and the app behaves exactly as it does today |
