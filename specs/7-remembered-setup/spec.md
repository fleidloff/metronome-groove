# V7. Remembered setup

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 7`

## What

* "store selected values (bpm, groove) in localStorage, so that it is
  remembered on next start"
* "initial bpm shall be 100 instead of 120"

**This is the candidate `features.md` has carried since V2**, in the persona's
own words: *"Coming back tomorrow costs nothing and starts where they
stopped."* And the constraint that comes with it: *"No account, and nothing to
lose. The setup lives in the browser."*

## What the tree already has

| | |
| :-- | :-- |
| The two values | `bpm` and `source` — `SourceId` is `'click' \| 'straight-funk'` |
| Where they live | `useState` in `components/Metronome.tsx`, lost on reload |
| Today's default | `DEFAULT_BPM = 120`, to become 100 |
| localStorage today | **nothing touches it** — this change introduces the first use |

## Settled by V4, not by this conversation

**"Starts where they stopped" cannot mean the click is already playing.**
[ADR 0004](../../docs/adr/0004-bluetooth-media-buttons.md) records what V4
measured: a browser refuses to let a page that has not been interacted with play
anything, and refuses with `NotAllowedError`. So a remembered *running* state
could not be honoured even if we wanted it — the page would claim to be playing
and be silent.

So this change remembers **what is set up**, never **what is running**. That is
a constraint rather than a decision, and it is recorded here so nobody spends a
question on it later.

## Found on reload, after the tests were green

> *"When I reload the page, settings were persisted just fine. The groove is
> also selected. But when I press play, it would still play the click instead of
> the funk (what also the select box says)."*

**The state was restored and the transport was never told.** `changeSource`
called `click.select?.(next)`, and a restore goes *around* the handlers — so the
select box said straight-funk and the transport was still on its default.

**It is the same defect as the tempo one, found twice in one change.** The tech
spec had already been corrected mid-build for claiming both tempo writers shared
a path; this is that lesson again, one field over. The rule it produces:

> **A handler is not the seam.** Anything the component must tell an external
> system belongs in an effect keyed on the value, because restoring, and any
> future writer, goes around handlers by definition.

The tempo escaped only by luck — `toggle` passes the current bpm into
`click.start(bpm)`, so the transport is told at the moment it matters. The
source had no such path.

Fixed with an effect on `[restored, source]`, guarded by what the transport has
already been told so a first visit still fetches nothing it was not asked for.

**Signed off on reload, 2026-09-12** — *"perfect, works now"*.

## Done when

1. **The tempo and the groove survive a reload** — in the controls *and* in
   what actually plays. Set both, reload, press start, and you hear the groove
   you picked. No click running before that press, which V4's finding makes
   impossible anyway.
2. **A first-ever visit opens at 100 bpm** and the click, with nothing stored.
3. **Each stored value is validated on its own and falls back silently** — a
   bpm outside 40–180 becomes 100, an unknown groove becomes the click, and a
   good value beside a bad one survives. Nothing is said to the player.
4. **A write happens on every change**, so what is on screen and what is stored
   never disagree for longer than a render.
5. **Storage being unavailable breaks nothing.** Private mode, a full quota or a
   browser that refuses leaves the app working exactly as it does today, with
   every value at its default.

## Decided

Settled elsewhere and not re-asked:

* **The slice is reached through its `index.ts`**, and storage belongs behind a
  seam rather than in a component —
  [coding-guidelines.md](../../docs/coding-guidelines.md#anti-patterns-and-their-fixes)
  is explicit that a component may *use* storage and may not build the thing
  that touches it.
* **Every user-facing word is a snippet** — [ADR 0003](../../docs/adr/0003-snippets.md).
* **No account, ever.** The persona counts a sign-up as setup before sound.

And decided in this conversation:

* **Each stored value is validated on its own, and a bad one falls back
  silently.** A bpm outside 40–180 becomes 100; an unknown groove becomes the
  click; a good value sitting beside a bad one still survives.

  **Per value rather than all-or-nothing**, because the failure this protects
  against is a release renaming a groove — and throwing the whole setup away
  then forgets the tempo too, which is the thing the player actually cared about
  remembering.

  **Silently**, because `docs/persona.md` requires the app to open straight into
  sound: *"Setup before sound… a tutorial, a kit to assemble before the first
  bar plays"* is on the list of things that lose Sam. A line about storage is
  setup before sound, for an event the player can do nothing about.

* **Written on every change, immediately.** Move the slider or pick a groove and
  it is stored.

  Because the tab dies however it likes. `docs/persona.md` has the phone
  *"propped up two metres away"*, and a phone reclaims a backgrounded tab
  without firing anything reliable — so a write deferred to `pagehide` or
  `visibilitychange` loses exactly the case this feature exists for. Writing
  immediately makes a killed tab, a crashed browser and a deliberately closed
  one behave identically.

  A debounce was rejected for the same reason: the window where the screen and
  the storage disagree is precisely when a backgrounded tab gets killed.

  The cost is a handful of small writes during a slider drag, which is cheap
  enough not to matter — and if it ever does, the fix is in one module.

## Open

* Nothing. The spec is settled — next phase is `tech-spec.md`.
