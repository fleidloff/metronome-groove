# V13. Second line — tech spec

## Build order — none

**V13 is independent of V11 and buildable in either order.** It adds no voice,
so it touches none of the files V11 edits: `kit.ts`, `kit.test.ts`,
`KIT_VOICES`, `VOICE_ORDER` and `public/samples/` are all untouched. Build it
before bossa, after it, or between — nothing changes.

It does assume V10's registry, which is shipped: `GrooveDefinition` with
`ordinary` as an array of bars, a per-groove `voices` list, a declared
`subdivision`, and `invariants.ts`.

## Contracts

The three bar tables are frozen in [spec.md](spec.md), **with their numbers**.

### The definition

```ts
// src/features/metronome/lib/groove/grooves/secondLine.ts
export const SECOND_LINE_SWING = 0.2

/** This groove's ghost, and deliberately not funk's GHOST_VELOCITY of 0.37 —
 *  at 0.37 a tap renders 0.73 dB *below* the hat's own sixteenths and sinks
 *  into the hat line. 0.45 puts it 2.47 dB above. */
export const SECOND_LINE_TAP = 0.45

export const secondLine: GrooveDefinition = {
  id: 'second-line',
  steps: 16,
  subdivision: 16,
  seed: 0x5f_32_6e_64,
  swing: SECOND_LINE_SWING,
  humanize: STRAIGHT_FUNK_HUMANIZE,   // exactVoices stays []
  voices: ['kick', 'snare', 'hatClosed', 'hatOpen'],
  ordinary: [[/* one bar */]],
  light: [/* … */],
  fill: [/* … */],
}
```

`ordinary` carries **one** entry. The registry supports more and V13 declines
it: the figure's repeat period is what a player finds bar 1 against, and this is
the groove where that is hardest.

**Nothing else changes.** `swing.ts` is correct as written and V13 is simply its
first non-zero caller. `kit.ts`, `definition.ts`, `humanize.ts` and every
transport file are untouched.

### What `SOURCE_IDS` gains

`'second-line'`, **appended last**. The list is ordered baseline-first and this
groove gives the least reference of any of them. It is never the default.

### The swing guarantee, which is the one thing to assert rather than assume

`swingOffset` returns 0 for any even step, and the step it receives is the
**absolute** step. A bar is 16 steps and 16 is even, so absolute parity equals
bar-local parity in every bar forever — therefore the quarters (0, 4, 8, 12) and
the eighths (2, 6, 10, 14) can never move, at any tempo, at any swing value.

That is the condition the whole feature rests on, and it is a property of the
function rather than of 0.2. **Assert it directly**, because the day someone
changes `swingOffset`'s parity test is the day every groove's quarters start
lilting and nothing else would catch it.

### The trap: `exactVoices` must not reach swing

`swingOffset` is added inside `createGrooveSource.displace` **outside**
`timingOffset`, so V11's `exactVoices` cannot zero it — and must not be
"helpfully" extended to. Swing is *where the grid is*, not a displacement off
it: a voice that did not swing would flam against a swung hat on the same step.
V13 ships `exactVoices: []` so nothing exercises this today, which is exactly
why it wants a test now rather than after V11 lands.

## Epics

One epic.

### Track A — the figure

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/groove/grooves/secondLine.ts` + its test
* **Needs to start:** the contracts above

1. **red/green** — the ordinary bar exactly as `spec.md` writes it: the snare on
   6, 14, 10, 3, 11 and **no quarter**, the kick on 0, 6, 12, the hat's three
   rungs, and no `hatOpen`
2. **red/green** — **assert the snare states no quarter.** That is the idiom,
   and a test naming only the five step numbers would pass a figure that had
   quietly acquired a backbeat
3. **red/green** — the light bar's two edits, step 12 a **substitution** leaving
   no closed hat on it
4. **red/green** — the fill: the hat plays all 16 steps, every ordinary snare
   note keeps its velocity, and the loudest note is 0.86 — assert it is below
   the downbeat kick, which is the property, not the number
5. **red/green** — all six invariants through `invariants.ts`, passing
   `ghostVelocity: 0.45`

### Track B — the swing guarantees

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/groove/swing.test.ts`,
  `src/features/metronome/lib/groove/source.test.ts`
* **Needs to start:** the contracts above. Independent of Track A

1. **red/green** — no even step is displaced, for every swing value in
   `[0, 0.2, 0.26, 0.667, 1]` and every tempo in `[40, 88, 92, 96, 180]`
2. **red/green** — a swung odd step lands late by at least 3.3 ms across the
   whole 40–180 range, and never early
3. **red/green** — `exactVoices` does not zero swing: a source whose
   `exactVoices` names a voice still swings that voice's odd steps

### Track C — the wiring

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/transport/source.ts`,
  `src/features/metronome/components/*`, `src/lib/snippets/*`
* **Needs to start:** Track A on disk

1. **green** — `SOURCE_IDS` gains `'second-line'` last, so `storedSetup`
   validates it
2. **green** — the select gains a fifth entry, labelled from a snippet, and the
   default is unchanged
3. **green** — one assertion that the count-in stays exact under a swung groove:
   `createCountInSource.displace` returns 0 during the count bar and subtracts a
   multiple of 16 after, so the swing phase survives the handoff

## Waves

* **Wave 1 (parallel):** Track A, Track B — disjoint files
* **Wave 2:** Track C — needs A on disk
* **Integration:** the checks below, then the listening pass

## Checks

* `npm test`, `npm run lint`, `npm run build`
* **A listening pass**, in the musician's order of risk:
  **are beats 2 and 3 findable?** They are carried by the hat's 0.90 rung alone,
  4.8 dB over the "and"s, with the snare's loudest note 9.3 dB above them on a
  step they do not occupy. Funk has one such quarter; this has two. **If they
  are not findable the fix is the hat's top rung, 0.90 → 0.94 — never a snare on
  the beat**, which would import the cue the groove exists to remove.
  Then: is 0.2 deep enough to notice (next value 0.26, never 0.22); is the tap
  at 0.45 audible over a closed hat on the same step; does the open hat on step
  12 read as the big four or as the bar changing shape; and does the fill read
  as the figure completing rather than as a different bar.

## Risks

| Risk | What holds it |
| :-- | :-- |
| Someone changes `swingOffset`'s parity test | Track B step 1. Every groove's quarters would start lilting and nothing else in the suite would catch it |
| `exactVoices` is extended to swing when V11 lands | Track B step 3, written now precisely because V13 does not exercise it |
| The figure quietly acquires a backbeat | Track A step 2 asserts the *absence* rather than listing the five steps present |
| The fill's loudest note creeps over the downbeat | Track A step 4 asserts the relation, not the constant. Funk's step-15 arrival is 0.14 dB *above* its downbeat kick, which is what this groove cannot afford |
| 0.22 is used "to match the sibling" | 0.8 ms at 92 bpm, inaudible, and it breaks `docs/music.md`'s own ordering. Recorded in `## Decided` |
| The tap uses funk's 0.37 | It would sink 0.73 dB below the hat's own sixteenths. `SECOND_LINE_TAP` exists so the number has a name and a reason |
