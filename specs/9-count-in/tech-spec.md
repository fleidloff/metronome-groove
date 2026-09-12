# V9. Count-in — tech spec

## Contracts

### Where it lives — a Source that wraps a Source

```ts
// src/features/metronome/lib/countIn/source.ts
export function createCountInSource(
  inner: Source,
  /** Latched at Start by the hook, so it cannot change mid-run. Read per step
   *  all the same, exactly as V8 reads `variations`. */
  countIn: () => boolean,
): Source
```

Its own concern folder beside `click/`, `groove/` and `transport/`. It is not a
click — it is a pre-roll that borrows the click's voice — and it wraps *any*
`Source`, so the next groove gets a count-in with no edit here.

The whole of it, as behaviour:

| Member | Count-in armed | Not armed |
| :-- | :-- | :-- |
| `id` | `inner.id` | `inner.id` |
| `steps` | `inner.steps` | `inner.steps` |
| `humanize` | `inner.humanize` | `inner.humanize` |
| `hitsAt(step)` | step < `steps`: claves per `CLICK_PATTERN` on the quarters, nothing on the other steps. Otherwise `inner.hitsAt(step - steps)` | `inner.hitsAt(step)` |
| `displace(h, step, s)` | step < `steps`: `0`. Otherwise `inner.displace?.(h, step - steps, s) ?? 0` | delegates unshifted |
| `trim(h, step)` | step < `steps`: `1`. Otherwise `inner.trim?.(h, step - steps) ?? 1` | delegates unshifted |

**The offset is the load-bearing line.** `step - steps` is what makes
`## Done when` bullet 2 true: the groove's first bar is still its absolute step
0, so round-robin selection, `timingOffset` and `gainTrim` all see exactly what
they would have seen without a count-in. An implementation that passed the raw
`step` through would shift the groove's take sequence by one bar and nothing
would fail loudly.

`id` reports the inner id rather than a new one: `SOURCE_IDS` is what
`storedSetup` validates a stored groove against, and a wrapper is not a thing
anyone selects.

`humanize` stays the inner's, so
[ADR 0007](../../docs/adr/0007-a-groove-is-humanized-a-click-is-not.md)'s rule
— null for the click and only the click — still reads true. The count bar is
exact because `displace` returns 0 there, not because the field is null.

### What sounds in the count bar

`CLICK_PATTERN` — 0.65 on beat 1, 0.50 on the other three, the velocities V2
measured — voiced `claves`. Imported from `click/pattern.ts`, not re-declared.

The count bar is `inner.steps` long, so on a sixteen-step groove the claves
land on steps 0, 4, 8 and 12 and the twelve steps between them are empty. That
falls out of `isQuarter`, which is also what lights the four dots — the count
bar needs no display work at all.

`BEATS_PER_BAR` is never written as 4 here. The beats come from
`isQuarter(step, inner.steps)` and the pattern's own length, because
`docs/music.md` §5 Q5 leaves meter open.

### The flag is latched at Start, not read live

V8's `variations` is read per queued step so unticking lands inside the
lookahead. **`countIn` must not work that way.** It decides where the groove's
timeline begins, so a flip mid-bar would shift the groove against itself.

The latch costs no new state in the source and no `reset` hook on `Source`:

```ts
// useClickTransport.ts session
countIn: false,      // what the checkbox says
countInArmed: false, // what this run was started with
```

`begin()` writes `countInArmed` immediately before `scheduler.start()` and
nothing else ever writes it. The source is handed `() => live.countInArmed`, so
the value it reads per step simply cannot change inside one run.

`begin` takes whether to arm as an argument rather than reading the field,
which is what keeps the three entry paths honest:

```ts
const begin = (next: number, armCountIn: boolean) => {
  live.countInArmed = armCountIn && live.countIn
  …
}

start(next)  → begin(next, true)
resume(next) → begin(next, false)   // the tap-tempo return
select(next) → begin(live.bpm, false) // the mid-run switch
```

The click never gets wrapped, so there is no path on which a count-in can
precede it — that is the guarantee, not a branch inside the wrapper:

```ts
const sourceFor = (id, variations, countIn): Source =>
  id === 'click'
    ? CLICK_SOURCE
    : createCountInSource(createStraightFunkSource({ variations }), countIn)
```

### The voice bank

A groove's device decodes the kit and nothing else today. It gains the claves:

```ts
const bank =
  id === 'click'
    ? await buildClavesBank(context)
    : { ...(await buildClavesBank(context)), ...(await buildKitBank(context)) }
```

Both builders already exist and neither changes. `claves` gets no entry in
`KIT_CHOKES`: it silences nothing and nothing silences it.

**The lead-in already works per voice.** `CLAVES_LEAD_IN_S` is 8.3 ms and every
kit voice's is 0; `Clock.leadInFor` reads it from the bank. The scheduler's
`start` anchors on `maxLeadIn(source.hitsAt(0))`, which with a count bar is the
claves' 8.3 ms — correct, and it falls out with no edit.

### Persistence

One field on V8's record — **not a second key and not a version bump**:

```ts
export const DEFAULT_COUNT_IN = false

export interface Setup {
  readonly bpm: number
  readonly source: SourceId
  readonly fills: boolean
  readonly countIn: boolean
}
```

`SETUP_VERSION` stays at 1. The per-value fallback is what makes that safe: a
record written by V7 or V8 carries no `countIn` key and still reads back
complete, tempo and groove intact. Bumping the version would discard both for a
field that has a perfectly good default — which is the reasoning
[ADR 0009](../../docs/adr/0009-the-setup-lives-in-the-browser.md) already
settled.

### `Source.takeStep` — added mid-build, and why

**This contract was wrong when it was written.** It said `transport/` stays
untouched. Track A's red step found that round-robin take selection does not go
through the source at all:

```ts
// scheduler.ts
clock.schedule(at, hit, { step, gain: source.trim?.(hit, step) ?? 1 })
// audioClock.ts
const take = voice.takeFor(hit.velocity, placement.step)
// kit.ts
urls[absoluteStep % urls.length]   // three takes
```

The raw scheduler step reaches the device. With a count bar the groove's first
bar is scheduled at steps 16–31, so takes are picked for 16–31 — a rotation of
one in three that persists for the whole run. `displace` and `trim` are already
correct, because the wrapper offsets those itself; only take selection leaks.

So `Source` gains one optional member:

```ts
/**
 * The step the device indexes round-robin takes on. Absolute, and the grid
 * step unless a source shifts its own timeline — a count-in maps it back, so
 * the groove's first sounding bar draws the takes it would have drawn had it
 * started from silence.
 */
takeStep?(step: number): number
```

and `scheduler.ts` changes by one expression:

```ts
clock.schedule(at, hit, {
  step: source.takeStep?.(step) ?? step,
  gain: source.trim?.(hit, step) ?? 1,
})
```

**The scheduler still knows nothing about count-ins.** It asks the source which
step to index takes on, exactly as it already asks how far to displace a hit —
which is the shape ADR 0007 chose for `displace` and the reason that one was
right. The wrapper implements `takeStep` as `step - steps` when armed and past
the count bar, `step` otherwise, and delegates to `inner.takeStep` if the inner
has one.

### What must not change

`transport/audioClock.ts`, `groove/*` and `click/pattern.ts` are untouched, and
the edit to `transport/` is the two above and nothing else. The timeline stays
in one place that already works.

## Epics

One epic. A count bar nobody can switch on is not a shippable half, and the
source and its toggle are two days' work between them, not two.

### Track A — the wrapper

* **Role:** `test-writer`, then `implementer` in the same track
* **Owns:** `src/features/metronome/lib/countIn/source.ts` + `source.test.ts`
* **Needs to start:** the contract table above. Nothing else

1. **red/green** — armed, `hitsAt` returns one claves hit per quarter of bar 0
   at `CLICK_PATTERN`'s velocities, and nothing on the steps between
2. **red/green** — armed, step `steps + n` returns `inner.hitsAt(n)` for every
   `n` across at least three bars. Drive it with a spy `inner` that records the
   step it was asked for, so the offset is asserted directly rather than
   inferred from the hits
3. **red/green** — armed, `displace` and `trim` are 0 and 1 through the count
   bar, and delegate with the same `step - steps` afterwards
4. **red/green** — not armed, every member is transparent: the same hits, the
   same displacement, the same trim as `inner` for the same raw step
5. **red/green** — `id`, `steps` and `humanize` are the inner's either way
6. **red/green** — a groove wrapped and armed produces, from its first sounding
   bar on, the identical hit-and-step sequence an unwrapped groove produces
   from its own first bar. This is `## Done when` bullet 2 and it is the test
   most worth writing first

### Track B — the checkbox

* **Role:** `implementer`
* **Owns:** `src/features/metronome/components/CountInToggle.tsx` +
  `CountInToggle.test.tsx`
* **Needs to start:** nothing. V8's `components/controls/Checkbox` primitive is
  already on disk and is **not** modified here

1. **green** — composes `Checkbox` exactly as `FillsToggle` does, labelled from
   a new `metronome.countIn` snippet. No styling: per
   [ADR 0005](../../docs/adr/0005-styling-lives-in-the-design-system.md) there
   is no `className` under `src/features/`

### Track C — persistence

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/setup/storedSetup.ts` + its test
* **Needs to start:** V8 committed. It owns the `fills` field this one sits
  beside

1. **red/green** — `Setup` gains `countIn: boolean`, default `false`
2. **red/green** — validated per value: a non-boolean `countIn` falls back to
   `false` without discarding a good tempo, groove or `fills`
3. **red/green** — a V7-shaped and a V8-shaped record both read back complete,
   with `countIn` defaulted and `SETUP_VERSION` still 1

### Track D — the wiring

* **Role:** `implementer`
* **Owns:** `src/features/metronome/hooks/useClickTransport.ts` + its test,
  `src/features/metronome/components/Metronome.tsx` + its test,
  `src/lib/snippets/en/metronome.ts` + `src/lib/snippets/types.ts`
* **Needs to start:** Tracks A, B and C on disk

1. **red/green** — `begin(next, armCountIn)`: `start` arms, `resume` and
   `select` do not. Assert it through the transport's public surface, with a
   fake factory, rather than by reaching into the session
2. **red/green** — `countInArmed` cannot change inside a run: toggling
   `setCountIn` mid-run leaves the queued steps alone, and the next `start`
   picks it up
3. **green** — the groove's bank carries claves as well as the kit
4. **red/green** — `Transport` gains `setCountIn?(on: boolean)`; `Metronome`
   holds `countIn` state, restores it in the mount effect beside `bpm`,
   `source` and `fills`, and writes it in the same `writeSetup` effect
5. **green** — `CountInToggle` renders beside `FillsToggle` below Play, hidden
   on the same condition (`source !== 'click'`), and neither pushes Play down

## Waves

* **Wave 1 (parallel):** Track A, Track B, Track C — disjoint files
* **Wave 2:** Track D — needs all three on disk
* **Integration:** the checks below, then the listening pass

## Checks

* `npm test`, `npm run lint`, `npm run build`
* **A listening pass, three items.** Whether the seam reads as a handoff — four
  claves, then the kit, and no claves again — or as the app changing its mind.
  Whether 6 s of count at 40 bpm is the tempo being stated or the app being
  slow. Whether the first kick of the groove lands where the fourth claves
  promised it would, which is the one failure that would make the feature worse
  than nothing.

## Risks

| Risk | What holds it |
| :-- | :-- |
| The wrapper passes the raw `step` to `inner` instead of `step - steps`, shifting the groove's round-robin by a bar | Track A steps 2 and 6. Nothing else in the app would fail, and no test outside this file would notice |
| `countIn` is read live like V8's `variations`, and a mid-bar flip shifts the groove against itself | The latch in `begin`, and Track D step 2 asserting it both ways |
| A count-in reaches the click | `sourceFor` never wraps `CLICK_SOURCE`. Structural, not a branch |
| The claves are added to the kit bank but `KIT_CHOKES` grows an entry for them | Contract above says none. A choke on claves would cut the count's own tail |
| `SETUP_VERSION` is bumped "to be safe" and every existing player loses their tempo | Track C step 3 pins a V7-shaped and a V8-shaped record reading back complete |
| `BEATS_PER_BAR` is hard-coded as 4 in the wrapper | The count bar is derived from `inner.steps` and `isQuarter`, per `docs/music.md` §5 Q5 |

## Open

Nothing.
