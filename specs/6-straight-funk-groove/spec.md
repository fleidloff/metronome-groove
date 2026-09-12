# V6. The first groove — straight funk

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 6`

## What

* *"Add a first groove to select instead of the normal click."* A select box
  chooses between the click and the groove.
* The groove is **straight funk**, one bar, *"no variations"*.
* *"Tempo control must work."*
* *"Velocity curves for all samples so that it feels human."*
* *"Humanize the whole groove by slight timing adjustments (as we also did in
  daily-groove)."*
* *"Humanize shall be done for all grooves except the normal click."* — the
  click stays metronomically exact, which is the whole point of a click.

## Done when

* **A select box chooses between the click and straight funk.** The click is the
  default, and it stays metronomically exact — no humanize ever touches it.
* **The groove plays the one-bar figure across the full 40–180 range**, all four
  voices at their written velocities, with tempo changes taking effect while it
  is running. *Needs an ear as well as a run* for the mix balance, the ghost
  depth and the open hat's choke.
* **Humanize displaces each hit by a bounded, stateless offset** — computed from
  `(seed, voice, absoluteStep)`, never accumulating, so the groove returns to
  the grid on every note. Identical output for identical settings regardless of
  lookahead windowing or a backgrounded tab.
* **The 22 samples fetch when the groove is selected**, and pressing Play
  mid-fetch never produces a silent bar.
* **"Drum samples provided by DrumGizmo.org" is visible on the page**, below
  Play and never pushing it down.

## Decided

* **The pattern comes from `docs/music.md` §2, not from daily-groove's
  template.** This repo already wrote straight funk down on a 16-step grid:
  `hatClosed` every step, `hatOpen` on 14, `snare` on 4 and 12 with ghosts on
  7, 9 and 15, `kick` on 0, 3 and 10. daily-groove's `straight-funk.ts` is the
  reference for *feel numbers* — swing 0.18, humanize `timingMs: 9`,
  `velocity: 0.09`, lean `{ snare: +9, hatClosed: −3, hatOpen: −3 }` — not for
  the figure, because that project draws its figure from a seeded pool and this
  one has no variations.

## What this change runs into

Read before answering anything below — these are facts about the tree, not
questions.

* **The scheduler is monophonic.** `Clock.schedule(at, velocity)` queues one
  sample at one time; `createAudioClock` closes over exactly one `AudioBuffer`.
  A groove needs several voices at one instant, each with its own sample, gain
  and timing offset. This is the change's real weight, not the pattern.
* **The grid is a beat, not a step.** `CLICK_PATTERN` is four velocities and
  `cursor % pattern.length` walks beats. Funk is written on sixteenths.
* **`src/lib/velocity.ts` already exists and already does the curve** —
  `curve()` is decibel-linear over a 40 dB range, `gainFor(v, vRef)` trims
  against a layer's nominal velocity. V6 does not invent this; it feeds it.
* **The credit strings are an obligation, and they block.**
  `specs/features.md` lists *"Credit strings in the UI"* as a candidate and says
  it *"blocks shipping any MuldjordKit or DRSKit voice"*. Kick, snare and both
  hats are MuldjordKit, which is CC-BY 4.0. Claves is CC0, which is why V2 owed
  nothing. Shipping this groove means the app must show
  *"Drum samples provided by DrumGizmo.org"* to a person using it.
* **`public/samples/` holds one file today** — `claves_mf.flac`, 
  beside a `provenance.json`.

* **The kit is drums only — `kick`, `snare`, `hatClosed`, `hatOpen`.** Exactly
  what the figure in `docs/music.md` needs. No bass and no comp, on Sam's
  argument that a bass line carries a key and would force one on every practice
  session, and that muting is per beat rather than per voice, so anything
  shipped in the first groove is compulsory. The persona's *"drums, bass and
  comp"* line is a ceiling on what may enter, not a floor on what is owed.

* **This app plays rhythm instruments only, and never anything melodic.** Not
  a scoping call for V6 — a standing constraint on every groove this app will
  ever ship. No bass, no comp, no pad, nothing that states a pitch. **→ ADR.**
  It qualifies on the test `/implement-vibe-with-docs` §8a applies: it
  constrains work that has not happened yet, and reversing it would cost real
  rework across every groove already built to it.

  Two things it makes untrue and one it makes irrelevant:
  * `docs/persona.md` says *"The lead register stays empty. Sam brings the
    melody instrument. Drums, bass and comp, nothing above the comp — same rule
    as next door."* The clause naming bass and comp is now wrong and the
    document has to change with the ADR. The *reason* survives intact — Sam
    brings the melody instrument — and only the ceiling moves down.
  * `specs/features.md` carries a candidate *"Sample pack: copy, decode,
    schedule"* whose notes lean on daily-groove's full pack. Its bass and comp
    half is now out of scope permanently rather than deferred.
  * `docs/music.md` §3 documents `bass` and `comp` in the sibling pack. That
    stays true and stays useful — it describes what the pack holds, not what
    this app plays — but §4's *"what the pack can and cannot play"* should say
    which voices this app will never reach for.

* **A groove is humanized in time; the click never is.** The user's words:
  *"I want the click sound to be perfectly in time. For a groove, I think timing
  adjustments to make it sound human are ok."* The condition they set is the
  contract: *"it's minimal and we can agree that the beat is not completely
  drifting apart but always coming back together."*

  **That condition is what picks the mechanism.** Each hit's displacement is a
  pure function of `(seed, voice, absoluteStep)` — no random walk, no state, no
  accumulation. Every hit is computed from its true grid position, so the groove
  is pulled back to the grid on every single note rather than wandering away
  from it. daily-groove's walk carries the previous value forward, which is why
  the musician measured it saturating inside one bar and parking in the outer
  third of its range. Stateless is also what makes it deterministic under this
  app's lookahead windows and a backgrounded tab, which the walk is not.

  The bound is a fraction of `stepSeconds` with a millisecond ceiling, never a
  bare millisecond figure — at 40 bpm a sixteenth is 375 ms and at 180 bpm it is
  83 ms, so a flat 9 ms means 2.4% of a step at one end and 10.8% at the other.
  No per-voice lean: a fixed offset is not humanisation, it is a backbeat that
  sits somewhere other than where it says it does, and Sam has no way to see
  that.

  This overrides `docs/music.md` §1 and `docs/persona.md`, which both say
  humanisation here is a mix choice and *never* a timing one. Both lines change
  with V6 — the click keeps that guarantee and a groove does not.

* **22 sample files ship, ~550 KB** — `hatClosed` 4 layers × 3 round-robins,
  `snare` 2 × 3, `kick` 1 × 3, `hatOpen` 1. Layers where the measurement shows
  they are real and round-robins where the voice repeats, rather than a uniform
  rule. The hat earns all four layers because it plays all 16 steps and carries
  7.6 dB of genuine soft-to-hard brightness; the other three measured 0–2.4 dB,
  at or under the JND for a spectral tilt on a transient, so extra layers there
  would be three copies of one sound. `hatClosed`'s softest layer ships even
  though this figure never reaches it — 57 KB, and dropping it would put a gain
  cliff at v = 0.624 for every later groove.

  **Round-robin indexes on the absolute step, never the step within the bar.**
  Bar-local indexing makes a one-bar loop bit-identical every 2.4 s forever;
  absolute indexing gives the hat a period of lcm(3, 16) = 48 steps = 3 bars and
  stays fully deterministic.

* **The credit line is always visible, small, at the bottom of the page**, and
  never pushes Play down. Sam's pick, and the reason is that it costs nothing to
  someone who does not look at the screen: *"A static line of text at the bottom
  of a page I don't look at costs me exactly nothing."* Nothing dismissable —
  Sam rules out a modal or a first-run card as *"'Setup before sound' verbatim…
  not negotiable, not even once per device."* An always-visible line also
  discharges the CC-BY term unconditionally, where a line behind a tap
  discharges it only for a viewer who taps.

  It says exactly one string, **"Drum samples provided by DrumGizmo.org"**.
  DRSKit's second string is not shipped, because V6 plays no DRSKit sample.

* **Swing is declared and set to `0`** — decided rather than asked, because
  *straight* is the antonym of *swung* in drumming vocabulary, so swinging
  something the user named "straight funk" would contradict its own name. At
  0.18 on a 16th grid every odd step moves — all three ghosts, the kick on step
  3 and eight of the hats — which is 13.5 ms at 100 bpm against a groove whose
  one claim is the grid. The constant exists rather than the concept being
  omitted, so trying 0.18 later is a value change and a test rather than a new
  mechanism, and the two can be A/B'd by ear.

* **The four dots are unchanged and light on the quarters** — the groove is on
  a 16-step grid, the display is not. `docs/persona.md` makes this cheap to
  decide: the display is low-stakes and nothing may be knowable only by looking.

* **Question 2 of the size test is waived and V6 ships in one pass.** There is
  no honest split behind it: a polyphonic scheduler with no groove ships
  nothing, and a groove without the credit line cannot legally ship. The
  alternative considered was V6 = groove on the grid, V7 = humanize, and it lost
  because it would ship the groove machine-exact first, which is not what it is
  meant to sound like.

* **The groove's samples fetch when it is selected**, not on page load and not
  on first Play. Selecting is a declared intent with a natural gap before the
  hand goes back to the instrument, and someone who only ever uses the click
  never downloads 550 KB. Pressing Play mid-fetch waits and says so rather than
  starting a silent bar — `docs/persona.md` is least forgiving exactly at the
  tap that is supposed to make sound.

* **The click stays the default selection.** It is what the app is today, it is
  what a first-time visitor gets with no download, and V6's premise is that the
  groove is an alternative rather than a replacement.

## Sam's verdict

Asked before the first question, because both halves turn on the player rather
than on engineering.

**On the kit — drums only.** *"A kick, a backbeat and a hat that states the
subdivision is not a beep — it's a drummer. Everything past that is solving a
problem I don't have."* On the bass specifically: *"A bass line has a key.
Straight funk in, say, E minor means every time I pick up the guitar I'm playing
in E minor... That is the app choosing my material for me."* And it could not be
switched off, because muting is per beat and not per voice — *"whatever ships in
the first groove is compulsory. Ship the thing I'd never want to remove."* On
the persona line that names bass and comp: *"that's a ceiling, not a floor. It
says what's allowed in, not what's owed."*

**On the credit line — always visible, small, at the bottom**, and the reason is
that it costs nothing to someone who does not look at the screen: *"A static
line of text at the bottom of a page I don't look at costs me exactly nothing.
Put it there, leave it, stop thinking about it."* One condition — it goes below
Play and never pushes Play down. What Sam refuses is anything dismissable:
*"A modal, a cookie-banner-shaped thing, an 'OK' button, a first-run card —
that is 'Setup before sound' verbatim... Not negotiable, not even once per
device."* Credit inside the select box is the option Sam likes least despite
being the most correct-looking: *"that's the one place on the page I'm actually
reading."*

## The musician's findings

It measured all 40 kit files with ffmpeg rather than reasoning from the
manifest, and four of the findings change the work.

**`pack.json`'s velocity numbers cannot be copied — they are calibrated for a
different gain law.** daily-groove's `gainFor` is linear, `velocity /
nominalVelocity`. This repo's is decibel-linear over 40 dB. Feeding the
sibling's nominals to this curve puts an **8 dB cliff** at the snare's layer
boundary: raising velocity by 0.0001 makes the snare 8 dB *quieter*. The
nominals have to be re-derived from measured level, and the ghost range
transfers just as badly — `0.15–0.25` is 12 dB of ghost depth under the linear
law and 26–30 dB under this one.

**Only `hatClosed` has real timbral layers.** Measured soft-to-hard spectral
tilt: `hatClosed` +7.6 dB above 2 kHz, `snare` +2.4, `kick` +2.0, `hatOpen`
+0.0. `velocity.ts`'s premise that a harder strike is *brighter, not merely
louder* is true of this kit's hat and barely true of the rest. The hat is also
the voice that plays all 16 steps, so it is the one place gain provably cannot
produce what the accent pattern asks for.

**Three of the pack's "layers" are duplicate files.** `kick` and `snare`'s v80
and v98 layers are md5-identical, as are two hat files. The 45 manifest entries
are 40 unique files.

**The figure in `docs/music.md` §2 is physically impossible as written.** It has
`hatClosed` on every step *and* `hatOpen` on 14 — one hi-hat cannot be open and
closed at the same instant. The hat must be suppressed on 14, and the open hat
needs a choke at step 15 or it rings over the next downbeat.

Two smaller corrections it found:

* **The credit is one string, not two.** `docs/music.md` §3 says a render
  carries two; the second is DRSKit's, which supplies only `ride` and
  `rideBell`. V6 plays neither, so shipping that line would claim a source we
  did not use. V6 owes exactly *"Drum samples provided by DrumGizmo.org"*.
* **`CLAVES_LEAD_IN_S = 0.0083` must not be generalised.** It is a property of
  that one file, confirmed at 8.23 ms. Every kit sample's lead-in measured
  ≤ 0.36 ms, at the detector's floor — effectively zero. A groove scheduler that
  inherits the claves constant plays the whole kit 8.3 ms early.

## What V6 closes in `docs/music.md` §5

Three of that document's five open questions are answered by building this, and
one of them goes **against** the document's own stated lean:

| Q | The document's position | V6 |
| :-- | :-- | :-- |
| Q1 render offline or synthesise live | undecided | schedule live in the browser |
| Q3 copy the pack or depend on it | undecided | copy what this groove needs |
| Q4 groove under the click, or instead of it | *"Under it is the safer default"* | **instead of it** |

Q4 is a deliberate departure, and the reason is that the figure already states
what a click would: the hat plays all 16 steps and the kick states 1. A click
over this groove is a sixth voice Sam would mute immediately.

## Size test

Run against what the change will actually touch, per `/vibe-with-docs` §7.

| | Question | Verdict |
| :-- | :-- | :-- |
| 1 | `## Done when` five bullets or fewer? | ✅ exactly five |
| 2 | At most two or three concern folders? | ❌ **four or five** |
| 3 | Leaves everything `docs/music.md` marks as fixed alone? | ✅ its one binding item is the licence obligation, which V6 honours |
| 4 | Would one `git revert` roll it back? | ✅ |

**Question 2 fails.** The change touches a feature slice, `src/lib/` (the step
grid and the velocity mapping are domain), `src/components/` (a select
primitive and the credit line), `public/samples/`, and `docs/`.

§7's own escape applies: *"a change where the requirements are the risky part
wants to be smaller. One where you know what you want and the work is simply
large is fine as it is."* The requirements here are not the risk — the musician
measured the samples and produced the numbers, and every product fork is settled
above. Nor is there an honest split: a polyphonic scheduler with no groove ships
nothing, and a groove without the credit line cannot ship at all.

## Open

* Nothing. The spec is settled; open questions now belong to
  [tech-spec.md](tech-spec.md).
