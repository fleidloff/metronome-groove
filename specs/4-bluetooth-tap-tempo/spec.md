# V4. Setting the tempo from the speaker

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 4`

## What

* "I want to tap the tempo with externally connected bluetooth speakers"
* "Can we intercept the play / pause bluetooth signals first of all for play /
  stop"
* "go into tap tempo mode and interpret the taps on there as tap tempo"
* "Effectively letting me set the tempo on bluetooth speaker without touching my
  phone"

**Why this is worth the trouble.** `docs/persona.md`: *"A screen they have to
watch. Their hands are on an instrument and their eyes are on the fretboard or
shut."* And *"A sound in one tap. Open the page, hit play, hands back on the
guitar."* Reaching for a propped-up phone to change tempo is the friction this
removes.

## What V3 already established

[V3's spec](../3-tap-tempo/spec.md) holds the research that split this off, and
it is the starting point rather than something to re-derive:

* **A double-press is eaten by the speaker.** Standard AVRCP: one press is
  play/pause, two is **next track**, three is previous. The firmware decides
  before anything reaches the browser, so the original design — "we see two
  plays" — cannot happen. `nexttrack` is the signal a double-press actually
  produces, and it is a perfectly good one to use.
* **Tapping a beat on that button *may* be unreliable — this change tests it.**
  At 120 bpm taps are 0.5 s apart, and vendor documentation puts the multi-press
  window in roughly that region. That is a prediction from documentation, not a
  measurement of the speaker in this room, and V4 exists partly to settle it.
* **Media Session needs the browser to believe we are playing media**, which
  generally means an `<audio>` or `<video>` element. A bare `AudioContext` —
  which is what the click is — does not reliably register one.

Checked again for this spec: **headset buttons do reach `setActionHandler`**,
and the documentation recommends wrapping each registration in `try`/`catch`
because an action may be unsupported on a given platform.

## The problem this change has to solve, and it is not the plumbing

**The player is not looking at the phone.** That is the whole point of the
feature, and it is also what makes it hard:

> "To work entirely by ear once it is playing. Where the bar starts, where the
> backbeat is, whether they have slipped — they expect to hear all of it. **They
> are not going to check.**"

So every state this feature has must be **audible**. If pressing a button twice
puts the app into a mode, and the only evidence is on a screen two metres away,
then the player does not know which mode they are in — and the next press does
something they did not intend. A mode you cannot hear is worse than no mode.

## The probe, before anything is built

**V4 does not start with code. It starts with a measurement**, because the one
thing that decides this feature's shape cannot be reasoned out from
documentation — it is a property of the speaker in the room.

This came out of V3, which was re-specified twice *after* it was built, each
time because using it taught us something the spec had guessed at. That is a
fine way to learn and an expensive way to build. Here the uncertainty is known
in advance, so it gets answered first.

### What the probe is

**Not a `/prototype`.** That skill draws screens, and says in as many words:
no audio, fake data, nothing that touches the real thing. This is the opposite —
its entire value is real audio, a real speaker and real firmware. It is a
diagnostic page, and it renders almost nothing.

One self-contained HTML file at **`public/v4-probe.html`**, so `npm run dev`
served it at `/v4-probe.html` with a real origin. Outside `src/`, so no lint
zone bound it and it never entered the app bundle.

**It was deleted once it had reported**, at the user's request — *"please also
remove the v4-probe.html. not needed anymore."* It was never committed, so it is
gone rather than recoverable. What survives is what matters: the measurements,
in [ADR 0004](../../docs/adr/0004-bluetooth-media-buttons.md), and enough of the
method in `tech-spec.md` § *Track P* to build another one. A later change that
wants to measure `nexttrack` starts from that description rather than from this
file.

### What it has to answer

| Question | How the probe answers it |
| :-- | :-- |
| Does a media session exist at all without an `<audio>` element? | Registers handlers with only an `AudioContext` running, and reports whether anything arrives |
| Does the silent-element trick work? | Same again with a silent loop playing, for comparison |
| Which actions does this platform accept? | Logs the result of every `setActionHandler` call, including the ones that throw |
| **What does a double press actually send?** | Logs every action as it arrives. `nexttrack` confirms the research; two `play`s would disprove it |
| **What is this speaker's real multi-press window?** | Logs the millisecond gap between consecutive actions, so tapping steadily shows where the firmware starts swallowing presses |
| Can a tempo be tapped at all? | Shows the running bpm implied by the gaps, so you can see it hold or collapse |

### How it is run, because this part is fiddly

1. `npm run dev -- --hostname 0.0.0.0`, so the phone can reach it.
2. Open `http://<laptop-ip>:3000/v4-probe.html` on the **phone**, paired to the
   speaker. A laptop with no Bluetooth speaker tests nothing.
3. Press play once. Press it twice quickly. Then tap a steady 120 and a steady
   60, and read the gaps.

### What is done with the result

**The findings go into this file**, under a `## What the probe found` heading,
with the numbers. Then either the build proceeds as specced, or the fallback
above is taken and an ADR records why. **Either outcome is the probe
succeeding** — it is a question being answered, not a step that can fail.

## What the probe found

### Run 1 — Firefox, digital silence: the page never claimed the session

> *"does not work on firefox. pressing play just opens spotify."*

Spotify taking the button is the tell: the press reached the OS and was routed
to whichever app owned the media session, and it was not us.

**The documented cause, found after the fact.** Firefox will not dispatch media
keys for media it considers *inaudible*, and it decides that by reading the
samples — there is a pref for it,
`dom.media.silence_duration_for_audibility`. Chrome accepts digital zeros;
Firefox does not. Separately, a media notification is only shown for media
**longer than five seconds**, and the probe's first silent file was one second.

So run 1 tested two defects at once and cannot separate them. Both are fixed:
the generated file is now **eight seconds**, and the probe offers a **ladder**
rather than a single silent element.

### The ladder, and why it is shaped this way

| Mode | What plays | What it proves |
| :-- | :-- | :-- |
| 1 · Context only | An `AudioContext`, nothing else | Whether Web Audio alone can own a session. The app's click is exactly this |
| 2 · Digital silence | 8 s of zeros, looping | The documented Chrome-works / Firefox-does-not case |
| 3 · Near-silent | 60 Hz at **−81 dBFS** | Whether audibility is judged from the *samples* or merely from `volume` and `muted` |
| 4 · Quiet tone | 220 Hz at **−26 dBFS**, plainly audible | Proves the mechanism works at all, and sets the price if it is the only mode that does |

**The lowest mode that responds is the answer** — it is the least this app must
do to own the buttons.

### What each outcome costs V4

* **Mode 1 works** — free. The click already runs an `AudioContext`.
* **Mode 2 or 3 works** — cheap. A silent or inaudible loop runs beside the
  click. This is the shape `tech-spec.md` already assumes.
* **Only mode 4 works** — **expensive, and a product problem rather than a
  technical one.** Owning the buttons would cost a permanently audible tone
  under a metronome. `docs/persona.md` is unambiguous that a sound Sam did not
  ask for is a reason to close the tab. If this is the finding, V4 is probably
  Chrome-only, or it does not ship.
* **Nothing works in Firefox at any level** — record it and decide whether V4 is
  worth building for Chrome alone. That is a scope question, not a bug.

### Run 2 — the ladder, answered

> *"It doesn't work for firefox, only with the quiet tone (which is way too
> loud). That means we will build the feature for chrome only with 'digital
> silence'."*

**Firefox is out, and not by a small margin.** Modes 1, 2 and 3 gave it nothing;
only mode 4 — a plainly audible 220 Hz tone at −26 dBFS — claimed the session.
So on Firefox, owning the buttons costs a permanent audible tone under the
metronome, which `docs/persona.md` rules out in as many words: a sound the
player did not ask for is a reason to close the tab.

That settles the outcome the spec had already named as the expensive one. **It
is not a bug to fix and not a fallback to build** — no browser switch, no
degraded mode. On Firefox the feature simply is not there.

**On Chrome, digital silence is enough** — mode 2. That is the cheap outcome,
and it is what ships.

> *"The box firmware interprets fast taps by it's own."*

**Tap tempo over Bluetooth is dead, confirmed on hardware rather than inferred
from Sony's documentation.** V3's research predicted it; the probe proved it on
the speaker in the room.

## What V4 is now

Everything below this line was written before the probe. The probe cut it down,
which is what a probe is for.

* **Start and stop from the speaker. That is the whole feature.**
* **Tap tempo is removed**, not deferred — the firmware eats fast presses and no
  code changes that.
* **`nexttrack` is deferred**, not removed: *"Later, we will also use the
  'nexttrack' event from the speaker, but not in here."* No mode machine, no
  cowbell, no second sample in this change.
* **Chrome only**, by consequence rather than by choice.

## Signed off on hardware — 2026-09-12

> *"error is gone and it works now."*

Chrome, a phone, a paired speaker. The button starts and stops the click.

**What the sign-off had to be careful about**, and nearly was not: the failure
this change shipped with was invisible *after* the first press of Start. The
page bound its media session on mount, which needs a user gesture the page has
not had, so Chrome refused with `NotAllowedError` — the session was never
claimed and the button did nothing. Testing after pressing Start would have
looked like success. **A cold load is the only test that finds it**, and the
arming behaviour now has a test that fails if anyone moves the binding back to
mount.

### The gap the sign-off leaves open

**Nothing tells the player they have to press Start once before the speaker
works.** They will press the speaker's button on a fresh page, nothing will
happen, and there is no way to find out why from across the room.

Out of scope here by decision — *"Please add this notification as a candidate
feature. We will not do more with this ticket."* It is in
[features.md](../features.md) as a candidate.

## Done when

1. **A press on the speaker's button starts the click, and the next press stops
   it** — through Media Session's `pause` action, which is the one the hardware
   actually delivers.
2. **A silent `<audio>` element owns the media session** from the first
   on-screen press until the page closes — not from mount, because a browser
   will not let an untouched page play — and is torn down with it. Digital silence, because the probe showed that is
   enough on Chrome.
3. **Every handler is registered defensively**, so a platform that refuses an
   action degrades instead of throwing — and a browser that gives us nothing,
   like Firefox, leaves the rest of the app working exactly as before.
4. **Nothing about the on-screen app changes.** The same controls, the same
   tests, the same behaviour with no speaker attached.
5. **The probe's findings are an ADR**, so the next person to propose tapping a
   tempo on a Bluetooth button finds the measurement rather than repeating it.

## Decided

Settled elsewhere and not re-asked:

* **The tap logic is `lib/tap/`, pure and taking timestamps** — V3's tech spec
  froze `addTap(state, at)` precisely so a media key is another caller rather
  than a second implementation.
* **Every user-facing word is a snippet** — [ADR 0003](../../docs/adr/0003-snippets.md).
* **Time comes from an injected clock**; no test sleeps.

And decided in this conversation:

* ~~**Single press starts and stops; a double press enters tap mode.**~~
  **Half survived the probe.** The single press stays and is the whole feature;
  the double press is deferred to a later change, and the tapping it was going
  to enter is gone for good.

* **The action we bind is `pause`, not `play`.** *"We also only use the 'pause'
  event for starting and stopping the metronome."* Because that is what the
  hardware delivers: with `playbackState` left at `playing`, the system believes
  the page is playing and sends `pause` on every press. One action, every time,
  rather than an alternation we would have to track.

* **Beat taps, not bar taps — and this change is how we find out whether that
  works.** *"let's find that out with this ticket. if it is really the case, we
  will probably have to drop it and remember that decision. but maybe, it is
  just fine."*

  **This overrides my recommendation, deliberately, and the reasoning is
  sound.** The 500 ms multi-press window in the research below is generalised
  from vendor documentation, not measured on the speaker in the room. AVRCP
  windows vary by device and firmware, so the honest way to settle it is to tap
  on the actual hardware rather than to infer from Sony's help pages.

  **What that makes V4.** It is an experiment with a cheap revert, not a feature
  whose behaviour is known in advance — and **the experiment now runs before the
  feature is built**, as a probe. See `## What the probe found

### Run 1 — Firefox, digital silence: the page never claimed the session

> *"does not work on firefox. pressing play just opens spotify."*

Spotify taking the button is the tell: the press reached the OS and was routed
to whichever app owned the media session, and it was not us.

**The documented cause, found after the fact.** Firefox will not dispatch media
keys for media it considers *inaudible*, and it decides that by reading the
samples — there is a pref for it,
`dom.media.silence_duration_for_audibility`. Chrome accepts digital zeros;
Firefox does not. Separately, a media notification is only shown for media
**longer than five seconds**, and the probe's first silent file was one second.

So run 1 tested two defects at once and cannot separate them. Both are fixed:
the generated file is now **eight seconds**, and the probe offers a **ladder**
rather than a single silent element.

### The ladder, and why it is shaped this way

| Mode | What plays | What it proves |
| :-- | :-- | :-- |
| 1 · Context only | An `AudioContext`, nothing else | Whether Web Audio alone can own a session. The app's click is exactly this |
| 2 · Digital silence | 8 s of zeros, looping | The documented Chrome-works / Firefox-does-not case |
| 3 · Near-silent | 60 Hz at **−81 dBFS** | Whether audibility is judged from the *samples* or merely from `volume` and `muted` |
| 4 · Quiet tone | 220 Hz at **−26 dBFS**, plainly audible | Proves the mechanism works at all, and sets the price if it is the only mode that does |

**The lowest mode that responds is the answer** — it is the least this app must
do to own the buttons.

### What each outcome costs V4

* **Mode 1 works** — free. The click already runs an `AudioContext`.
* **Mode 2 or 3 works** — cheap. A silent or inaudible loop runs beside the
  click. This is the shape `tech-spec.md` already assumes.
* **Only mode 4 works** — **expensive, and a product problem rather than a
  technical one.** Owning the buttons would cost a permanently audible tone
  under a metronome. `docs/persona.md` is unambiguous that a sound Sam did not
  ask for is a reason to close the tab. If this is the finding, V4 is probably
  Chrome-only, or it does not ship.
* **Nothing works in Firefox at any level** — record it and decide whether V4 is
  worth building for Chrome alone. That is a scope question, not a bug.

### Run 2 — the ladder, answered

> *"It doesn't work for firefox, only with the quiet tone (which is way too
> loud). That means we will build the feature for chrome only with 'digital
> silence'."*

**Firefox is out, and not by a small margin.** Modes 1, 2 and 3 gave it nothing;
only mode 4 — a plainly audible 220 Hz tone at −26 dBFS — claimed the session.
So on Firefox, owning the buttons costs a permanent audible tone under the
metronome, which `docs/persona.md` rules out in as many words: a sound the
player did not ask for is a reason to close the tab.

That settles the outcome the spec had already named as the expensive one. **It
is not a bug to fix and not a fallback to build** — no browser switch, no
degraded mode. On Firefox the feature simply is not there.

**On Chrome, digital silence is enough** — mode 2. That is the cheap outcome,
and it is what ships.

> *"The box firmware interprets fast taps by it's own."*

**Tap tempo over Bluetooth is dead, confirmed on hardware rather than inferred
from Sony's documentation.** V3's research predicted it; the probe proved it on
the speaker in the room.

* ~~**Beat taps, not bar taps — and this change is how we find out whether that
  works.**~~ **Answered by the probe: it does not work.**

  The prediction was right and the measurement is what settles it. The speaker's
  firmware interprets fast presses itself, so a tempo cannot be tapped on that
  button at any unit fast enough to be useful. Per-bar tapping is not taken up
  as a middle option either — the user's call was play/stop only.

  What this cost to learn: one 8 KB HTML file and twenty minutes with a phone.
  What it would have cost to learn later: a mode machine, a second sample, a
  cowbell cue and four tracks of work, all deleted. **The probe is the reason
  this bullet is three lines instead of a rewrite.**

* **Entering tap mode plays a cowbell.** Because Sam's requirement is a voice
  that is obviously *not* the click — pitch-shifting claves would read as the
  click misbehaving rather than as a mode change — and because the licence makes
  the choice: `cowbell` is VCSL, **CC0**, so it adds no credit string to the UI.
  `rim`, the other candidate, is MuldjordKit **CC-BY**, which would put two
  attribution lines on screen for the sake of one cue.

  This makes V4 the change that turns the velocity curve from a claves-only
  affair into a two-voice one — which is what V2's curve was built for:
  `gainFor` is referenced to the selected layer's nominal velocity, and cowbell
  brings its own.

* **Tap mode ends two seconds after the last tap, and plays the cowbell on the
  way out.** *"it times out exactly as the tap tempo button… so, end after 2
  secs and play the cowbell."*

  The same two seconds as V3, for the same derived reason — it clears the
  slowest legal beat interval, 1.5 s at 40 bpm — and keeping the two doors
  identical means there is one rule to remember rather than two. The exit is
  audible because a silent drop back leaves the player exactly as lost as a
  silent entry: Sam, *"I'm in exactly the same position — no idea which mode I'm
  in."*

## Sam's verdict

Asked with the persona in front of it. Sam was careful to separate what the file
says from what it does not, which matters here — a lot of this is reasoning from
a premise I supplied rather than from a recorded line.

**Entering the mode must sound like nothing else.** *"Silence is the wrong
answer because silence already means three other things to me: I pressed play by
mistake, the Bluetooth dropped, or the phone locked. Standing there with a
guitar I can't tell those apart, and I won't walk over to look."* And the
structural reason: a single press already stops the click, so *"two different
presses producing the same sound is the same as no feedback."*

Sam would tolerate a spoken word once and then find it grating — *"a metronome
that talks is a device addressing me"* — but flagged it: **the persona is silent
on speech. That's taste, not the file.**

**One tap per bar, and six seconds is fine.** *"Tapping a downbeat while
counting 2-3-4 in my head is a thing I already do."* Half a bar was rejected on
our own research: *"I'd rather wait than have tap three register as 'previous
track'."* And the "one tap" persona line does not apply here — *"that's the
open-the-page moment. Setting a tempo by ear is a different moment and I expect
it to take as long as feeling the tempo takes."* What would actually lose Sam is
not slowness: *"it's a tap tempo that lands on the wrong number. Then I'm
reaching for the phone, which is the thing this feature exists to avoid."*

**The mode must time out on its own, and the exit must be audible too.**
*"A mode I can't see and have now forgotten is a trap. If it waits for me
forever, I come back from the conversation, press the button to start the click,
and get nothing — because that press was a tap. At that point I think the app is
broken."* A stray single tap is thrown away rather than setting a tempo.
**Persona is silent on how long.**

**And the risk is the double press, not the single one.** This is the part that
changed the shape of the spec:

> "My reflex for double-press on a speaker is skip-this-song — I do it without
> deciding to. So the failure isn't 'I pressed play and got something weird',
> it's **'I fumbled the button out of habit, didn't notice, and then play
> stopped working'**. Entering the mode has to be unmistakable and leaving it
> has to happen by itself. Get those right and this stops being a worry. Get
> them wrong and the feature is a button that sometimes lies."

Sam also flagged, unprompted, that **the persona says nothing about Bluetooth
speakers, media buttons, or years of habit with music apps** — that premise came
from my question. Worth knowing when re-reading this: the strongest argument in
this spec rests on a reflex we asserted rather than recorded.

## Open

* Nothing. The spec is settled — next phase is `tech-spec.md`.
