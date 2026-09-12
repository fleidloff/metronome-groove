# V3. Tap tempo — tech spec

**Phase:** settled — `/implement-vibe-with-docs 3`

## Decided

* **The tap logic is a pure module, `lib/tap/`, that takes timestamps** —
  `addTap(state, at)` returns a new state, with no React, no DOM and no clock of
  its own. Because V4 feeds the same function from a Bluetooth media key instead
  of a button, so V4's tap handling becomes one new caller rather than a second
  implementation. It also makes outlier rejection and the two-second expiry
  testable as arithmetic rather than through a render.

## Contracts

Frozen. `Velocity` and the tempo range already exist; everything below is new.

### `src/features/metronome/lib/tap/tapTempo.ts`

```ts
/** Taps needed before a tempo is set. One bar of 4/4 — what a hand already
 *  does counting a band in. */
export const TAPS_REQUIRED = 4

/** An attempt is abandoned this long after its last tap. Derived, not picked:
 *  the slowest legal interval is 1.5 s at 40 bpm, so the window clears it with
 *  margin. */
export const TAP_TIMEOUT_S = 2

/** An interval this far from the median of the attempt is a fumble, not a beat.
 *  Dropped rather than averaged in, and the attempt still succeeds. */
export const OUTLIER_RATIO = 0.5

export type TapState = {
  /** Tap times in seconds, oldest first. Empty means no attempt in flight. */
  readonly taps: readonly number[]
}

export type TapResult =
  | { kind: 'collecting'; state: TapState }
  /** Four taps landed and the tempo is legal. */
  | { kind: 'tempo'; state: TapState; bpm: number }
  /** Four taps landed and the tempo was outside 40–180 — refused, not clamped. */
  | { kind: 'refused'; state: TapState; bpm: number }

export const EMPTY_TAPS: TapState

/** Pure. `at` is any monotonic seconds value; the caller owns the clock. */
export function addTap(state: TapState, at: number): TapResult

/** Has this attempt been abandoned as of `now`? */
export function hasExpired(state: TapState, now: number): boolean
```

**Why `TapResult` distinguishes `refused` from `collecting`.** The UI needs to
know a legal attempt completed and was rejected, so it can stop waiting and
resume the click — `spec.md`'s decision is that the *tempo* is untouched, not
that nothing happens.

### The transport's third state

`Transport` today is start / stop / setTempo / onBeat. V3 adds a state between
running and stopped, because the click goes quiet on tap 1 and returns on tap 4.

```ts
/** Silences the click but remembers it was running, so it can return at a new
 *  tempo without the player pressing start again. */
suspend(): void
/** Returns at `bpm`, on a fresh bar, only if `suspend` had been called while
 *  running. A no-op otherwise. */
resume(bpm: number): void
```

## Epics

### Epic 1 — tap tempo

#### Track A — the tap module

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/tap/` — `tapTempo.ts` and its test
* **Needs to start:** the contract above. Nothing else.

1. **red** — four taps 0.5 s apart give exactly 120 bpm; three taps give
   `collecting` and no tempo.
2. **green** — collect taps, average the intervals on the fourth.
3. **red** — a fumbled third tap, far off the others, is dropped and the
   attempt still lands on four taps at the tempo the other intervals describe.
4. **green** — reject intervals beyond `OUTLIER_RATIO` of the median.
5. **red** — four taps describing 200 bpm and 30 bpm both come back `refused`,
   carrying the bpm they computed, and never a clamped value.
6. **green** — the range check.
7. **red** — `hasExpired` is false 1.9 s after the last tap and true at 2.1 s,
   and a tap after expiry starts a fresh attempt rather than joining the old one.
8. **green** — the timeout.

#### Track B — the transport's third state

* **Role:** `implementer`
* **Owns:** `src/features/metronome/hooks/useClickTransport.ts` and its test
* **Needs to start:** the `suspend`/`resume` contract.

1. **red** — `suspend` while running silences the click and queues nothing more;
   `resume(bpm)` starts a fresh bar on the accent at the new tempo.
2. **green** — both, on top of the existing scheduler.
3. **red** — `suspend` while already stopped is a no-op, and a later `resume`
   does **not** start the click. Tapping with the click off must not turn it on.
4. **green** — remember whether it was running.
5. **red** — unmounting while suspended leaves nothing running and closes the
   device, like the existing teardown tests.
6. **green** — fold suspend into the same session teardown.

#### Track C — the button and the wiring

* **Role:** `implementer`
* **Owns:** `src/features/metronome/components/` and
  `src/lib/snippets/en/metronome.ts`
* **Needs to start:** both contracts. It calls them; it does not need their
  bodies to exist to be written against.

1. **red** — a Tap control exists, labelled from a snippet, and four clicks at a
   known spacing set the displayed bpm. The test drives timestamps, never a real
   clock.
2. **green** — the control, calling `addTap`.
3. **red** — tapping while running suspends on the first tap and resumes at the
   new tempo on the fourth.
4. **green** — the wiring.
5. **red** — a refused attempt leaves the displayed bpm exactly as it was.
6. **green** — handle `refused`.
7. **red** — the expiry resumes a suspended click without changing the tempo.
8. **green** — the timer, cleared on unmount.

## Waves

* **Wave 1 (parallel):** Track A, Track B
* **Wave 2:** Track C — needs both to exist to wire them, though it is written
  against the frozen contracts

## Checks

* `npm run lint`, `npm test`, `npm run build`

## Risks

| Risk | What holds it |
| :-- | :-- |
| The expiry timer is a real `setTimeout` in a component | Track C owns the timer and clears it on unmount; the tap *logic* takes timestamps, so nothing in Track A's tests waits |
| `suspend`/`resume` grows a third state into the busiest module in the slice | It is two methods on an existing interface, and Track B's step 3 pins the case that would otherwise leak — tapping with the click off must not start it |
| The outlier rule silently mangles a deliberate rubato tap | `OUTLIER_RATIO` is on the contract and asserted directly, so its behaviour is visible rather than emergent. It needs an ear eventually: whether a real fumble is caught and a real intention is not |
| A word added to the UI without a snippet | ADR 0003's guard fails the build; Track C owns the snippet file so there is no cross-track edit |
| V4 has to re-derive the tap logic | The whole reason Track A is pure and takes timestamps. A media key is another caller of `addTap` |
