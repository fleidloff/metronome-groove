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
5. **We learn whether per-beat tapping survives the speaker's firmware**, on
   real hardware, and the answer is written down either way — shipped if it
   works, an ADR and a fallback to per-bar tapping if it does not. **Only a
   person with a speaker can settle this**; no test can.

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
  whose behaviour is known in advance. The finding is a deliverable in its own
  right — `## Done when` 5 — and it is recorded either way:

  | If per-beat tapping works | Ship it. The tap unit is the same on screen and on the speaker, so there is no second mental model, and V3's module is reused unchanged |
  | If the firmware eats it | Record it as an ADR, drop the tapping half, and keep play/pause and the mode cue. Per bar is the named fallback, and it is a one-line change to the tap unit rather than a redesign |

  **Because the unit is the same as V3's, so is everything else:** four taps, a
  two-second expiry, the same outlier rule, the same refusal outside 40–180.
  V4 adds no new tap semantics at all — it feeds the same `addTap` from a media
  key instead of a button, which is exactly what V3's tech spec froze it for.

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
