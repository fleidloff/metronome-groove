# V12. Shuffle — tech spec

Built on V10, which has landed. The three bar tables are frozen in
[spec.md](spec.md), with the numbers; nothing here restates them.

**V11 is landing while this is written**, and it has already widened the shared
contract in `grooves/definition.ts`: `ordinary` is an array of bars, and a
groove declares the `voices` it needs so selecting it fetches those and not the
pack. Shuffle writes against that shape, which costs it two lines and no
thought — `ordinary: [ORDINARY]`, and rock's four voices. Nothing else about
V11 reaches this change: bossa is swing 0 and never enters `swing.ts`, shuffle
states one ordinary bar and never enters the phase logic.

## Contracts

### The warp

```ts
export function swingOffset(
  swing: number,
  step: number,
  stepSeconds: number,
  stride: number,
): number
```

`stride` is `groove.steps / groove.subdivision` — the number of grid steps in
one stated step. 1 for funk, 2 for rock and shuffle. The word is
`invariants.ts`'s, which already computes exactly this quantity for invariant 2.

**It is required, not defaulted.** A default of 1 would make every future
`subdivision: 8` groove silently swing nothing, which is the bug this change
exists to fix — and it would fail quietly, since the groove still plays.

The offset in seconds, for grid step `t`:

```
p = t / stride
n = floor(p)
f = p − n
A(k) = k + (k odd ? swing / 2 : 0)
warped = A(n) + f × (A(n + 1) − A(n))
offset = (warped − p) × stride × stepSeconds
```

`swing` is clamped to `[0, 1]` as today.

**Three properties, each of them a test rather than a claim:**

| Property | Why it holds |
| :-- | :-- |
| Funk is bit-identical | `stride` 1 ⇒ `f` = 0 ⇒ `offset` = `swing × stepSeconds / 2` on odd steps, 0 on even. Today's formula, character for character |
| Rock is bit-identical | `swing` 0 ⇒ `A(k) = k` ⇒ `warped = p` ⇒ 0 |
| No hit overtakes the next | `A(n+1) − A(n)` is `1 ± swing/2`, ≥ 0.5 for `swing ≤ 1`, and interpolation inside each interval is linear and increasing |

The third one matters to the transport, not just to the ear: `scheduler.ts`
queues on grid time and schedules on displaced time, so a non-monotone
displacement would reorder hits under lookahead windowing.

### Where the warp lands, verified

Shuffle at `swing = 2/3`, `stride = 2`. Positions in beats, `0` being the
downbeat. These are the assertions Track A writes, worked out by hand:

| Step | Straight | Warped | Reads as |
| --: | --: | --: | :-- |
| 0 | 0 | 0 | beat 1 |
| 2 | 0.5 | 0.6667 | the third triplet |
| 8 | 2.0 | 2.0 | beat 3 |
| 9 | 2.25 | 2.3333 | beat 3 + 1/3 |
| 10 | 2.5 | 2.6667 | beat 3 + 2/3 |
| 13 | 3.25 | 3.3333 | beat 4 + 1/3 |
| 15 | 3.75 | 3.8333 | beat 4 + 5/6 |

The set `{0, 1/3, 2/3, 5/6}` per beat is a proper subset of the sextuplet grid.
What it cannot reach is 1/6 and 3/6 — the straight eighth, whose absence is the
point, and the second half of the first triplet, whose absence is the price.

### The groove

```ts
export const SHUFFLE: GrooveDefinition
```

`id: 'shuffle'`, `steps: STEPS_PER_BAR`, `subdivision: 8`, `swing: 2 / 3`
written as the ratio, `seed: 0x5f_73_68_75`, `humanize: STRAIGHT_FUNK_HUMANIZE`
— the shared record, unchanged and still under funk's name, which V10 already
notes is wrong for what it holds.

`voices: KIT_VOICES` — all four, the same set rock declares, which is what makes
the switch between them fetch nothing. `ordinary: [ORDINARY]`, one bar: phase
length 1, so `phaseFor` answers 0 forever and invariant 3 reduces to its
pre-V11 wording.

### The fourth entry

| File | The line |
| :-- | :-- |
| `lib/transport/source.ts` | `SOURCE_IDS` gains `'shuffle'`, between `'rock'` and `'straight-funk'` |
| `hooks/useClickTransport.ts` | `GROOVES` gains `shuffle: SHUFFLE` |
| `components/SourceSelect.tsx` | a third option, after Rock |
| `src/lib/snippets/{types,en/metronome}.ts` | `shuffle: 'Shuffle'` |

**`GROOVES` is typed `Record<Exclude<SourceId, 'click'>, GrooveDefinition>`, so
the first of those four makes the second a compile error.** V10 built that on
purpose. No runtime fallback is possible and none needs testing.

`storedSetup` needs no change — it validates against `SOURCE_IDS`.

## Epics

One epic. Two tracks, one wave, and the warp's signature above is the only thing
either needs from the other.

### Track A — the warp

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/groove/swing.ts` + its test,
  `src/features/metronome/lib/groove/source.ts`
* **Needs to start:** the contracts above

1. **red** — funk's offsets are unchanged for every step of a bar at
   `stride` 1, against the values today's formula produces. This test is written
   first and never edited afterwards; it is the whole guarantee that a landed
   groove did not move.
2. **red/green** — the warp, asserted against the seven positions in the table
   above, in beats rather than in seconds so a reader can check them
3. **red/green** — monotonicity: over a bar at `stride` 2 and `swing` 2/3, every
   step's sounding time is strictly greater than the last's
4. **green** — `createGrooveSource` passes `groove.steps / groove.subdivision`.
   Guard the non-integer case here rather than in `swingOffset`: a groove whose
   subdivision does not divide its grid is already invariant 2's violation, and
   `invariants.ts` reports it in those words
5. Rewrite the doc comment. `1` lands the off-beat at 0.75 of a beat, not on the
   next on-beat; the ratio is `(2 + s)/(2 − s)`; swing warps rather than
   displaces

### Track B — the groove

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/groove/grooves/shuffle.ts` + its test,
  `lib/transport/source.ts`, `hooks/useClickTransport.ts`,
  `components/SourceSelect.tsx`, `src/lib/snippets/{types,en/metronome}.ts`
* **Needs to start:** the contracts above. It does **not** need Track A — the
  lines and every assertion below are independent of what swing does to them

1. **red/green** — the three bars, transcribed from `spec.md`'s tables
2. **red/green** — `sixInvariantViolations(SHUFFLE)` returns empty. No
   `ghostVelocity` is passed, because this groove has none
3. **red/green** — the kick sounds on step 10 of every unmarked bar, which is
   the one note that makes it a shuffle rather than rock. Assert the note, not
   the swing that carries it
4. **red/green** — the fourth entry: `SOURCE_IDS`, `GROOVES`, the select, the
   snippet. Reading a stored `'shuffle'` returns it rather than the click
5. **red/green** — shuffle and rock resolve to the same bank, so selecting one
   after the other fetches nothing (ADR 0013's device key)

### Wave 2 — integration

Both tracks merged, then `sixInvariantViolations` over every groove in
`GROOVES` rather than over shuffle alone — the warp touches a shared file, and
the cheapest proof that it left the others alone is the rulebook run over all of
them. Then the checks below. The listening pass is the user's and is `spec.md`'s six items.

## Waves

* **Wave 1 (parallel):** Track A, Track B
* **Wave 2:** integration — needs both

## Checks

`npm test && npm run lint && npm run build`

## Risks

| Risk | What holds it |
| :-- | :-- |
| The warp changes funk or rock by a hair | Track A step 1, written before the formula and never edited after. A bit-identical assertion, not an approximate one |
| `stride` acquires a default later, and every `subdivision: 8` groove stops swinging silently | It is required in the contract, and the comment says why. A groove that does not swing still plays, so nothing else would catch it |
| Shuffle's fill is written against rock's fill as it was last week | Rock's bar 4 changed on disk mid-spec — it now rides an open hat on step 10. `spec.md`'s tables are what Track B transcribes, and they are the frozen version |
| The 5/6 note on step 15 reads as a smudge rather than a pickup | `spec.md`'s listening item 5, with dropping it as the fallback |
| A throttled tab drops one swung step on wake | `dropOvertakenSteps` compares against grid time with half a step of grace, and a swung hit can sound 2/3 of a step late. One step, once, ~29 ms at 85 bpm. Recorded rather than fixed |
| V11 is still in flight when this starts, and its contract moves again | Shuffle touches no file V11 owns. If `definition.ts` widens further, shuffle pays whatever funk and rock pay, in the same edit |
| Rock has not yet declared its `voices`, so V11's contract is half-applied in the tree | Track B's step 5 asserts the shared bank rather than the field, so it passes either way and fails if the two grooves ever diverge |
