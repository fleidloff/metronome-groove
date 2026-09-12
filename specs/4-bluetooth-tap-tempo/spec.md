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
serves it at `/v4-probe.html` with a real origin. Outside `src/`, so no lint
zone binds it and it never enters the app bundle.

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

## Done when

1. **A single press on the speaker starts and stops the click**, through
   Media Session's `play` and `pause` actions, with each handler registered
   defensively so an unsupported action degrades rather than throws.
2. **A double press enters tap mode and a cowbell says so** — the double press
   arriving as `nexttrack`, and the cowbell being a voice no other state uses.
3. **Presses in tap mode feed V3's `addTap` unchanged** — four taps, the same
   outlier rule, the same refusal outside 40–180 bpm. No new tap semantics.
4. **Tap mode ends two seconds after the last tap with a second cowbell**, the
   tempo untouched, and a stray single tap sets nothing.
5. **The probe has answered whether per-beat tapping survives this speaker's
   firmware**, on real hardware, *before* the feature was built — and the
   numbers are in this file. If it does not survive, V4 ships play/stop over
   Bluetooth only and an ADR records why. **Only a person with a speaker can
   settle this**; no test can.

## Decided

Settled elsewhere and not re-asked:

* **The tap logic is `lib/tap/`, pure and taking timestamps** — V3's tech spec
  froze `addTap(state, at)` precisely so a media key is another caller rather
  than a second implementation.
* **Every user-facing word is a snippet** — [ADR 0003](../../docs/adr/0003-snippets.md).
* **Time comes from an injected clock**; no test sleeps.

And decided in this conversation:

* **Single press starts and stops the click; a double press — which arrives as
  `nexttrack` — enters tap mode.** Because that is what the firmware actually
  sends, per V3's research. The original "two plays" design describes something
  the browser never receives.

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
  feature is built**, as a probe. See `## Done when` 5 — and it is
  recorded either way:

  | If per-beat tapping works | Ship it. The tap unit is the same on screen and on the speaker, so there is no second mental model, and V3's module is reused unchanged |
  | If the firmware eats it | *"we can rewrite the feature to play / stop via bluetooth only"* — drop the tapping half entirely, keep play/pause and lose the mode cue with it. Recorded as an ADR so nobody proposes it again |
  | If the probe shows a window that clears a slower unit | Per-bar tapping becomes available as a middle option — worth knowing, but not the default fallback. The user's fallback is play/stop only |

  **Because the unit is the same as V3's, so is everything else** — and V3 has
  since changed, so this inherits the change rather than the original: no tap
  count at all, a window of two beats of whatever is being tapped (a flat two
  seconds while there is only one tap), the same outlier rule, the same refusal
  outside 40–180.

  V4 adds no new tap semantics — it feeds the same `addTap`/`commit` from a
  media key instead of a button, which is exactly what V3's tech spec froze
  that module for.

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
