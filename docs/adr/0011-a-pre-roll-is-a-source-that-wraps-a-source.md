# 0011. A pre-roll is a source that wraps a source

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

V9 puts one bar of clicks in front of a groove. Something has to sound before
the figure does, and three places could own it: the scheduler, the hook that
builds the device, or the `Source` contract itself.

The scheduler is the one piece of this app that has been kept ignorant of what
it is playing. It walks steps, asks a `Source` what sounds, and applies whatever
displacement that source asks for —
[ADR 0007](0007-a-groove-is-humanized-a-click-is-not.md) put `displace` on the
source precisely so a transport could not end up knowing which grooves are
humanized. A pre-roll owned by the scheduler would undo that: the scheduler
would learn that a count-in exists and that claves is its voice.

## Decision

**A pre-roll is a `Source` that wraps a `Source`.**
`createCountInSource(inner, armed)` reports the inner's `id`, `steps` and
`humanize`, sounds the count on the quarters of bar 0, and delegates every step
after it to `inner` at `step - inner.steps`.

Two things follow, and both are part of this decision rather than separate ones.

**`Source` gains `takeStep?(step)`.** The wrapper alone could not keep its
promise. Round-robin take selection never went through the source: `scheduler.ts`
put its own raw step into `Placement` and `audioClock.ts` picked the recording
with it, so a wrapped groove's first bar would have drawn takes for steps 16–31
instead of 0–15 — a rotation of one in three that persists for the whole run.
The source now names the step the device indexes takes on, and the scheduler
forwards it. The scheduler still learns nothing: it asks the source which step
to use, exactly as it already asks how far to displace a hit.

**A flag that moves the timeline latches at Start; a flag that changes the
figure is read live.** V8's `variations` is read per queued step so that
unticking lands inside the lookahead. `countIn` cannot work that way — it
decides where the inner's timeline begins, so a flip mid-bar would shift the
groove against itself. The transport latches it into `countInArmed` immediately
before `scheduler.start()` and nothing else ever writes that field, which is why
the source can still read a getter per step without owning any state.

## Consequences

- The next pre-roll — a gap click, a lead-in bar, a fill before a loop point —
  is a wrapper, and costs no edit to `transport/`.
- Every future `Source` that shifts its own timeline **must** implement
  `takeStep`, or its takes rotate silently. Nothing fails loudly; the groove
  simply draws different recordings. The end-to-end test in
  `useClickTransport.test.tsx` — *draws the same takes with the count-in as
  without it* — is the only thing standing between that bug and a release.
- The click is guaranteed count-in-free structurally rather than by a branch:
  `sourceFor` never wraps `CLICK_SOURCE`. No behavioural test can state this — a
  wrapped four-step click counts four claves and then plays four claves — so it
  is asserted by reference identity, which is a test that reads oddly and is
  load-bearing.
- `Source` is now nine members, three of them optional. That is the cost: the
  interface grew to keep the scheduler small, and the next member added for the
  same reason should prompt the question of whether a source is doing too much.
- Wrapping is not free of edges. The wrapper must delegate `inner.takeStep` as
  well as implement its own, or two wrappers could not compose.

## Alternatives considered

- **The scheduler owns a pre-roll** (`createScheduler({ countInSteps })`) — one
  place owns the timeline, which is a fair argument, and `takeStep` would not
  have been needed because the scheduler already knows both steps. It lost
  because the scheduler would then know what a count-in is and which voice it
  uses, and `scheduler.test.ts` is the most load-bearing test file in the repo.
- **The hook schedules the count itself**, then starts the scheduler a bar
  later. No new source, no contract change — and two independent timing
  authorities, whose disagreement would land exactly on the seam the feature
  exists to make clean.
- **Accept the rotated takes** and narrow what the change promised. Rejected
  because the rotation never resolves: the groove with the box ticked would
  genuinely not be the groove with it unticked, which is the one thing a
  reference track may not do.
