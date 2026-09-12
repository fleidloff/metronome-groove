# V6. The first groove — straight funk — tech spec

## Contracts

Everything in this section is measured or decided, and frozen. The numbers came
from the `musician` measuring all 40 kit files, not from `pack.json` — see
*Why the pack's numbers cannot be copied* below.

### The figure

One bar, 16 steps. Step 0 is beat 1; steps 4, 8, 12 are beats 2, 3, 4.

| Voice | Steps | Velocity |
| :-- | :-- | --: |
| `kick` | 0 | 0.95 |
| | 10 | 0.86 |
| | 3 | 0.82 |
| `snare` | 4, 12 | 0.92 |
| `snare` ghosts | 7, 9, 15 | 0.37 |
| `hatClosed` quarters | 0, 4, 8, 12 | 0.90 |
| `hatClosed` "and" | 2, 6, 10 | 0.78 |
| `hatClosed` "e"/"a" | 1, 3, 5, 7, 9, 11, 13, 15 | 0.66 |
| `hatOpen` | 14 | 0.88 |

**`hatClosed` is suppressed on step 14.** `docs/music.md` §2 writes the hat on
every step and the open hat on 14; one hi-hat cannot be open and closed at the
same instant. 14 is the open hat's, and the closed hat sits out.

**`hatOpen` is choked at step 15** — a ~10 ms linear ramp to zero when the next
closed hat sounds. The sample rings about a second and a bar at 100 bpm is
2.4 s, so without it the open hat sounds through the next downbeat.

**Ghosts are 0.37, not `docs/music.md`'s 0.15–0.25.** That range is correct for
daily-groove's *linear* gain law and wrong for this repo's decibel-linear one:
0.20 here is 28 dB below the backbeat, past the point where a ghost stops
carrying information. 0.37 gives 22 dB, which is where a ghost sits.

### Why the pack's numbers cannot be copied

daily-groove's `gainFor` is `velocity / nominalVelocity` — linear. This repo's
`src/lib/velocity.ts` is `curve(v) / curve(vRef)` — decibel-linear over 40 dB.
Feeding the sibling's nominals to this curve puts an **8 dB cliff** at the
snare's layer boundary: at v = 0.3465 the layer below renders −27.3 dB and the
layer above −35.4 dB, so raising velocity by 0.0001 makes the snare quieter.

The rule that removes it, with every boundary at the midpoint of its two
adjacent nominals:

```
vRef_L   = vRef_top + (level_L − level_top) / 40
boundary = (vRef_L + vRef_L+1) / 2
```

Derived values, top layer pinned at 0.886:

| Voice | Layer | Measured dBFS | `nominalVelocity` | Upper boundary |
| :-- | :-- | --: | --: | --: |
| `hatClosed` | v44 | −44.37 | 0.554 | 0.624 |
| | v71 | −38.80 | 0.694 | 0.744 |
| | v98 | −34.77 | 0.794 | 0.840 |
| | v127 | −31.10 | 0.886 | 1 |
| `snare` | v44 | −25.97 | 0.743 | 0.815 |
| | v127 | −20.23 | 0.886 | 1 |
| `kick` | v80 | −20.77 | 0.886 | 1 |
| `hatOpen` | v98 | −24.03 | 0.886 | 1 |

Testable without an ear: sweep velocity 0 → 1 in steps of 0.001 and assert the
rendered level is monotonic with no step above 0.5 dB.

### Humanize

```ts
export interface Humanize {
  /** Fraction of one step, with an absolute ceiling. Never a bare ms figure. */
  readonly timingFractionOfStep: number   // 0.03
  readonly timingCeilingMs: number        // 4
  readonly velocityJitter: number         // 0.04
}
```

* **Stateless.** `offset(seed, voice, step)` is a pure hash, never a walk. This
  is what makes the groove return to the grid on every note and what makes it
  deterministic under lookahead windowing and a backgrounded tab.
* **No per-voice lean.** All four are 0.
* **The velocity jitter is a gain trim applied *after* layer selection**, so a
  hit near a layer boundary cannot flicker between timbres from bar to bar.
* **The click's humanize is `null`, not a zeroed record.** A click that is
  humanized by zero is one edit away from being humanized by something.

### Scheduling

Every hit's time is computed from the run's start plus an exact offset, never
incrementally from the previous hit:

```
scheduledTime(step) = t0 + step × stepSeconds,  stepSeconds = 60 / bpm / 4
```

**Lead-in is per sample and the kit's is zero.** `CLAVES_LEAD_IN_S = 0.0083` is
a property of that one file, confirmed by measurement at 8.23 ms. All 40 kit
files measured ≤ 0.36 ms, at the detector's own floor. A groove scheduler that
inherits the claves constant plays the whole kit 8.3 ms early.

### The sample manifest

22 files. `hatClosed` 4 layers × 3 round-robins, `snare` 2 × 3, `kick` 1 × 3,
`hatOpen` 1. **Round-robin indexes on the absolute step**, so the hat's period
is lcm(3, 16) = 3 bars rather than repeating bit-identically every bar.

### Placement

The groove lives **inside the existing `metronome` slice**. The app is a
metronome and the groove is what it plays; one transport, one screen, one slice.
A second slice would have to lift the clock, the scheduler and the lookahead
into `src/lib/` before it could reach them, and those are this app's product
decisions rather than domain.

`lib/click/` splits into three concern folders on `coding-guidelines.md`'s own
rule — *put a `lib/` module in the concern folder that matches what it
computes*:

```
src/features/metronome/lib/
  transport/   clock.ts  scheduler.ts  tempo.ts   both sources share these
  click/       claves.ts  pattern.ts               the click's own sound
  groove/      figure.ts  kit.ts  humanize.ts      the groove's
  tap/  remote/                                    unchanged

src/lib/
  velocity.ts   exists — the curve, already domain
  steps.ts      the 16-step grid: domain, true of any 4/4 groove
```

Flat `lib/groove/` beside an unchanged `lib/click/` was rejected: the groove
would import the scheduler out of a folder called `click`, and the folder name
would stop describing what it computes.

### The source contract

The scheduler walks **steps**, not beats, and asks a source what sounds at each
one. The click becomes a source like any other — a 4-step, one-voice source with
`humanize: null`.

```ts
// src/lib/steps.ts — domain: true of any 4/4 groove, not of this app
export const STEPS_PER_BAR = 16
export const stepSeconds = (bpm: number, stepsPerBar: number): number =>
  60 / bpm / (stepsPerBar / 4)

// src/features/metronome/lib/transport/source.ts
export interface Hit {
  readonly voice: VoiceName
  readonly velocity: Velocity
}

export interface Source {
  readonly id: SourceId               // 'click' | 'straight-funk'
  readonly steps: number              // 4 for the click, 16 for the groove
  readonly humanize: Humanize | null  // null for the click, and only the click
  hitsAt(step: number): readonly Hit[]
  displace(hit, step, stepSeconds): number  // seconds; 0 when not humanized
  trim(hit, step): number                   // gain multiplier; 1 when not humanized
}
```

**Two further contract changes were made mid-build by Track B**, both additive
and both reviewed in the lead:

* `displace` and `trim` are **optional**. Every scheduler fixture omits them,
  and the scheduler reads `source.displace?.(…) ?? 0` / `trim?.(…) ?? 1` — which
  is exactly the "0 and 1 when not humanized" the contract already specified in
  prose.
* `Clock.schedule` takes a third argument, `Placement { step, gain }`. Without
  it the contract is unimplementable: round-robin must index the **absolute**
  step and the take is chosen inside the audio clock, which `schedule(at, hit)`
  gives no step to; and `trim` is a gain applied *after* layer selection, which
  also happens inside the clock and cannot be folded into `hit.velocity`,
  because Track A asserts `hit.velocity` arrives untouched.

**`displace` and `trim` were added to the contract mid-build**, when Track A
found the original `Source` declared a `Humanize` record with no way to apply
it. The source owns them rather than the scheduler: a transport that reached
into `groove/humanize.ts` would be a transport that knows about one particular
groove. `humanize` stays as the declaration of intent — and `null` on the click
is what D1 asserts — while these two do the work.

**Lead-in moves onto the voice.** It is a property of a sample, not of the
scheduler: claves 8.3 ms, every kit voice 0. This is the single change that
prevents the bug the musician named — a groove inheriting `CLAVES_LEAD_IN_S`
would play the whole kit 8.3 ms early.

**The UI still sees four beats.** The scheduler announces a `Beat` only on
steps that land on a quarter, so `BeatRow` and its four dots are untouched.

Two paths were rejected: duplicating the lookahead, `dropOvertakenBeats` and the
mid-run tempo change means finding and fixing the next timing bug twice, and the
two copies drift. The regression risk of re-expressing the click is real and is
carried by V2–V4's existing tests, which must pass **unchanged**.

## Epics

One epic. The engine ships nothing on its own and the groove cannot ship without
it, so there is no second slice that ships and verifies alone.

### Track A — the transport's tests

* **Role:** `test-writer`
* **Owns:** `src/features/metronome/lib/transport/*.test.ts`,
  `src/lib/steps.test.ts`
* **Needs to start:** the contracts above

1. **red** — `stepSeconds`: 16ths at 40, 100 and 180 bpm; the click's 4-step
   grid is the same function with `stepsPerBar: 4`
2. **red** — the scheduler walks steps and queues every hit a source returns for
   a step, at one time, with per-voice lead-in subtracted
3. **red** — **no accumulation**: for steps up to 100 000, the scheduled time is
   within one sample period of `t0 + step × stepSeconds` plus the humanize
   offset. This is the test behind the user's condition that the beat *"is not
   completely drifting apart but always coming back together"*
4. **red** — a `Beat` is announced only on quarters, for both a 4-step and a
   16-step source
5. **red** — every V2–V4 case still passes after the move: lead-in
   compensation, `dropOvertakenBeats`, mid-run `setTempo`, teardown

### Track B — the transport

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/transport/*.ts`, `src/lib/steps.ts`,
  and the move of `clock.ts`, `scheduler.ts`, `tempo.ts` out of `lib/click/`
* **Needs to start:** Track A

1. **green** — `src/lib/steps.ts`, then the step-walking scheduler
2. **green** — `lib/click/` reduced to the claves and its pattern, re-expressed
   as a `Source`
3. **green** — lead-in per voice; `CLAVES_LEAD_IN_S` stays in `click/`
4. **green** — **the open-hat choke.** `audioClock.ts` moves to `transport/`
   and gains it: when a voice sounds that chokes another, the ringing source is
   ramped to zero over ~10 ms rather than left to decay. `hatOpen` is choked by
   `hatClosed`. Added mid-build — Track D found it assigned to no track, and it
   is an audio-node operation, so it belongs to whoever owns the `Clock`
   implementation. Without it the open hat on step 14 rings about a second into
   a 2.4 s bar and sounds over the next downbeat.

### Track C — the kit and its samples

* **Role:** `implementer`
* **Owns:** `public/samples/**`,
  `src/features/metronome/lib/groove/kit.ts` + its test
* **Needs to start:** the contracts above. Independent of A and B

1. Copy 22 files from the sibling pack, preserving the pack's own preparation —
   they are already mono 44.1 kHz 16-bit FLAC and **must not be re-normalised**
2. Extend `public/samples/provenance.json` with all 22, recording library,
   licence and treatment per file
3. **red/green** — the manifest carries the *recalibrated* nominals from the
   table above, and the monotonic sweep test: velocity 0 → 1 in steps of 0.001,
   level monotonic, no step above 0.5 dB

### Track D — the figure and humanize

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/groove/figure.ts`,
  `groove/humanize.ts` + their tests
* **Needs to start:** the contracts above. Independent of A, B and C

1. **red/green** — the figure: every step's hits and velocities per the table,
   `hatClosed` absent on 14, `hatOpen` present only on 14
2. **red/green** — humanize is stateless: `offset(seed, voice, step)` returns
   the same value for the same arguments however many times it is called and in
   whatever order; bound is `min(0.03 × stepSeconds, 4 ms)` at 40, 100 and 180
3. **red/green** — round-robin indexes on the **absolute** step: the hat's
   sequence repeats every 48 steps, not every 16
4. **red/green** — the velocity jitter is applied after layer selection, so a
   hit at a layer boundary selects the same layer on every pass

### Track E — the select box, the credit line and the wiring

* **Role:** `implementer`
* **Owns:** `src/components/controls/Select.tsx` + test,
  `src/components/typography/*` if the credit needs a primitive,
  `src/features/metronome/components/*`, `src/lib/snippets/en/*`
* **Needs to start:** Tracks B, C and D on disk

1. **green** — `Select` in the design system: generic, no domain word, no
   `className` escapes into the feature (ADR 0005)
2. **green** — selecting the groove starts the fetch; Play during the fetch
   waits and says so rather than starting a silent bar
3. **green** — the credit line below Play, always visible, never pushing Play
   down

## Waves

* **Wave 1 (parallel):** Track A, Track C, Track D — all build against frozen
  contracts and own disjoint files
* **Wave 2:** Track B — needs A's tests
* **Wave 3:** Track E — needs B, C and D on disk
* **Integration:** the checks below, then the listening pass

## Checks

* `npm test`, `npm run lint`, `npm run build`
* **A listening pass, and it is not optional.** The musician named six items it
  cannot settle by measurement: the four voice mix gains (starting at
  `kick −8`, `snare −8`, `hatClosed −9`, `hatOpen −16` dB, with a warning that
  the hat may sit too far back at four voices instead of nine), the ghost depth
  at 22 dB, the hat's 4.8 dB accent step, the open hat's 150 ms choke, swing 0
  against 0.18, and whether 3 round-robins stop a one-bar loop sounding like a
  loop over twenty minutes.

## Risks

| Risk | What holds it |
| :-- | :-- |
| Re-expressing the click regresses V2–V4 | Their tests pass **unchanged** — Track A step 5. A rewritten click test is the signal the refactor went too far |
| The pack's nominals are copied and the snare gets an 8 dB cliff | The monotonic sweep test in Track C, which fails on any step above 0.5 dB |
| The kit inherits the claves' 8.3 ms lead-in and plays early | Lead-in is per voice in the contract, and Track A asserts it per voice |
| Humanize accumulates and the groove drifts | Stateless by contract; Track A step 3 asserts grid position over 100 000 steps |
| The loop is bit-identical every bar | Round-robin on absolute step; Track D asserts a 48-step period |
| `hatClosed` and `hatOpen` both sound on 14 | Track D asserts no step carries both |
| 550 KB blocks the first Play | Fetch on select, not on play; Track E asserts Play during a fetch waits rather than sounding an empty bar |
| A `className` leaks into the feature for the select box or the credit | ADR 0005's lint rule, already enforced |
