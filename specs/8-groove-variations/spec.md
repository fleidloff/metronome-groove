# V8. Groove variations

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** shipped 2026-09-12

## What

* *"Add groove variations (just like in daily-groove project). Every 2 and every
  4 bars, we will have a variation to the grooves."*
* *"The fill after 2nd bar is very light, the fill after 4 bars is more
  audible."*
* *"The click stays as is."*
* *"The groove is still displayed as 1 bar in the app. The fills happen under
  the hood."*
* *"Groove variations can be switched on and off. There is a checkbox that is
  initially turned on and the checkbox is also persisted in localStorage."*

## Done when

* **Four bars cycle: ordinary, light, ordinary, fill**, derived from the
  absolute step so nothing becomes stateful. The run states the figure twice
  before anything changes. *Needs an ear:* whether bar 4 reads as a fill at all
  without toms, and whether a fill every 5.33 s at 180 bpm is a drummer who
  cannot leave it alone.
* **The six invariants hold in every bar, marked or not** — kick on step 0 at
  0.95; every one of the 16 steps carries at least one hit; steps 0–7 are the
  ordinary figure; no marked bar changes `stepSeconds`, swing, the seed or the
  humanize bound; every `hatOpen` step is followed by a `hatClosed` step inside
  the same bar; adjacent non-ghost velocities in a contour differ by ≥ 0.08.
* **A "Fills" checkbox, on by default, hidden while the click is selected**, and
  remembered in V7's `Setup` record rather than a second storage key.
* **With variations off the output is bit-identical to V6**, round-robin
  sequence included — so the toggle must not touch the absolute-step indexing.
* **The click is untouched.** `CLICK_SOURCE` never sees a bar index, which is
  what keeps [ADR 0007](../../docs/adr/0007-a-groove-is-humanized-a-click-is-not.md)
  true.

## The two marked bars

Frozen. Velocities are read through `src/lib/velocity.ts`, where a difference of
Δ is 40·Δ dB.

### Bar 2 — the light one

Two edits, nothing removed, no step silenced, kick and both backbeats untouched.

| Edit | Step | Change | Renders |
| :-- | --: | :-- | :-- |
| substitute | 10 | `hatClosed` 0.78 → `hatOpen` 0.76 | −29.1 dBFS: +6.2 dB over the hat it replaces, and **4.8 dB under** the bar's own step-14 open hat |
| raise | 15 | `snare` 0.37 → 0.66 | −29.3 dBFS: +11.6 dB, still 10.4 dB under the backbeat |

It is a *substitution* on step 10, not an addition — one hi-hat cannot be open
and closed at the same instant, which is `docs/music.md` §2's own correction and
**the single easiest mistake to make in this change**.

Neither edit states a new position. One changes the colour of a hat that was
going to sound anyway; the other raises a note that was going to sound anyway.

### Bar 4 — the fill

Steps 0–7 are the ordinary figure. Steps 8–15 are the fill.

| Step | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| `snare` | 0.78 | 0.37 | 0.70 | 0.62 | 0.86 | 0.37 | 0.78 | **0.94** |
| `hatClosed` | 0.90 | — | — | — | — | — | — | — |
| `kick` | — | — | — | — | — | — | — | — |

**The hat stopping is the gesture, not the snare notes.** The hi-hat is the only
voice that plays in nearly every step of every bar, so its absence for seven
steps is the largest signal this four-voice kit can make — and it costs nothing.
It is also what a drummer physically does: the hand leaves the hat to go to the
snare, and it leaves on the "e" of 3.

The snare transposes the hat's own dynamic hierarchy — beat > "&" > "a", ghost
on the "e" — with cell 2 exactly one ladder step above cell 1 at every position,
so the fill grows beat by beat. **Step 15 is the one exception that breaks the
hierarchy**: at −18.1 dBFS it is 0.8 dB *above* an ordinary backbeat and the
loudest snare in the bar. The bar's centre of gravity moving to step 15 is the
fill.

**Step 15 across the cycle is the spine of the design** — 0.37 ordinary, 0.66 in
bar 2, 0.94 in bar 4. Three levels at one step, 11.6 dB apart each, about seven
times the humanize jitter. The two marked bars are one gesture at two sizes.

**The ladder step of 0.08 is derived, not chosen.** `gainTrim` is ±1.6 dB per
hit, so two notes 0.08 apart are 3.2 dB apart and worst-case jitter closes
exactly that — every designed contour step can be flattened but never reversed.
0.78 → 0.86 crosses the snare's layer boundary at 0.815 and still measures
3.2 dB, which is a live demonstration that ADR 0008's derived nominals work.

**No downbeat accent after the fill.** `rideBell` would add a second credit
string for a library the app otherwise does not use, and an open hat on step 0
would put a ringing cymbal over the one instant that must be clean. Thirteen
steps with no kick is the accent.

## Size test

| | Question | Verdict |
| :-- | :-- | :-- |
| 1 | Five `## Done when` bullets or fewer? | ✅ exactly five |
| 2 | At most two or three concern folders? | ❌ **four** |
| 3 | Leaves what `docs/music.md` marks as fixed alone? | ✅ the credit obligation is unchanged — no new voice, no new library |
| 4 | Would one `git revert` roll it back? | ✅ |

Question 2 fails on `lib/groove/`, `lib/setup/`, the feature's `components/` and
`src/components/` for the checkbox primitive. It is the same failure V6 took and
a smaller one — no new samples, no new licence, three files of real logic.

**Measured after the build it was five, not four.** The verifier counted the
feature's `hooks/` and `src/lib/snippets/` as well. The waiver still covers it —
question 2 was already failed and waived in writing — but the count grew past
what the waiver described, and that is recorded rather than rounded down.

## Decided

* **Two marked bars on a four-bar cycle, not one.** Bar 2 carries the light
  one, bar 4 the audible one, and bars 1 and 3 are the ordinary figure. This is
  the sibling's *variation* and *fill* under the user's own names.

* **Sam's three-anchor condition is overruled, deliberately.** Sam asked that
  kick on 1, snare on 2 and 4, *and* the hat stating sixteenths all survive
  every marked bar. The user kept the first and released the other two:
  *"I'm fine with keeping the kick, but we need snare and also hat variations
  for the fill. It must not be as much as in daily-groove but still audible."*

  The reason, in their words: *"Trust me, it will make practicing more fun for
  Sam because it feels more like playing a song. If he doesn't want it, there is
  always the toggle to turn off variations."*

  **So the surviving anchor is the kick on step 0, and that alone.** The snare
  may move or drop on a marked bar and the hat may change or thin. The gesture
  sits between the sibling's — which replaces the bar outright — and Sam's,
  which would have left only ornament.

  **What this accepts, stated once so it is not rediscovered as a surprise.**
  Sam's objection was not that a big fill sounds bad but that it fails
  *silently*: *"I wouldn't diagnose it. I'd notice I kept stumbling every
  fifteen seconds, decide the app was off, and go back to the click."* The
  toggle is the answer to that and it is a real one — it turns an invisible
  failure into a visible control — but it only works if a player connects the
  stumbling to the box. That is the bet being taken, and it is the user's to
  take.

* **The cycle is four bars at every tempo, and the light variation stays at bar
  2.** *"I'd stick with a fill every 4 bars, and still have a very light
  variation after 2 bars already."* A four-bar phrase is a musical unit rather
  than a duration — songs fill every four or eight bars whether they are fast or
  slow — so the cycle tracks the music and not the clock. It is 24 seconds at
  40 bpm and 5.33 at 180; the musician put that density at the top of its
  listening list, and it is heard before it is tuned rather than tuned before it
  is heard.

* **The checkbox is hidden while the click is selected**, not disabled and not
  live-but-inert. Sam's reason is the page's whole standard: *"a checkbox that
  does nothing is a control I have to read past on the way to play."* It sits
  below Play, so appearing and disappearing never moves Play, and the setting is
  remembered either way — switching to the click and back returns it as it was.

* **The checkbox says "Fills"** — Sam's word, and the reasoning is that it is the
  only candidate naming something a non-drummer can point at in a song: *"I'm
  not a drummer and I don't read theory, but I've heard that word off records my
  whole life."* "Variations" says nothing; *"Vary the groove"* reads as a threat,
  *"it sounds like the pattern or the feel might shift under me"*. It is
  narrower than what the box does, since bar 2 is a variation rather than a
  fill, and Sam judged that irrelevant: *"The checkbox has to name the thing I'd
  notice, and what I'd notice is bar 4."*

* **On by default, for a first-time visitor too.** *"A ticked box is not setup"*
  — what `docs/persona.md` rules out is something you must **do** before you
  hear anything, and a default that is already chosen is the opposite of that.
  Off by default would ship the app's best sound switched off and wait for
  someone to find it.

* **It sits with the credit line at the bottom, below Play, never pushing Play
  down**, and never inside the groove select — the same objection Sam made to
  putting the credit there: *"that's the one place on the page I'm actually
  reading."*

* **Question 2 of the size test is waived and V8 ships in one pass.** The
  alternative considered was V8 = the cycle always on, V9 = the checkbox, and it
  lost because the toggle *is* the answer to Sam's objection — shipping the risk
  one release before its mitigation is the wrong order.

## What this change runs into

Facts about the tree, read before any question was asked.

* **The sibling's fill for this feel needs toms we do not have.**
  `straight-funk` has no entry in daily-groove's `FILLS`, so it plays
  `DEFAULT_FILL` — `{ kick: [0], snare: [0, 2, 4, 6, 14], tomHigh: [8, 10],
  tomLow: [12] }` — and its variation is that same phrase `withoutToms`. V6
  shipped four voices: `kick`, `snare`, `hatClosed`, `hatOpen`. The pack holds
  `tomHigh` and `tomLow`, six files each, and neither is in `public/samples/`.
  So the phrase cannot be copied; it has to be either re-voiced or paid for in
  samples.
* **A marked bar in daily-groove *replaces* the bar**, rather than adding to it:
  *"a marked bar emits only the phrase's voices"*. That is a large gesture, and
  the user asked for the two-bar one to be *very light*.
* **The loop is currently one bar and stateless**, and a four-bar cycle needs
  **no signature change** — a correction the musician made to this document's
  first draft. `hitsAt(absoluteStep)` already computes `step % 16`; it can
  equally compute `Math.floor(step / 16) % 4`. Statelessness is preserved
  exactly, and the toggle is a parameter closed over by
  `createStraightFunkSource`, never an argument to `hitsAt`.
* **Round-robin already has a three-bar period.** V6 indexes takes on the
  absolute step, so the hat repeats every 48 steps. Against a four-bar variation
  cycle the combined period becomes twelve bars, which is a feature rather than
  a problem — but it is worth knowing that the loop is already not one bar long
  in any audible sense.
* **V7 is mid-build and owns persistence.** `lib/setup/storedSetup.ts` is in the
  working tree but uncommitted: a versioned `Setup` record under the key
  `metronome.setup`, holding `bpm` and `source`, validated per value so a bad
  tempo does not discard a good groove. V8's checkbox belongs **in that record**,
  not in a second key. This makes V8 depend on V7 landing first.
* **The click must not change.** `CLICK_SOURCE` carries `humanize: null` and no
  `displace`/`trim` at all, which [ADR 0007](../../docs/adr/0007-a-groove-is-humanized-a-click-is-not.md)
  says is deliberate. Whatever shape variations take, the click has to be able
  to decline them the same way.

## Sam's verdict

Asked before any question, because the feature could have been wrong for the
player outright. It is not — but it arrives with one condition.

**Wants it.** *"One bar looping for twenty minutes is not something I'd
voluntarily listen to — it's a click with better samples. Twelve minutes in I
stop hearing it as a drummer and start hearing it as wallpaper, and wallpaper is
what I tune out right before I start rushing."*

**The condition: the marked bar must be additive, never a replacement.** This
cuts directly against the sibling, where *"a marked bar emits only the phrase's
voices"*. Sam's account of what is actually happening at bar 4:

> Eyes shut or on the fretboard, mid-phrase, three bars into something… I'm
> holding the bar by the kick on 1 and the snare on 2 and 4, and the hat is
> telling me where the sixteenths are. That's three anchors and I'm leaning on
> all of them.

> That takes the hat away for a whole bar and moves the backbeat, at the exact
> moment I have to come back in on 1. That's not a fill happening next to me,
> that's the floor going out.

And it fails silently, which is the worst kind: *"I wouldn't diagnose it. I'd
notice I kept stumbling every fifteen seconds, decide the app was off, and go
back to the click."*

**The line, in Sam's words:** *"kick on 1, snare on 2 and 4, hat stating
sixteenths — those three survive every marked bar, including bar 4. Everything
else is yours to play with."*

**On the checkbox.** Call it **"Fills"** — *"I'm not a drummer… but I've heard
that word off records my whole life."* "Variations" says nothing; *"Vary the
groove"* reads as a threat — *"it sounds like the pattern or the feel might
shift under me"*. On by default, *"including for a first-time visitor. A ticked
box is not setup"* — what the persona rules out is something you must **do**
before you hear anything. Placement: with the credit line at the bottom, below
Play, never pushing it down, and never inside the groove select. One addition
of its own: **it should not sit there live while the click is selected** — *"a
checkbox that does nothing is a control I have to read past on the way to
play."*

**One warning about the default.** *"That default is conditional… If the fill
turns out to be the bar-replacing kind, shipping it on by default just means I
hear it once and don't come back. Don't let the checkbox carry a decision the
fill should have got right."*

## The musician's findings

Measured against `src/lib/velocity.ts`'s decibel-linear law, where a velocity
difference of Δ is 40·Δ dB.

**No toms, and the argument is not thrift.** A fill's job is to state a phrase
boundary, and the three things that carry one — a break in the timekeeping
voice, a rhythm ascending into the next downbeat, a dynamic rising into it —
need no second pitch. What is genuinely lost is the descending high-tom → low-tom
→ kick contour, which is the most legible fill gesture to a non-drummer, and
timbral colour, since the fill would otherwise be made of the same three sounds
as the groove.

**But the tom files would misbehave here anyway, and this is the decisive
point.** They ship **two** round-robins per layer, not three. V6 indexes takes
on the absolute step, and 2 divides 16 — so for a fixed step in a fixed bar of a
four-bar cycle, `absoluteStep mod 2` is constant forever. **A tom fill would
play the identical two files in the identical order on every fill for the life
of the run**, which is exactly the bit-identical-loop defect V6 went out of its
way to avoid, landing on the one bar the ear is most focused on. Cost if bought
later: 400 KB against the current 569 KB, no new credit string (same library),
but ADR 0008 applies in full — six layers measured, nominals re-derived, the
monotonic sweep extended.

**Both marked bars modify the figure; neither replaces it.** The sibling
replaces because its bar is the last of a pre-rendered pass. Here the loop is
endless and it is a *reference*: replacing the bar removes the hat's sixteenths
for one bar in four, which is 25% of practice time with no stated subdivision —
*"that is not a fill, it is a gap click"*, and `docs/music.md` lists gap click
as a separate method Sam builds by hand with the beat toggles.

**What reads as "light" is a change in the timekeeping voice, never an addition
to the accent voices.** A player counting time hears the hat as texture, so a
change there registers as *something happened* without being confusable with the
beat. An added snare is a new accent, and an accent is what Sam uses to *find*
the beat — so adding a snare note is the riskiest light gesture available, not
the lightest.

**Where the fill may live.** Steps 0–7 stay ordinary and the fill occupies steps
8–15. *"The first half of a 4/4 bar establishes and the second half is where a
one-bar fill lives — that is why drummers start fills on beat 3 or beat 4. A
fill that begins at step 0 has abandoned the bar, and abandoning the bar is the
one thing a metronome may not do."*

**The velocity jitter constrains the contour, not the other way round.** ±0.04
of velocity is ±1.6 dB, so two hits whose velocities differ by less than 0.08
can swap order on any pass. Every rising pair in the fill is therefore spaced
≥ 0.08 (≥ 3.2 dB), which is also above the ~2 dB JND for level on a transient.
*"This is the constraint most likely to be violated by a later tweak: nudging
0.70 to 0.74 would quietly make the fill's rise unreliable."*

**No downbeat accent after the fill, deliberately.** `docs/music.md` §4 suggests
`rideBell` as the missing crash, but `rideBell` is DRSKit and shipping it would
add a **second credit string** the app does not currently owe. Faking a crash
with an open hat on step 0 would put a ringing cymbal over the one instant that
must be clean. The rise into the downbeat is what makes it land.

**The 12-bar combined period is a feature.** Round-robin is 48 steps, the cycle
is 64, so the two coincide only every 192 steps — and bar 4 begins at absolute
steps 48, 112, 176 …, whose residues mod 3 run 0, 1, 2. Three distinct take
sequences before a fill repeats. Had the round-robin period divided the cycle,
every fill would have been bit-identical forever.

**Nothing in `docs/music.md` or ADRs 0006–0008 is contradicted.** Both marked
bars use the same `Humanize` record and the same stateless hash, so ADR 0007
holds; every velocity sits inside an existing calibrated layer, so ADR 0008 is
untouched; no melodic voice appears, so ADR 0006 holds. §5's Q2 and Q5 are both
untouched — though the musician notes that writing the cycle as *four bars of
`source.steps`* rather than 64 hard-coded steps keeps Q5 (is meter a variable)
cheap to answer later.

**V8 reverses one line of V6.** `specs/6-straight-funk-groove/spec.md` records
straight funk as *"one bar, no variations"*. That was the user's own framing and
this is the user's own reversal, recorded here so the two documents do not
silently disagree.

## Open

* Nothing. The spec is settled; open questions now belong to
  [tech-spec.md](tech-spec.md).
