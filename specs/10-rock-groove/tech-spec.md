# V10. Rock — tech spec

## Build order

**V10 builds after V9 (count-in) has landed**, by the user's decision: V9 reads
*ready to build* and building in spec order keeps the numbering and the history
aligned. The cost was named at the time — V9 is written against a tree with one
groove — and reading `lib/countIn/source.ts` in its current state shows the cost
did not land: `createCountInSource(inner: Source, countIn)` reads `inner.steps`
and `inner.id` and hard-codes no groove. It wraps rock unchanged.

**What V9 does change is the contract.** `Source` has grown a fourth optional
method since V8:

```ts
takeStep?(step: number): number
```

The step the device indexes round-robin takes on, which a count-in maps back so
a groove's first sounding bar draws the takes it would have drawn from silence.
The registry must carry it through, or a rock groove behind a count-in draws the
wrong samples.

## Contracts

The three bar tables are frozen in [spec.md](spec.md) and not repeated here.

### A groove is data

```ts
// src/features/metronome/lib/groove/grooves/definition.ts
export interface Line {
  readonly voice: VoiceName
  readonly velocity: Velocity
  readonly steps: readonly number[]
}

export interface GrooveDefinition {
  readonly id: SourceId
  /** Grid the figure is written on. 16 for every groove so far. */
  readonly steps: number
  /**
   * The subdivision the groove *states*, which is not always the grid it is
   * written on: 16 for funk, 8 for rock. Positions between its steps are
   * rests, and ADR 0010's invariant 2 reads against this rather than against
   * `steps` — see the amendment below.
   */
  readonly subdivision: number
  readonly seed: number
  readonly swing: number
  readonly humanize: Humanize
  readonly ordinary: readonly Line[]
  readonly light: readonly Line[]
  readonly fill: readonly Line[]
}
```

`subdivision` is **new data every groove now carries**, and it exists because of
the ADR amendment rather than for its own sake. Without it the invariant cannot
be stated generally and a test would have to know which groove it is looking at.

### The machinery

```ts
// src/features/metronome/lib/groove/cycle.ts
export const BARS_PER_CYCLE = 4
export function barIndexFor(step: number, stepsPerBar: number): number
export function hitsAt(
  groove: GrooveDefinition,
  step: number,
  variations: boolean,
): readonly Hit[]

// src/features/metronome/lib/groove/source.ts
export function createGrooveSource(
  groove: GrooveDefinition,
  options?: { seed?: number; variations?: () => boolean },
): Source
```

`hitsAt` still takes the **absolute** step and gains no state — the rule ADR
0007 rests on, unchanged. The cycle is `[ordinary, light, ordinary, fill]`.

`createGrooveSource` must populate `displace`, `trim` **and `takeStep`**. The
last is the one a reader will forget, because V8's `createStraightFunkSource`
predates it.

### What moves, and what does not

| Today | After | Why |
| :-- | :-- | :-- |
| `figure.ts` — funk's lines + the cycle | `cycle.ts` + `grooves/straightFunk.ts` | machinery is one concern, data another |
| `figure.test.ts` | `cycle.test.ts` + `grooves/straightFunk.test.ts` | colocation survives a move — `coding-guidelines.md` |
| `source.ts` — `createStraightFunkSource` | `source.ts` — `createGrooveSource` | one factory over data |
| `swing.ts` — `STRAIGHT_FUNK_SWING` | `grooves/straightFunk.ts` | it is that groove's datum, not a module |
| `humanize.ts` — `STRAIGHT_FUNK_HUMANIZE` | `grooves/straightFunk.ts` | the helpers stay; only the record moves |
| `kit.ts` | unchanged | it belongs to no groove |

**`humanize.ts`'s helpers stay exactly where they are.** Only the named record
moves, because rock shares its three numbers and a second copy would be a second
thing to drift.

### The ADR amendment

ADR 0010's invariant 2 becomes: **every step of the groove's stated subdivision
carries at least one hit, and the positions between them are rests.** For funk
the subdivision is 16 and nothing changes. For rock it is 8, so the odd steps
are rests by declaration.

What it still forbids is unchanged: a marked bar may not open a hole in the
subdivision the groove declared — that is what would turn a fill into a gap
click. `/implement-vibe-with-docs` §8a makes the edit.

## Epics

One epic. The registry with no second groove ships nothing, and rock without the
registry is the option the spec rejected.

### Track A — the registry, and funk moved into it

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/groove/source.ts`, `swing.ts`,
  `humanize.ts`, `grooves/straightFunk.ts` + its test, and the retirement of
  `figure.ts` / `figure.test.ts`
* **Needs to start:** the contracts above, written in the lead

1. **green** — `createGrooveSource` over a definition, carrying `displace`,
   `trim` and `takeStep`
2. **green** — funk's lines, humanize, swing and seed move into
   `grooves/straightFunk.ts` unchanged. **Every funk behaviour test passes
   unaltered in substance.** A test that has to be rewritten was testing the
   shape rather than the sound, and that is a finding to report rather than a
   licence to edit
3. **green** — `cycle.test.ts` holds what is now groove-agnostic; the six
   invariants become a helper any groove's test can call

### Track B — rock

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/groove/grooves/rock.ts` + its test
* **Needs to start:** the contracts above. Independent of Track A

1. **red/green** — the ordinary bar, exactly as `spec.md` writes it
2. **red/green** — **the bar line**: `kick` 0.95 on step 0 against 0.86 on
   step 8. Assert the bar is *not* invariant under a half-bar shift, because
   every other element of it is — that is the finding, and a test that only
   checks the two velocities would pass a figure with no bar line at all
3. **red/green** — bar 2's two edits, step 10 a **substitution** with no closed
   hat left on it; bar 4's fill, with the kick keeping time on 8 and 12
4. **red/green** — the six invariants under the amended reading: rock's stated
   subdivision is 8, its odd steps are rests, and no marked bar opens a hole in
   the eighths

### Track C — the wiring

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/transport/source.ts` (`SOURCE_IDS`),
  `src/features/metronome/components/*`, `src/features/metronome/hooks/*`,
  `src/lib/snippets/*`
* **Needs to start:** Tracks A and B on disk

1. **green** — `SOURCE_IDS` gains `'rock'`, so `storedSetup` validates it
2. **green** — the select reads Click, Rock, Straight funk, labelled from a
   snippet
3. **green** — **switching between the two grooves fetches nothing.** Both draw
   the same `KIT_SAMPLE_URLS`; if `select()` currently tears the device down and
   refetches, that is the step to fix, and it is the one place this change can
   make the app worse

## Waves

* **Wave 1 (parallel):** Track A, Track B — disjoint files, both against
  contracts frozen in the lead
* **Wave 2:** Track C — needs A and B on disk
* **Integration:** the checks below, then the listening pass

## Checks

* `npm test`, `npm run lint`, `npm run build`
* **A listening pass.** The musician's six, in its order:
  **the bar line with Fills off** — 3.60 dB between the two kicks is the whole
  cue, and the fallback is widening step 8 to 0.82; bar 4's beat 4, where the
  backbeat is absorbed into the crescendo 6.8 dB down, the biggest departure in
  the design; the hat ladder at 3.2 dB reading as even eighths with an accent
  rather than a funk hat with notes missing; backbeat 0.95 against funk's 0.92,
  which is 1.2 dB and free to reverse; the open hat at 80 bpm, ringing 375 ms
  into its choke; and fill density at 12.0 s per cycle at 80 bpm.

## Risks

| Risk | What holds it |
| :-- | :-- |
| `createGrooveSource` forgets `takeStep` | It postdates V8's factory, so nothing in the old shape hints at it. Track A step 1 names it; a rock groove behind a count-in would otherwise draw the wrong samples |
| Funk's sound changes during the move | Track A step 2 — its behaviour tests pass unaltered. Any rewrite is reported, not absorbed |
| Rock ships with no audible bar line | Track B step 2 asserts the half-bar asymmetry rather than the two numbers |
| Step 10's open hat is added rather than substituted | Same trap as funk's, same assertion. Step 14 is impossible here — rock's step 15 is empty, so an open hat there fails invariant 5 |
| The invariant is loosened in a test instead of amended in the ADR | The amendment is a `## Done when` bullet and §8a's job, so the verifier grades it |
| Switching grooves refetches 22 files | Track C step 3 |
