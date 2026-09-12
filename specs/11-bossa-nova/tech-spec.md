# V11. Bossa nova — tech spec

## What V11 assumes of V10, and the one line that matters

**`GrooveDefinition.ordinary` must ship as an array of bars**, not a single line
set:

```ts
readonly ordinary: readonly (readonly Line[])[]
```

`P = ordinary.length` is the ordinary figure's length in bars — 1 for funk and
rock, which ship `[[...lines]]`, and 2 for bossa. V10's tech spec currently
writes `ordinary: readonly Line[]`. **If V10 ships that, V11 changes the shared
contract and re-touches both existing grooves**; if V10 ships the array, V11
costs one entry. The musician called this the highest-leverage single line in
its answer, and it is a change to V10 rather than to V11.

**V10 is also unbuildable as written** — its tech spec says the three bar tables
are frozen in its `spec.md`, which carries prose about them and no tables. That
has to be fixed before either change runs.

## Contracts

The four bar tables are frozen in [spec.md](spec.md), with the numbers.

### The voice

`VoiceName` gains `'rim'`. `KIT` gains its entry, with nominals derived per
ADR 0008 and `leadInSeconds: 0` — measured ≤ 0.05 ms, the detector's floor:

| Layer | Measured | `nominalVelocity` | `upperVelocity` | Takes |
| :-- | --: | --: | --: | --: |
| `v74` | −28.85 | 0.800 | 0.843 | 3 |
| `v127` | −25.41 | 0.886 | 1 | 3 |

**These numbers are arithmetic, not truth.** What makes them true is extending
`kit.test.ts`'s 0 → 1 monotonic sweep to `rim` and getting no step above 0.5 dB.

**The clave must stay inside `v74`** — velocity ≤ 0.843. Its three takes span
1.38 dB against `v127`'s 3.30 dB, and 3.30 dB is *above* invariant 6's ladder
step, so a designed contour on `v127` could be reversed by take selection before
humanize even runs. The clave is flat at 0.80, which sidesteps this — but a
later edit raising it past 0.843 would walk into it silently.

### Exact voices

```ts
export interface Humanize {
  readonly timingFractionOfStep: number
  readonly timingCeilingMs: number
  readonly velocityJitter: number
  /** Voices whose timing bound is zero. Velocity jitter still reaches them. */
  readonly exactVoices: readonly VoiceName[]
}
```

`timingOffset` returns 0 for a member. `displace(hit, step, stepSeconds)`
already receives the hit and the hit carries `voice`, so **the scheduler learns
nothing** and no transport file changes. Funk and rock ship `exactVoices: []`.

### Invariant 3, generalised

> **Steps 0–7 of every bar are the ordinary figure *of the same phase*.** A bar
> at cycle index `b` is measured against ordinary bar `b mod P`; a marked bar
> reproduces that bar's steps 0–7 exactly, and the gesture lives in 8–15.

For `P = 1` this reduces to today's wording word for word.

**The trap that follows, and it will be missed.** `light` and `fill` stay one
bar each and for bossa they land on **phase 1**. They must be written against
the phase-1 ordinary bar. An implementer diffing against `ordinary[0]` produces
a fill that contradicts invariant 3 and passes a naive test.

### The cycle against the clave

2 divides 4, so the phase is locked forever: cycle bars 0 and 2 take the 3-side,
bars 1 and 3 the 2-side. **Both marked bars land on the 2-side**, which is the
answering half and the emptiest bar the groove has — a kit gesture there has
room and never collides with the 3-side's statement.

**Do not phase the cycle to alternate the halves.** Clave direction is fixed for
a whole tune, and crossing the clave is an error in the idiom rather than a
variation. It would also need an odd cycle length or a second counter.

**One consequence to record rather than discover:** with Fills on, the unmarked
2-side bar never sounds — the player only ever hears the 2-side underneath a
modification. With Fills off the two halves alternate plainly forever.

## Epics

One epic.

### Track A — the rim, calibrated

* **Role:** `implementer`
* **Owns:** `public/samples/**`, `src/features/metronome/lib/groove/kit.ts` +
  its test
* **Needs to start:** the contracts above

1. Copy the 6 `rim` files from the sibling pack byte-for-byte; extend
   `provenance.json`. Same library, so no new licence file and no new string
2. **red/green** — `KIT` gains `rim` with the derived nominals, boundary at the
   midpoint, `leadInSeconds: 0`
3. **red/green** — the monotonic sweep extended to `rim`, no step above 0.5 dB

### Track B — bossa

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/groove/grooves/bossaNova.ts` + its test
* **Needs to start:** the contracts above

1. **red/green** — the two ordinary bars: identical kit, `rim` on `0, 6, 12`
   for phase 0 and `4, 10` for phase 1
2. **red/green** — the light bar and the fill, **written against the phase-1
   ordinary bar**, with invariant 3 asserted against `b mod P` rather than
   against `ordinary[0]`
3. **red/green** — the clave never stops: `rim` is bit-identical across all four
   bars, and every bar carries the hat on all eight even steps and the kick on
   at least four, so the clave is never the only voice sounding
4. **red/green** — every `rim` step is also a `hatClosed` step, which is the
   premise `exactVoices` rests on
5. **red/green** — no snare and no `hatOpen` in either ordinary bar

### Track C — exact voices

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/groove/humanize.ts` + its test
* **Needs to start:** the contracts above. Independent of A and B

1. **red/green** — `exactVoices` zeroes the timing bound for a member and leaves
   every other voice's bound untouched
2. **red/green** — `gainTrim` still reaches an exact voice; only timing is zero
3. **red/green** — an empty `exactVoices` is exactly today's behaviour, asserted
   against funk over at least 12 bars

### Track D — the wiring

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/transport/source.ts`,
  `src/features/metronome/components/*`, `src/features/metronome/hooks/*`,
  `src/lib/snippets/*`
* **Needs to start:** Tracks A, B and C on disk

1. **green** — `VoiceName` gains `'rim'`; `SOURCE_IDS` gains `'bossa-nova'` so
   `storedSetup` validates it
2. **green** — the select gains a fourth entry, labelled from a snippet
3. **green** — the voice bank carries `rim` for bossa, and **selecting bossa
   fetches only what bossa needs** — see the open question below
4. **green** — one assertion that the count-in maps bossa's step correctly, so
   the groove's first sounding bar is phase 0. `createCountInSource` maps the
   step itself so this comes out right for free, which is exactly why it is easy
   to assume the wrapper only maps takes

## Waves

* **Wave 1 (parallel):** Track A, Track B, Track C — disjoint files
* **Wave 2:** Track D — needs A, B and C on disk
* **Integration:** the checks below, then the listening pass

## Checks

* `npm test`, `npm run lint`, `npm run build`
* **A listening pass**, in the musician's order: the clave's level against the
  kit (0.80 renders −28.85, 10.6 dB under the downbeat kick — fallbacks 0.83 up
  or 0.76 down, staying inside `v74`); whether bossa sits with funk and rock at
  1.6 dB under; whether the flat hat at 0.66 carries the grid, **with the
  fallback upward to 0.74** because an inaudible grid is a failed metronome;
  whether the light bar reads as an event at all, being the smallest marked bar
  in the app; whether the fill's two snare notes read as a turnaround rather
  than a mistake; and fill density at 6.86 s per cycle at 140 bpm, the shortest
  in the app.

## Risks

| Risk | What holds it |
| :-- | :-- |
| The fill is written against `ordinary[0]` instead of phase 1 | Track B step 2. It passes a naive test, which is what makes it the change's likeliest defect |
| The clave is left alone by a marked bar | Track B step 3 — Sam: *"I am lost inside four seconds"* |
| A later edit raises the clave past 0.843 | It crosses into `v127`, whose 3.30 dB take scatter exceeds the ladder step, so take selection could reverse a designed contour |
| `claves` is used for the clave after all | It would break V9's count-in seam and ship ~1,600 bit-identical strokes. Recorded in `## Decided` with the measurements |
| ADR 0008's written method is used to derive `rim` | It does not reproduce `kit.ts`. Correcting it is a `## Done when` bullet |
| V10 ships `ordinary` as one bar | V11 then changes the shared contract and re-touches funk and rock. Flagged at the top |

### Fetching is per groove, not global

A `GrooveDefinition` declares the voices it uses, and selecting a groove fetches
those. Funk and rock never download the `rim`; selecting bossa fetches its 6
files once, and switching back and forth after that is free because everything
is already in memory.

```ts
readonly voices: readonly KitVoiceName[]
```

It is V6's own rule — you pay for what you select — applied one level finer, and
it is what stops the download growing for everyone each time a groove wants a
new voice. The pack still has toms, bongos, ride and cowbell unspent, so a
global list is the option that gets worse with every groove.

**What this obliges Track D to keep:** the promise that switching between two
*already-loaded* grooves fetches nothing. The bank has to know what is in memory
rather than rebuilding from the current groove's list each time.
