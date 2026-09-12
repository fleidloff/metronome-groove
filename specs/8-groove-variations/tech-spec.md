# V8. Groove variations — tech spec

## Contracts

The two bar tables are frozen in [spec.md](spec.md) and are not repeated here.
What follows is the code shape.

### The cycle

```ts
// src/features/metronome/lib/groove/figure.ts
export const BARS_PER_CYCLE = 4

/** 0 ordinary · 1 light · 2 ordinary · 3 fill. Derived, never stored. */
export const barIndexFor = (step: number, stepsPerBar: number): number =>
  Math.floor(step / stepsPerBar) % BARS_PER_CYCLE

export function hitsAt(step: number, variations: boolean): readonly Hit[]
```

**`hitsAt` keeps taking the absolute step and gains no state.** It already
computes `step % 16`; it now also computes `floor(step / 16) % 4`. The spec's
first draft claimed a four-bar cycle forced a signature change — the musician
corrected that, and the correction is the reason nothing here becomes stateful.

**Do not refactor to `hitsAt(bar, stepInBar)`.** That moves the state to the
caller and breaks the property
[ADR 0007](../../docs/adr/0007-a-groove-is-humanized-a-click-is-not.md) rests on.

**Write the cycle as four bars of `source.steps`, not as 64 hard-coded steps.**
`docs/music.md` §5 Q5 asks whether meter becomes a variable; the first spelling
keeps that cheap to answer and the second makes it expensive.

### The source

```ts
export function createStraightFunkSource(options?: {
  seed?: number
  /** Read per step, not captured once — that is what makes a toggle land on
   *  the next unqueued step rather than needing the source rebuilt. */
  variations?: () => boolean
}): Source
```

**The flag is a function, deliberately.** The scheduler queues about 100 ms
ahead and `hitsAt` is called as each step is queued, so reading the flag there
makes a toggle take effect within the lookahead with no extra state, no restart
and no rebuild. Latching it to a bar line would cost up to 6 seconds of apparent
no-op at 40 bpm, and to a cycle line up to 24 — long past the point where
someone clicks it again believing the first click missed.

The one visible edge is accepted: unticking during steps 8–15 of bar 4 stops the
fill partway and returns the hat mid-bar. That reads as the app responding,
rather than as a glitch.

**With `variations: false` the output must be bit-identical to V6**, round-robin
sequence included. The flag may change which hits a step carries; it may never
touch the absolute-step indexing that take selection and humanize both read.

### Persistence

One field added to V7's record — **not a second storage key**:

```ts
export interface Setup {
  readonly bpm: number
  readonly source: SourceId
  readonly fills: boolean   // default true
}
```

`storedSetup.ts` validates per value, so a bad `fills` must fall back to `true`
without discarding a good tempo or a good groove.

### The invariants, as tests

The six from `spec.md` are assertions over all three bar shapes, not prose:

1. `kick` sounds on step 0 at 0.95 in every bar.
2. Every one of the 16 steps carries at least one hit, in every bar.
3. Steps 0–7 of every bar equal V6's figure exactly.
4. No marked bar changes `stepSeconds`, swing, the seed or the humanize bound.
5. Every `hatOpen` step is followed by a `hatClosed` step inside the same bar —
   otherwise an open hat rings until the *next* bar's step-0 closed hat and is
   cut at the exact instant the downbeat must be clean.
6. Adjacent non-ghost velocities in a designed contour differ by ≥ 0.08, because
   `gainTrim` is ±1.6 dB and 0.08 is 3.2 dB — every contour step can be
   flattened by jitter but never reversed.

Invariant 6 is the one **most likely to be broken by a later tweak**: nudging
0.70 to 0.74 would quietly make the fill's rise unreliable rather than wrong.

### What does not change

`humanize.ts` (`STRAIGHT_FUNK_HUMANIZE` binds marked bars identically),
`kit.ts`, `audioClock.ts` and `transport/` are all untouched. The choke is a
property of the voice bank and is not tied to step 15, so bar 2's open hat on
step 10 is choked by the closed hat on 11 with no code change.

### Build order — V7 lands first

**V8 does not start until `/implement-vibe-with-docs 7` has run.** V7 owns the
storage contract, and a change that extends someone else's contract should not
land before that contract exists. With V7 committed, V8's persistence work is
one boolean and one validation case.

The alternatives were V8 carrying its own storage for V7 to merge into later —
two authors defining one versioned record, which is the merge `SETUP_VERSION`
exists to avoid — and a separate `metronome.fills` key, which would give the app
two places a setup lives and two lifecycles for any future version bump.

## Epics

One epic. The cycle without the toggle ships the risk without its mitigation,
which is the split the size waiver already rejected.

### Track A — the four-bar figure

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/groove/figure.ts` + `figure.test.ts`
* **Needs to start:** the contracts above. The two bar tables in `spec.md` are
  frozen and measured — do not re-derive them

1. **red/green** — `barIndexFor`: 0, 1, 2, 3 over the absolute step, at both
   `stepsPerBar` values
2. **red/green** — bar 2 is the ordinary bar with exactly two edits: step 10
   `hatClosed` → `hatOpen` 0.76 as a **substitution**, step 15 `snare` 0.37 →
   0.66. Assert step 10 carries no closed hat
3. **red/green** — bar 4: steps 0–7 ordinary; the snare's eight steps; the hat
   present on 8 and absent on 9–15; no kick after step 3; no open hat
4. **red/green** — all six invariants, over all three bar shapes
5. **red/green** — `variations: false` reproduces V6's single bar exactly, for
   every step of all four bar positions

### Track B — the source and the live flag

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/groove/source.ts` + `source.test.ts`
* **Needs to start:** the contracts above

1. **red/green** — the flag is read **per step**: a source whose getter flips
   between two calls returns ordinary hits then marked ones, with no rebuild
2. **red/green** — with the flag false throughout, the hits and the round-robin
   take sequence are identical to V6's over at least 12 bars
3. **red/green** — the flag never reaches take selection or humanize: the same
   step yields the same displacement and the same take whichever way it is set

### Track C — the checkbox primitive

* **Role:** `implementer`
* **Owns:** `src/components/controls/Checkbox.tsx` + `Checkbox.test.tsx`
* **Needs to start:** nothing. Independent of A and B

1. **red/green** — generic, no domain word, props-driven, reachable by role
   `checkbox`, label from a prop. All styling here per
   [ADR 0005](../../docs/adr/0005-styling-lives-in-the-design-system.md)

### Track D — persistence and the wiring

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/setup/storedSetup.ts` + its test,
  `src/features/metronome/components/*`, `src/features/metronome/hooks/*`,
  `src/lib/snippets/en/*`
* **Needs to start:** V7 committed, plus Tracks B and C on disk

1. **red/green** — `Setup` gains `fills: boolean`, default `true`, validated per
   value: a bad `fills` falls back without discarding a good tempo or groove
2. **green** — the checkbox composes Track C's primitive, labelled from a
   snippet, **hidden while the source is the click**
3. **green** — it sits below Play beside the credit line and never pushes Play
   down; ticking it changes the next unqueued step

## Waves

* **Wave 1 (parallel):** Track A, Track B, Track C — disjoint files, all against
  frozen contracts
* **Wave 2:** Track D — needs B and C on disk, and V7 committed
* **Integration:** the checks below, then the listening pass

## Checks

* `npm test`, `npm run lint`, `npm run build`
* **A listening pass, and the musician expects one item to fail first.** Its
  eight, in its own order of risk: whether bar 4 reads as a fill without toms at
  60/100/160 bpm; whether bar 2 reads as a variation or as a wrong note; whether
  the hat dropping for seven steps is a relief or a hole; whether thirteen steps
  with no kick is the feet stopping or the bottom falling out; whether the
  step-10 open hat sits under the step-14 one as the numbers say; whether the
  open hat sounding twice in bar 2 **from the same file** is mechanical; whether
  a fill every 5.33 s at 180 bpm is a drummer who cannot leave it alone — *"I
  would expect this one to fail first"*; and whether the downbeat after the fill
  lands with no crash to arrive at.

  Each carries a named single-number fallback, so a failed listening is a value
  change rather than a redesign. They are in the musician's report and the two
  cheapest are: bar 2 too subtle → step 15 snare 0.66 → 0.74; hat hole in bar 4
  → restore `hatClosed` on step 12 at 0.90.

## Risks

| Risk | What holds it |
| :-- | :-- |
| Step 10's open hat is *added* rather than substituted | Invariant 5 and an explicit assertion that step 10 carries no closed hat. The musician calls this the single easiest mistake in the change |
| A later tweak flattens the fill's rise | Invariant 6 — adjacent non-ghost velocities ≥ 0.08, because `gainTrim` is ±1.6 dB and worst-case jitter closes exactly 3.2 dB |
| The fill's takes are indexed phrase-locally | Track B step 3. A phrase-local index makes every fill bit-identical every four bars, on the most exposed bar in the loop |
| The toggle changes the round-robin or the humanize | Track B step 3, asserted both ways |
| An open hat with no closed hat after it in the same bar | Invariant 5 — it would otherwise ring until the next bar's step 0 and be cut at the instant the downbeat must be clean |
| `hitsAt` is refactored to take a bar index | The contract says not to. It would move state to the caller and break what ADR 0007 rests on |
| V8 lands before V7 and invents a second storage key | The build order above; Track D cannot start until V7 is committed |
