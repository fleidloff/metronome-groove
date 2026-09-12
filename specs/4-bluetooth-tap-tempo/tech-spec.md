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

The probe cut this down to one seam. `remoteMode.ts`, the cowbell and the tap
delegation are all gone — not deferred, **deleted**, because the thing they
served cannot work on this hardware.

### `src/features/metronome/lib/remote/mediaKeys.ts`

```ts
/** The only action the hardware actually delivers. With `playbackState` left
 *  at 'playing', the system believes the page is playing and sends `pause` on
 *  every press — one signal, every time, rather than an alternation to track. */
export type MediaAction = 'pause'

export interface MediaKeysOptions {
  /** Injected so a test can drive this without a device. */
  session?: MediaSession
  /** The silent media that makes the browser believe we are playing. */
  media?: HTMLAudioElement
}

/**
 * Binds the speaker's button. Returns a teardown that releases everything it
 * took — the handler, the metadata and the media element.
 *
 * Registers defensively: a platform that refuses the action degrades rather
 * than throwing, and a browser that gives us nothing (Firefox) leaves the rest
 * of the app working exactly as before.
 */
export function bindMediaKeys(
  onPress: () => void,
  options?: MediaKeysOptions,
): () => void

```

**`isSupported` was specced here and deleted rather than built.** It could only
answer the question by calling `setActionHandler(ACTION, null)` — which in
Chrome unbinds a live handler. A predicate that breaks what it inspects is worse
than not knowing.

### `src/features/metronome/lib/remote/silentMedia.ts`

```ts
/** Eight seconds of digital silence as a data URI. Eight because a media
 *  notification is only shown for media longer than five; digital zeros
 *  because the probe showed that is enough on Chrome. */
export const SILENT_WAV: string

/** Undefined where there is no document — a server render has nothing to claim
 *  a session with, and the caller returns a no-op teardown. */
export function createSilentMedia(): HTMLAudioElement | undefined
```

### `src/features/metronome/hooks/useRemoteControl.ts`

```ts
/** `armed` is the gesture gate. Nothing binds and nothing plays until it is
 *  true, because a browser refuses to let an untouched page play and the media
 *  session is then never claimed at all. The composer sets it on the first
 *  on-screen press. */
export function useRemoteControl(
  onPress: () => void,
  options?: MediaKeysOptions & { armed?: boolean },
): void
```

## Epics

### Epic 1 — the speaker starts and stops the click

One track. The probe removed the other three, so per
`/implement-vibe-with-docs` §4 this builds in the lead rather than being
dispatched.

#### Track A — the media key seam and its wiring

* **Role:** `implementer`
* **Owns:** `src/features/metronome/lib/remote/`,
  `src/features/metronome/hooks/useRemoteControl.ts`, and the one line in
  `components/Metronome.tsx` that calls the hook

1. **red** — `bindMediaKeys` registers a `pause` handler against a fake
   `MediaSession` and its teardown clears it.
2. **green** — the binding.
3. **red** — a session that throws on registration is survived: no throw
   escapes, `isSupported` reports false, teardown is still safe to call. This is
   the Firefox path and it must be silent, not broken.
4. **green** — the `try`/`catch`.
5. **red** — pressing the button calls `onPress` once per press.
6. **green** — the handler.
7. **red** — the silent media is eight seconds, plays on bind and is released on
   teardown.
8. **green** — `silentMedia.ts`.
9. **red** — the hook toggles the transport: press once starts, press again
   stops; unmounting unbinds and releases the media.
10. **green** — the hook.

**Not in this change, and the reason is on the record:** `nexttrack`, the mode
machine, the cowbell, any tap delegation. See `spec.md` § *What V4 is now*.

## Checks

* `npm run lint`, `npm test`, `npm run build`
* **And a person with a Bluetooth speaker**, which is the only thing that can
  settle `## Done when` 5.

## Risks

| Risk | What holds it |
| :-- | :-- |
| ~~Per-beat tapping is eaten by the firmware~~ | **Confirmed by the probe.** No longer a risk; it is a deleted feature |
| Firefox users see a feature that silently does nothing | By design, and `## Done when` 3 pins it: the app must behave exactly as before when the session is refused. There is no message, because there is nothing the player can do about it |
| The probe itself is wrong, and we build on a bad reading | It reports raw numbers — action names and millisecond gaps — rather than a verdict. A reader can disagree with the conclusion while trusting the log |
| A double press may not produce `nexttrack` on every device | `supported` reports what bound; the hardware check covers what actually fires. If nothing arrives, the mode is unreachable and that is the finding |
| The lock-screen notification surprises the player | Named in `## Decided` as a consequence, not a defect — and now confirmed to be the price of the feature working at all |
| Another audio app stops the metronome | Same — inherent to owning a media session |
| The silent element is throttled or paused by the OS | The click is Web Audio and unaffected; only the buttons would stop working. V2's stall fix already covers the scheduler under throttling |
| A second voice breaks the velocity model | V2's `gainFor` is layer-relative precisely so a second voice needs no new maths. Track C proves it with a real second nominal |
| No test can settle the feature | Stated. Tracks A and B are fully testable; the hardware check is the gate, and its result goes in the record either way |
