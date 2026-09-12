# V15. Per-voice mute — tech spec

## Contracts

Frozen. Every track builds against these rather than against another track.

### The mutable voice, and what it covers

New concern folder `src/features/metronome/lib/mute/`. It earns a door under
[architecture.md](../../docs/architecture.md): it holds the UI-voice mapping,
the last-audible rule and the filter, and three other folders read it.

```ts
// lib/mute/voices.ts
export type MutableVoice = 'kick' | 'snare' | 'hat'

/** The row's order, and the only order it is ever rendered in. */
export const MUTABLE_VOICES: readonly MutableVoice[] = ['kick', 'snare', 'hat']

export const KIT_VOICES_OF: Readonly<Record<MutableVoice, readonly KitVoiceName[]>> = {
  kick: ['kick'],
  snare: ['snare', 'rim'],
  hat: ['hatClosed', 'hatOpen'],
}

export type MuteSet = readonly MutableVoice[]
export const NO_MUTES: MuteSet = []

/** Which toggles a groove shows — the mutable voices any of whose kit voices
 *  the definition declares. */
export function mutableVoicesOf(groove: GrooveDefinition): readonly MutableVoice[]

export function isMuted(mutes: MuteSet, voice: VoiceName): boolean

/** False when muting `voice` would leave the groove silent. Drives `disabled`. */
export function canMute(
  groove: GrooveDefinition,
  mutes: MuteSet,
  voice: MutableVoice,
): boolean

/** The filter. Applied to a rendered step, never as a choice of bar. */
export function audibleHits(hits: readonly Hit[], mutes: MuteSet): readonly Hit[]
```

`claves` is in no entry of `KIT_VOICES_OF`, so the click and the count-in are
outside this by construction rather than by a branch.

### Storage

`SETUP_VERSION` stays **1**. A missing `mutes` key falls back per value, the way
`fills` did in V8 — a bump would cost every existing player their tempo.

```ts
// lib/setup/storedSetup.ts
export type StoredMutes = Readonly<Partial<Record<SourceId, MuteSet>>>
export const DEFAULT_MUTES: StoredMutes = {}

export interface Setup {
  readonly bpm: number
  readonly source: SourceId
  readonly fills: boolean
  readonly countIn: boolean
  readonly mutes: StoredMutes   // new
}
```

Validated per entry: an unknown `SourceId` key and an unknown `MutableVoice`
member are both dropped, and a bad `mutes` value costs only `mutes`.

### The source reads it per step

```ts
// lib/groove/source.ts
export interface GrooveSourceOptions {
  readonly seed?: number
  readonly variations?: () => boolean
  readonly mutes?: () => MuteSet      // new, read per step like `variations`
}
```

`hitsAt` becomes `audibleHits(hitsAt(groove, step, variations()), mutes())`.
Read per step rather than captured, which is what makes a toggle land on the
next unqueued step — the same reason V8 gave for `variations`.

### The transport is told

```ts
// components/Metronome.tsx
export interface Transport {
  // …
  setMutes?(mutes: MuteSet): void     // new
}
```

Told from an effect and read per queued step, exactly like `setFills` and for
the same reason. Not latched at Start — that is `setCountIn`'s shape, and it is
wrong here.

### The design system

Three glyphs named for the shape drawn, never the instrument meant, because no
name under `src/components/` may carry a domain word:

```tsx
// src/components/display/
DiscGlyph        // filled circle, thin rim
BandedDiscGlyph  // circle crossed by one horizontal band
ConesGlyph       // two shallow cones on a vertical stem
```

Each is `aria-hidden` and takes no props — the `Checkbox` beside it carries the
accessible name. `Checkbox` widens by two optional props:

```tsx
export function Checkbox({
  id, label, checked, onChange,
  icon,        // ReactNode, rendered before the label
  disabled,    // boolean
}: …)
```

The mapping from voice to glyph is the feature's, not the design system's:

```ts
// features/metronome/components/voiceGlyphs.ts
export const GLYPH_OF: Record<MutableVoice, ComponentType>
```

### Snippets

`src/lib/snippets/en/metronome.ts` gains `voices`, `kick`, `snare`, `hat` and
`enableAll`; `types.ts` gains the same keys.

## Epics

One epic. The change ships one thing and is verified as one thing.

### Epic 1 — Per-voice mute

#### Track A — `lib/mute/`

* **Role:** `test-writer`, then `implementer`
* **Owns:** `lib/mute/voices.ts`, `lib/mute/voices.test.ts`
* **Needs to start:** nothing

1. **red** — `mutableVoicesOf` returns `[kick, snare, hat]` for rock, funk and
   bossa, always in `MUTABLE_VOICES` order; `isMuted` maps `rim` to `snare` and
   both hats to `hat`; `canMute` is false for the last audible voice and true
   otherwise; `audibleHits` drops exactly the muted voices and preserves order.
2. **green** — the smallest implementation that passes.

#### Track B — Storage

* **Role:** `test-writer`, then `implementer`
* **Owns:** `lib/setup/storedSetup.ts`, `lib/setup/storedSetup.test.ts`
* **Needs to start:** `MuteSet` and `StoredMutes` from the contract above

1. **red** — a V8-era record with no `mutes` key reads back with `DEFAULT_MUTES`
   **and its stored tempo intact**; an unknown source key is dropped; an unknown
   voice inside a set is dropped; a non-object `mutes` costs only `mutes`.
2. **green** — extend the per-value validation already there.

#### Track C — The glyphs and the widened `Checkbox`

* **Role:** `test-writer`, then `implementer`
* **Owns:** `src/components/display/DiscGlyph.tsx`, `BandedDiscGlyph.tsx`,
  `ConesGlyph.tsx` and their tests; `src/components/controls/Checkbox.tsx` and
  its test
* **Needs to start:** nothing

1. **red** — each glyph renders an `aria-hidden` `<svg>` and is absent from the
   accessibility tree; `Checkbox` renders `icon` before the label, and
   `disabled` both sets the input's `disabled` and is reported to assistive
   tech.
2. **green** — per [testing.md](../../docs/testing.md), these are tested against
   their own contract and not through the feature.

#### Track D — The source filter

* **Role:** `test-writer`, then `implementer`
* **Owns:** `lib/groove/source.ts`, `lib/groove/source.test.ts`
* **Needs to start:** `MuteSet` and `audibleHits` from the contract above

1. **red** — with `hat` muted, no step of any bar yields `hatClosed` or
   `hatOpen`; with `snare` muted in bossa the clave is gone from every bar **and
   the fill's two snare notes with it**; `mutes` is re-read each call, so a
   change lands on the next step without the source being rebuilt; with
   `NO_MUTES` the render is bit-identical to today.
2. **green** — compose `audibleHits` over the existing `hitsAt`.

#### Track E — The row, and the wiring

* **Role:** `test-writer`, then `implementer`
* **Owns:** `components/MuteRow.tsx` and its test, `components/voiceGlyphs.ts`,
  `components/Metronome.tsx`, `hooks/useClickTransport.ts`,
  `src/lib/snippets/en/metronome.ts`, `src/lib/snippets/types.ts`
* **Needs to start:** Tracks A, B, C and D

1. **red** — the row is absent on the click and present on every groove; the
   three toggles render in `MUTABLE_VOICES` order each behind its glyph; the
   last audible toggle is `disabled`; **Enable all** is absent until something is
   muted and clears only the selected groove's set; switching groove swaps the
   set and switching back restores it; a reload restores what was stored.
2. **green** — `MuteRow` composes `Checkbox`; `Metronome` holds the state, tells
   the transport from an effect, and persists through the existing `writeSetup`
   effect.

## Waves

* **Wave 1 (parallel):** Track A, Track B, Track C, Track D — four disjoint file
  sets, all four building against the frozen contracts rather than against each
  other.
* **Wave 2:** Track E — needs A's functions, B's field, C's primitives and D's
  option.

## Checks

* `npm test`
* `npm run lint` — the styling boundary is held by this alone, and Track E adds
  a feature component that must carry no `className`.
* `npm run build` — `tsc` runs here, and the `Setup` widening is a type change.

## Risks

* **The tree does not typecheck today.** `useClickTransport.ts` declares
  `GROOVES` over `Exclude<SourceId, 'click'>` but has no `'bossa-nova'` entry,
  while `SOURCE_IDS` now lists it. V11 is mid-flight. V15 cannot show a green
  run until that is closed, and Track E edits the same file.
* **ADR 0010 needs one sentence.** Its invariants bind the written figure, not
  the audible result — forced, since invariant 1 dies on a kick mute and
  invariant 2 on a hat mute. The code already reads this way and does not
  change; the record has to say why. `/implement-vibe-with-docs` §8.
* **`specs/features.md` contradicts this change.** Its *Not building* table
  lists "Per-voice mute grid", and `docs/adr/0006` uses per-beat-only muting as
  part of its argument that a melodic voice is inescapable. 0006's key argument
  survives untouched; both records need amending.
* **A muted `rim` is an exact voice.** `BOSSA_NOVA_HUMANIZE` sets
  `exactVoices: ['rim']`. Removing it has no timing consequence — nothing is
  displaced differently — but a test that asserts bossa's timing must not assume
  the rim is present.
* **The count-in must stay unfiltered.** It is `claves`, which appears in no
  `KIT_VOICES_OF` entry, so this holds by construction. A test pins it.
