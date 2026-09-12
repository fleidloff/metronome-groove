# V4. Setting the tempo from the speaker — tech spec

**Phase:** settled — `/implement-vibe-with-docs 4`

## Decided

* **A silent looping `<audio>` element owns the media session**, playing
  whenever the click runs. Because Media Session only routes headset buttons to
  a page the browser considers to be playing media, and a bare `AudioContext`
  does not reliably register one — every documented example drives an element.

  **Two consequences that are visible to the player**, and neither is a bug to
  fix later: a media notification appears on the lock screen saying the
  metronome is playing, and the metronome becomes what the phone considers "the
  music", so starting another audio app stops it.

  **Ruled out on the record:** routing the click itself through an `<audio>`
  element. It cannot schedule to sample accuracy, so it would throw away V2's
  lead-in compensation and exact scheduling to buy a metronome that drifts —
  which `docs/persona.md` says is worse than the click it replaced.

## Contracts

### `src/features/metronome/lib/remote/mediaKeys.ts`

The media-key seam. Pure of React, and injectable so a test can fire actions
without a device.

```ts
export type MediaAction = 'play' | 'pause' | 'nexttrack'

export interface MediaKeys {
  /** Registers each handler defensively; an unsupported action is skipped
   *  rather than thrown. Returns a teardown that clears every handler it set. */
  bind(handler: (action: MediaAction, at: number) => void): () => void
  /** Which actions this platform accepted. Read after bind, for the report. */
  readonly supported: readonly MediaAction[]
}

export function createMediaKeys(
  session?: MediaSession,
  now?: () => number,
): MediaKeys
```

### `src/features/metronome/lib/remote/remoteMode.ts`

The mode machine, pure and taking timestamps — the same shape as V3's
`lib/tap/`, and for the same reason.

```ts
export type RemoteMode = 'transport' | 'tapping'

export type RemoteState = {
  readonly mode: RemoteMode
  readonly taps: TapState   // V3's, unchanged
}

export type RemoteEffect =
  | { kind: 'start' } | { kind: 'stop' }
  | { kind: 'cue'; reason: 'entered' | 'left' }
  | { kind: 'tempo'; bpm: number }
  | { kind: 'nothing' }

export const EMPTY_REMOTE: RemoteState

/** Pure. Every decision this feature makes is in here. */
export function onAction(
  state: RemoteState,
  action: MediaAction,
  at: number,
  running: boolean,
): { state: RemoteState; effects: readonly RemoteEffect[] }

/** Two seconds after the last tap, per spec.md — the same window as V3. */
export function onIdle(
  state: RemoteState,
  now: number,
): { state: RemoteState; effects: readonly RemoteEffect[] }
```

**Why `running` is an argument rather than state.** The transport already owns
whether the click is running; duplicating it here would be a second copy to
drift. The machine decides what *should* happen and the caller applies it.

### The cowbell

| | |
| :-- | :-- |
| Ships | `cowbell.flac`, copied byte-identical from the sibling pack |
| Licence | **CC0** (VCSL) — no credit string, unlike any MuldjordKit voice |
| Velocity | its own layer nominal, fed through V2's existing `gainFor` |
| Used for | entering tap mode, and leaving it. Nothing else |

The exact velocity is a musical decision and goes to `musician`, not decided
here. The cue must be audibly *not* the click at practice volume, which is the
whole point of choosing a different instrument.

## Epics

### Epic 0 — the probe

**Runs first, alone, and gates everything below.** No other track starts until
it has reported, because its answer decides whether Epic 1 has a tapping half
at all.

#### Track P — the diagnostic page

* **Role:** `implementer`
* **Owns:** `public/v4-probe.html`
* **Needs to start:** nothing

One self-contained HTML file — inline style, inline script, no imports, no
build step, outside `src/` so no lint zone binds it. It renders a log and
almost nothing else.

1. Register `play`, `pause`, `nexttrack`, `previoustrack` and `stop` handlers,
   each in its own `try`/`catch`, and print which ones the platform accepted.
2. Run with an `AudioContext` only, then with a silent looping `<audio>`, and
   report which combination actually receives a button press. **This is the
   documented uncertainty from `spec.md`** — settle it by observation.
3. Log every action that arrives with `performance.now()`, the gap in
   milliseconds since the previous one, and the bpm that gap implies.
4. Show the last dozen events at a size readable on a phone across a room,
   because the phone is in your hand and the speaker is what you are pressing.

**There is no test for this file and there should not be.** It asserts nothing;
it reports what hardware did. The build's checks do not cover it and the suite
never loads it.

**Done when:** a person has run it on a phone paired to a speaker, pressed the
button in the four shapes `spec.md` names, and written the numbers into
`spec.md` under `## What the probe found`.

### Epic 1 — the speaker as a remote

**Gated on Epic 0.** If the probe says per-beat tapping does not survive, Tracks
A, C and D shrink: no tap delegation, no mode machine, no cowbell — Track B
alone, plus play/pause wiring, and an ADR recording the finding.

#### Track A — the mode machine

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/remote/remoteMode.ts` and its test
* **Needs to start:** the contract, plus V3's `lib/tap/`

1. **red** — `play` while stopped yields `start`; `pause` while running yields
   `stop`; neither touches the mode.
2. **green** — the transport branch.
3. **red** — `nexttrack` yields `cue: entered` and moves to `tapping`.
4. **green** — the mode switch.
5. **red** — in `tapping`, four actions of *either* kind are four taps, and the
   fourth yields `tempo`. A single press in tap mode is a tap, never a start.
6. **green** — delegate to `addTap`.
7. **red** — `onIdle` two seconds after the last tap yields `cue: left` and
   returns to `transport` with the tempo untouched; a lone tap sets nothing.
8. **green** — the expiry.
9. **red** — a refused tempo still leaves tap mode and still cues, so the player
   is never stranded in a mode by tapping something out of range.
10. **green** — handle `refused`.

#### Track B — media keys and the silent element

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/remote/mediaKeys.ts`,
  `src/features/metronome/lib/remote/silentMedia.ts`, their tests, and the
  silent asset under `public/`
* **Needs to start:** the `MediaKeys` contract

1. **red** — `bind` registers `play`, `pause` and `nexttrack` against a fake
   `MediaSession`, and returns a teardown that clears all three.
2. **green** — the binding.
3. **red** — an action whose registration throws is skipped, the rest still
   bind, and `supported` reports honestly.
4. **green** — the `try`/`catch` per action, per the platform guidance.
5. **red** — the silent element plays on start and pauses on stop, and its
   teardown releases it.
6. **green** — the element.

#### Track C — the cowbell

* **Role:** `musician`, then `implementer`
* **Owns:** `public/samples/cowbell.flac`, its provenance row, and the cue's
  velocity constant
* **Needs to start:** nothing

The `musician` decides the cue's velocity against `docs/music.md` and states
what a listener should hear; the `implementer` applies it. It must be audible
over the click at practice volume without being startling.

#### Track D — wiring

* **Role:** `implementer`
* **Owns:** `src/features/metronome/hooks/useRemoteControl.ts` and its test
* **Needs to start:** all three contracts

1. **red** — actions drive the machine and the effects reach the transport;
   unmount tears down every handler and the silent element.
2. **green** — the hook.

## Waves

* **Wave 0:** Track P, alone. **Stop here and report.** The probe's answer is
  the user's to read before anything else is dispatched.
* **Wave 1 (parallel):** Track A, Track B, Track C — scope depends on Wave 0
* **Wave 2:** Track D — needs all three

## Checks

* `npm run lint`, `npm test`, `npm run build`
* **And a person with a Bluetooth speaker**, which is the only thing that can
  settle `## Done when` 5.

## Risks

| Risk | What holds it |
| :-- | :-- |
| **Per-beat tapping is eaten by the firmware** | **Epic 0 answers this before anything is built.** It stopped being a risk the moment it became the first thing the change does; if the answer is no, V4 ships play/stop only and Epic 1 shrinks rather than being rewritten |
| The probe itself is wrong, and we build on a bad reading | It reports raw numbers — action names and millisecond gaps — rather than a verdict. A reader can disagree with the conclusion while trusting the log |
| A double press may not produce `nexttrack` on every device | `supported` reports what bound; the hardware check covers what actually fires. If nothing arrives, the mode is unreachable and that is the finding |
| The lock-screen notification surprises the player | Named in `## Decided` as a consequence, not a defect. Worth a look during the hardware check |
| Another audio app stops the metronome | Same — inherent to owning a media session |
| The silent element is throttled or paused by the OS | The click is Web Audio and unaffected; only the buttons would stop working. V2's stall fix already covers the scheduler under throttling |
| A second voice breaks the velocity model | V2's `gainFor` is layer-relative precisely so a second voice needs no new maths. Track C proves it with a real second nominal |
| No test can settle the feature | Stated. Tracks A and B are fully testable; the hardware check is the gate, and its result goes in the record either way |
