# V3. Tap tempo

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ✅ shipped 2026-09-12 — see [features.md](../features.md)

## What

* "let's add a tap tempo button"
* "I want to tap the tempo with externally connected bluetooth speakers"
* "Can we intercept the play / pause bluetooth signals first of all for play /
  stop"
* "when you click the play button on external bluetooth speaker twice in a row,
  we go into tap tempo mode and interpret the taps on there as tap tempo"
* "Effectively letting me set the tempo on bluetooth speaker without touching my
  phone"

**Why this is the right next change regardless of how it is built.** Tap tempo
is the debt V2 recorded. `docs/persona.md`: *"Tap tempo is not a nice-to-have.
It is how an ear-trained player states a tempo."* And Sam, asked during V2: the
slider *"costs me the reason I opened the tab about half the time… I heard a
thing and want to sit in it, not calculate it."*

The Bluetooth half serves a second persona line directly — *"A screen they have
to hold. Their hands are on an instrument and the phone is propped up two metres
away."* Setting a tempo without reaching for the phone is exactly that problem.

## The Bluetooth half — deferred to V4, research kept here

Two things were checked rather than assumed, because both change what can be
built.

### 1. A double-press is eaten by the speaker, not delivered to us

**Double-pressing the play button is standard AVRCP "next track".** The device
firmware decides this, before any signal reaches the phone, the browser or us:
one press is play/pause, two is next track, three is previous track.

So the design as described — "click play twice in a row, we see two plays" —
**cannot work**: the browser never receives two `play` actions. What it may
receive is a `nexttrack` action, which is a perfectly good signal to use, just a
different one.

### 2. Tapping a *tempo* on that button is worse than it looks

The same firmware coalescing applies to every rapid press. A multi-press window
is typically around half a second, and a musical tap interval is:

| Tempo | Tap every |
| :-- | :-- |
| 40 bpm | 1.50 s |
| 120 bpm | 0.50 s |
| 180 bpm | 0.33 s |

**Tapping a beat at any normal tempo lands inside the window the firmware reads
as next/previous track.** At 120 bpm the taps are exactly at the boundary. So
tap-per-beat on a Bluetooth button is not a thing that can be made reliable by
writing better code.

**One tap per bar is the way out.** At 4/4 the interval becomes 6.0 s at 40 bpm
and 1.33 s at 180 bpm — comfortably outside any multi-press window across the
whole range. It also matches how a player counts a band in.

### 3. Media Session needs the browser to believe we are playing media

`navigator.mediaSession.setActionHandler` only receives media keys when the
browser considers the page to be playing media, and that generally means an
`<audio>` or `<video>` element — a bare `AudioContext`, which is what the click
is, does not reliably register. So Bluetooth control likely needs a silent
audio element playing alongside the Web Audio click, purely to own the media
session.

## Done when

1. **Any two or more taps set the tempo**, from the average of their intervals,
   and **the slider moves with it** — the tapped tempo and the slider are one
   value, so nudging the slider after a tap carries on from what was tapped
   rather than from where the slider was left. There is no tap count to reach.
2. **A tap wildly out of line with the others is dropped** rather than averaged
   in, whenever there are enough taps to tell — three or more. An attempt is
   never thrown away.
3. **A tapped tempo outside 40–180 bpm is refused** and the previous tempo
   stands — nothing is clamped, and nothing silently changes.
4. **Tapping while the click runs silences it from the first tap**, and two
   beats *of the tapped tempo* after the last tap it returns at the new tempo,
   on its own, starting a fresh bar on the accent. Before there is a tapped
   tempo to measure — after a single tap — the window is two seconds.
5. **Tapping while the click is stopped sets the tempo and leaves it stopped**,
   and a single tap sets nothing while still returning the click as it was.

## Decided

Settled elsewhere and not re-asked:

* **The slice is `src/features/metronome/`**, reached only through its
  `index.ts` — [ADR 0001](../../docs/adr/0001-enforced-import-graph.md).
* **Every user-facing word is a snippet** — [ADR 0003](../../docs/adr/0003-snippets.md),
  and changing one must never fail a test.
* **Time comes from an injected clock**; no test sleeps.

And decided in this conversation:

* **Split in two. V3 is the on-screen tap tempo button; the Bluetooth control
  becomes V4.** Because the two halves carry very different risk: a button is a
  known quantity, and Bluetooth depends on device firmware that cannot be tested
  in CI and — per the research above — does not behave the way the feature was
  first described. `/vibe-with-docs` §7's real test is uncertainty rather than
  size, and all of the uncertainty is on the Bluetooth side.

  **The research below stays in this folder** rather than moving to V4's, because
  it is what justified the split. V4's spec will point at it.

* ~~**Four taps set a tempo.**~~ **Superseded after using it — there is no tap
  count at all.** *"4-tap wait feels weird. Let's still stop metronome while
  tapping, after 2s no tap, we take the bpm and start again (unless the
  metronome was stopped anyway). no 4 tap hard cut."*

  **Tap as many times as you like; the silence ends it.** Two seconds after the
  last tap, whatever you tapped becomes the tempo and the click returns.

  Sam predicted the original would feel broken on day one — *"three intervals of
  waiting… will feel like the button is broken. I'd live with it."* It was built
  as specced, used, and it did. The hard cut was the problem rather than the
  wait: a fixed count makes the app decide when you are finished, and four taps
  is both too long for someone sure of the tempo and too short for someone
  feeling for it.

  **What this buys beyond feel.** More taps now mean a *better* answer instead
  of a discarded one — eight taps average seven intervals. And the interaction
  has one rule rather than two, because the two-second silence already ended an
  attempt; it now ends every attempt, successfully.

  **What it costs, stated plainly.** Two taps is a legal tempo, and two taps is
  one interval with no outlier protection possible — a median of one number is
  that number. A fumbled double-tap can set a wild tempo, and the only thing
  standing behind it is the 40–180 refusal. Tap three times and the protection
  is back.

* **A tap wildly out of line with the others is dropped; an attempt is never
  thrown away.** Because the only way a player learns an attempt failed is by
  looking at the phone, and their eyes are on the fretboard or shut — so silence
  where a tempo was expected reads as a broken app, and a redo is a small grade.

* **A tapped tempo outside 40–180 is refused, not clamped.** The old tempo
  stands. Because clamping returns a tempo the player did not tap with nothing
  to explain it, which is undiagnosable from the instrument; refusing leaves the
  click audibly unchanged, and that *is* the feedback. The 200 bpm case is
  self-correcting — a player realises they tapped eighths — and the 30 bpm case
  sends them to the slider, which is still there.

* **The click goes quiet on the first tap and returns at the new tempo when the
  tapping stops.** *(Originally "on the fourth" — there is no tap count; see the
  superseded bullet above.)* Because `docs/persona.md` now says they work entirely by ear once it
  is playing, and two tempos in that one channel is the thing that cannot work:
  a click you can hear is a click your hand follows, so tapping against the old
  tempo lands you between the two.

  **This is the one decision here that adds a state**, rather than tuning a
  number: the transport gains a third condition between running and stopped.
  It returns on its own — pressing start again would be a second action, against
  "a sound in one tap".

* **Two beats of silence commits the tempo** — two beats *at what is being
  tapped*, not a fixed two seconds. *"I don't want to wait 2 seconds of pause
  after tapping tempo but instead 2 beats length in new tempo (whatever the
  average is while tapping)."*

  The window is therefore 1.0 s at 120 bpm, 0.67 s at 180, and 3.0 s at 40 —
  snappy where a fixed two seconds dragged, and patient where it would have cut
  a slow tune off.

  **The first tap is the case that needs care**, because there is no interval
  yet and so nothing to scale by. It waits **two seconds** — *"when there is
  only 1 tap, we can use 2secs as fallback"*. That clears the slowest legal tap
  gap, 1.5 s at 40 bpm, with margin; and since one tap commits nothing, all this
  window decides is how long a stray press holds the click quiet.

  **A limit that falls out of this, worth knowing rather than discovering.** A
  second tap slower than 2 s always restarts the attempt, so **no tempo below
  30 bpm can be tapped in at all** — it is not refused, it simply never
  assembles. 30 bpm is legal to tap only because `hasExpired` uses a strict
  `>`, landing exactly on the boundary. Nothing below 40 is a legal tempo
  anyway, so this costs nothing today; it would matter the moment the range
  widened downwards.

  Scaling that first window by the *slider's current* tempo was rejected, and
  the reason is the same one that killed a tempo-scaled window earlier in this
  spec: tap a 40 bpm tune while the slider sits at 180 and the window is 0.67 s,
  your second tap lands at 1.5 s, and the attempt restarts forever. Being
  generous until there is evidence has no such failure.

  The click restarts **only if it was running when tapping began**: tapping with
  the click off sets the tempo and leaves it off. A single tap sets nothing,
  because one tap is no interval — the click still returns, unchanged, so a
  stray press is never a way to get stranded silent.

  Two seconds because it is **derived rather than picked**: the slowest legal
  tap interval is 1.5 s at 40 bpm, so the window has to clear that with margin,
  and anything much longer leaves the click silent while the player has already
  moved on. A window that scaled with the current tempo was rejected for the
  case that breaks it — someone tapping a slow tune into a fast setting would
  have 333 ms at 180 bpm and never land a second tap.

## Sam's verdict

Asked directly, with `docs/persona.md` in front of it. Quotes verified against
the file — note that it was edited during this session and now says things it
did not when V2 was specced.

* **Four taps, not two.** *"It's what my hand already does — I count a band in
  '1, 2, 3, 4'… Two taps is fast in a way I didn't ask for: it means the very
  first pair I fumble becomes the tempo."* And the reason that matters more
  than taste: *"If the click jumps to a wrong tempo while my hand is still
  going, that wrong click pulls my hand and now the remaining taps are worse
  than the first two."* Sam accepts the cost: on day one the wait *"will feel
  like the button is broken. I'd live with it. I'd rather wait a bar than undo a
  bpm."*

* **Drop a wild tap; never make them start again.** *"Throwing the attempt away
  is the worst of the three by a distance, because the only way I find out it
  failed is by looking at the phone, and my eyes are shut or on the fretboard.
  Silence where I expected a tempo reads as 'the app is broken'."* Ties to
  *"Being graded… a failed attempt I have to redo is a small grade."*

* **Refuse an out-of-range tempo rather than clamping it.** *"Silent clamping is
  the one that would genuinely confuse me. I tap a ballad, I get back something
  faster than what I tapped, and nothing tells me why."* Refusing leaves the old
  tempo audibly unchanged, which is itself the feedback. Sam notes the 200 bpm
  case is self-correcting — *"I'd realise I was tapping eighths and tap half as
  fast"* — and the 30 bpm case sends them to the slider, which is a fair outcome.

* **The click goes quiet while you tap.** Put to the user, who agreed — see
  `## Decided`.

## A line in persona.md that arrived after V2 shipped

> "To work entirely by ear once it is playing. Where the bar starts, where the
> backbeat is, whether they have slipped — they expect to hear all of it. **They
> are not going to check.**"

> "A screen they have to watch… A bar they can only follow by looking is a bar
> they will lose."

This is not a V3 requirement, and it is recorded here because it re-reads V2's
four-dot indicator. The dots are **supplementary**, not the bar: what carries
the bar is the audible accent on beat 1. Nothing to change today — but a future
change that leans on the dots to convey something the ear cannot get is a change
the persona has already ruled out.

## Open

* Nothing. The spec is settled — next phase is `tech-spec.md`.

## Not in this change

* **The Bluetooth control — that is V4**, and the research above is what it
  starts from. Nothing here should make that harder: the tap logic is a module
  that takes timestamps, so V4 feeds it from a media key instead of a button.
* **Tapping per bar rather than per beat.** V3 taps beats. Per-bar tapping is
  the thing that makes V4 possible at all, and it is V4's decision to make.
* Any change to the slider, which stays exactly as it is and remains the way to
  reach a tempo outside what you can tap.
