# V2. Simple 4/4 metronome — tech spec

**Phase:** settled — `/implement-vibe-with-docs 2`

## Decided

* **Compensate the lead-in in the scheduler, not in the file** — every voice is
  scheduled at `t − leadIn` for its own measured lead-in, and the sample ships
  byte-identical to the pack. Because it generalises: kick and snare have
  different lead-ins, and a per-voice offset is the only thing that makes two
  voices line up. It also keeps the pack's `provenance.json` true of the file we
  ship, and avoids a trim that clips the attack if it cuts 1 ms too deep.

  The cost is one constant per voice, and care on the first beat of a run: it
  must not be scheduled in the past.

## Contracts

Frozen. The numbers come from the `musician` agent, measured with ffmpeg and an
FFT against the real files — not chosen by taste. Reasoning is preserved here
because a value without its reason is the thing nobody can revisit.

### The velocity curve — `src/lib/velocity.ts`

`src/lib/`, not the slice: what a velocity *means* is domain knowledge that
would still be true if this product did not exist, which is the bar
[coding-guidelines.md](../../docs/coding-guidelines.md#shared-code-srclib) sets.

```ts
/** Decibels between silence and full scale. A struck percussion instrument
 *  covers roughly this from a ghost tap to a hard stroke. */
export const DYNAMIC_RANGE_DB = 40

/** Gain ceiling over a sample's recorded level: +6.02 dB. Above this you are
 *  faking a dynamic the sample does not contain — a harder strike is brighter,
 *  not merely louder, and gain cannot produce that. */
export const MAX_BOOST = 2.0

export type Velocity = number // 0…1

/** Raw curve, relative to full scale. curve(0) is exactly 0, so a rest is a
 *  rest rather than something 60 dB down. */
export function curve(v: Velocity): number

/** Gain for a note, relative to the nominal velocity of the layer selected.
 *  Decibel-linear means this depends only on the *distance* v − vRef, which is
 *  what makes it compose when layered voices arrive. */
export function gainFor(v: Velocity, vRef: Velocity): number
```

| v | curve(v) | dB |
| :-- | --: | --: |
| 0.25 | 0.03162 | −30.0 |
| 0.50 | 0.10000 | −20.0 |
| 0.75 | 0.31623 | −10.0 |
| 1.00 | 1.00000 | 0.0 |

**Why decibel-linear rather than the sampler-convention square law.** Loudness
ratio is a function of decibel *difference*, so this makes every +0.1 of
velocity the same perceived step. The square law spends only 12 dB on the whole
upper half of the range, so velocities above 0.6 barely differ. It also composes
by subtraction, where `(v/vRef)²` blows up as `vRef` gets small.

**What this is already designed for.** Measured peak levels of the pack's four
kick layers: −6.35, −3.98, −3.52, −2.93 dBFS — the whole kick spans **3.4 dB**.
A real drum changes timbre across velocity far more than level. So a global
40 dB curve applied on top of layer selection would be badly wrong; referencing
it to the selected layer's nominal reduces the curve to a small trim, which is
the correct size. Layers carry timbre; the curve trims.

### The click — `src/features/metronome/lib/click/`

```ts
export const ACCENT_VELOCITY = 0.65 // gain 1.995, +6.0 dB, peak −6.28 dBFS
export const EVEN_VELOCITY = 0.50   // gain 1.000,  0.0 dB, peak −12.28 dBFS

/** 4/4: the accent is a pattern against the curve, never a branch on the beat
 *  number. A groove later passes a different array. */
export const CLICK_PATTERN: readonly Velocity[] = [
  ACCENT_VELOCITY, EVEN_VELOCITY, EVEN_VELOCITY, EVEN_VELOCITY,
]
```

The even beats sit exactly at claves' `nominalVelocity` (0.5), so **three beats
in four play the sample untouched at gain 1.000** and the accent is the only
gain change in the feature.

**Why 6 dB.** A doubling of amplitude, the canonical accent. Under ~3 dB the bar
stops being countable once your own instrument is masking it; over ~12 dB it
reads as two instruments rather than an accent, and beats 2–4 start vanishing in
a loud room. 6 dB also leaves 6.28 dB of headroom under full scale, so voices
can sum later without clipping.

### The sample

| | |
| :-- | :-- |
| Ships | `claves_mf.flac` — copied byte-identical from the sibling pack |
| Not shipped | `claves_mf_3.flac` — V2 has no round-robin |
| `CLAVES_NOMINAL_VELOCITY` | `0.5` (the pack's one layer) |
| `CLAVES_LEAD_IN_S` | `0.0083` — measured to −60 dB of peak |

**Why this take.** Its energy is split between a 1556 Hz fundamental and a
3779 Hz partial 2.5 dB below it; the alternate concentrates at 3763 Hz, the
ear-canal resonance where listener fatigue is best documented. Same cut-through,
6.4 dB less of it in the tiring band. It also decays to −30 dB in 100 ms against
160 ms, so onsets are easier to localise.

### The scheduler

```ts
export interface Clock {
  readonly currentTime: number          // seconds, monotonic
  schedule(at: number, velocity: Velocity): void
}
```

Time is injected, per
[testing.md](../../docs/testing.md#timing-is-not-a-wall-clock). A test advances
a fake clock; nothing sleeps.

**Lookahead scheduling.** Beats are queued ahead of the audio clock. A tempo
change rewrites only beats not yet queued — that is what "takes effect at the
next beat" means mechanically, and why it is testable.

**Every beat is scheduled at `t − CLAVES_LEAD_IN_S`**, except where that would
be in the past, which only the first beat of a run can hit.

## Epics

### Epic 1 — the 4/4 click

Three tracks in one wave. They own disjoint files and all three build against
the frozen contracts above, so none waits on another.

#### Track A — the velocity curve

* **Role:** `implementer`
* **Owns:** `src/lib/velocity.ts`, `src/lib/velocity.test.ts`
* **Needs to start:** the `## Contracts` curve section. Nothing else.

1. **red** — `velocity.test.ts` pins `curve` against the four-row table:
   v=0.25/0.5/0.75/1.0 → −30/−20/−10/0 dB, to a tolerance tighter than 0.01 dB.
   Separately: `curve(0)` is exactly `0`, and `gainFor(v, v)` is exactly `1` for
   any v — a note at its layer's nominal plays untouched.
2. **green** — the two functions.
3. **red** — `gainFor` clamps at `MAX_BOOST`, and the clamp bites for claves
   above v = 0.65.
4. **green** — the clamp.
5. **red** — decibel-linearity as a property: `gainFor(a, b)` depends only on
   `a − b`, so equal velocity distances give equal dB ratios anywhere on the
   scale. This is the property that makes the curve compose when layered voices
   arrive, and it is the one a future refactor would silently break.
6. **green** — if 2 and 4 were right, this is already green. Say so rather than
   claiming a red you did not see.

#### Track B — the scheduler

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/click/` — the pattern constants, the
  `Clock` interface, the lookahead scheduler, and their tests
* **Needs to start:** the `Clock` contract and `CLICK_PATTERN`. It imports
  `src/lib/velocity` by its frozen signature; it does not need Track A's file to
  exist to be written against it, but its tests need it to run — so if A has not
  landed when B is ready, B stubs it locally and the integration step removes
  the stub.

1. **red** — with a fake clock at 120 bpm, four beats are scheduled 0.5 s apart,
   each at its intended time minus `CLAVES_LEAD_IN_S`.
2. **green** — the scheduler.
3. **red** — the first beat of a run is never scheduled in the past: starting at
   `currentTime = 0` clamps rather than going negative.
4. **green** — the clamp.
5. **red** — the velocity sequence repeats `[accent, even, even, even]` across
   bar boundaries, and start always begins on the accent.
6. **green** — the pattern cursor.
7. **red** — a tempo change mid-run leaves already-queued beats where they are
   and applies from the next unqueued one. Assert the *exact* schedule, not just
   that it changed.
8. **green** — rewrite only the unqueued tail.

#### Track C — the controls and the indicator

* **Role:** `implementer`
* **Owns:** `src/features/metronome/components/`, `src/features/metronome/index.ts`
* **Needs to start:** nothing but the contracts. It renders against a stub
  scheduler so it can be built and tested with no audio at all.

1. **red** — start/stop toggles and reports its state accessibly; start is the
   dominant control on the page, per `docs/persona.md`.
2. **green** — the control.
3. **red** — the slider spans 40–180 inclusive, refuses to report outside it,
   and its bpm value is readable as text rather than only as a slider position.
4. **green** — the slider and its readout.
5. **red** — four dots; the lit one follows the beat the stub reports; the
   downbeat is distinguished by **more than colour**; the row clears on stop.
6. **green** — the indicator.
7. **red** — unmounting while running tears the subscription down.
8. **green** — the cleanup.

### Integration — in the lead, after the wave

Copy `claves_mf.flac` into `public/`, wire the real `AudioContext` clock to the
real scheduler and the real components, remove Track B's stub if it used one,
and confirm the page makes sound. **This step ends awaiting a listening
sign-off** — see the Risks table.

## Waves

* **Wave 1 (parallel):** Track A, Track B, Track C
* **Integration:** in the lead, once all three land and the suite is green

## Checks

* `npm run lint`, `npm test`, `npm run build`

## Risks

| Risk | What holds it |
| :-- | :-- |
| A `setState` per beat re-renders during a dragged slider | The indicator subscribes to beat events; audio never awaits the UI. If the dots stutter the click stays exact |
| An `AudioContext` not closed on unmount leaks | The hook owns the lifetime; a test asserts teardown |
| Browsers require a user gesture before audio | Start is that gesture. A context created before it must be resumed on start |
| FLAC decode support | Supported in current Chrome, Firefox and Safari, but `decodeAudioData` failure must surface rather than silently not click |
| The first beat's lead-in offset lands in the past | Named in the contract; the first beat clamps to `currentTime` |
| `music.md` has no parameter section for these numbers to live in | The `musician` flagged it. Folding them in is `/implement-vibe-with-docs` §8b's job |
| Three tracks writing one slice could collide | A owns `src/lib/`, B owns `lib/click/`, C owns `components/` + `index.ts`. No path appears twice |
| **Nothing in the pipeline can hear.** The 6 dB accent, the take choice and the absolute level are predictions | All three are graded **partly** until a person listens. `## Done when` 2 already says so, and the integration step ends there by design rather than by omission |
