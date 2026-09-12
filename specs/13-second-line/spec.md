# V13. Second line

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 13`

## What

* *"Add second-line groove style."* A New Orleans street-parade feel, the fifth
  entry beside the click, rock, straight funk and bossa nova.

## Done when

* **A fifth entry plays second line** — one bar, four shipped voices, no new
  samples, last in the select order and never the default. *Needs an ear:*
  whether beats 2 and 3 are findable at all, carried by the hat's 0.90 rung
  alone.
* **It swings at 0.2, and the quarters do not move.** Asserted rather than
  assumed: no even step is ever displaced by `swingOffset`, at any tempo and any
  swing value, and a swung odd step lands late by at least 3.3 ms everywhere in
  40–180.
* **The snare states no quarter**, and the three compensations hold in every bar
  — the quarter is the loudest hat event, the kick states steps 0 and 12, and
  step 14 is the loudest snare followed by a drop of at least 14 dB on step 15.
  *Needs an ear:* the fill's drop is 14.64 dB against the ordinary bar's 19.06,
  because step 15 carries the tap.
* **The fill adds rather than subtracts**: the hat plays all 16 steps through
  it, every ordinary snare note keeps its velocity, and the loudest note is
  capped 3.06 dB under the downbeat kick.
* **ADR 0010 is unchanged**, and `docs/music.md` §2 gains the written
  second-line pattern it currently lacks.

## Size test

| | Question | Verdict |
| :-- | :-- | :-- |
| 1 | Five `## Done when` bullets or fewer? | ✅ exactly five |
| 2 | At most two or three concern folders? | ✅ **one substantive** — `lib/groove/grooves/`, plus one line each in `lib/transport/`, the feature's `components/` and `src/lib/snippets/` |
| 3 | Leaves what `docs/music.md` marks as fixed alone? | ✅ no new voice, no new library, one credit string |
| 4 | Would one `git revert` roll it back? | ✅ |

**Passes all four, and by the widest margin of any groove so far.** No new
samples, no calibration, no ADR amendment, no contract change — the registry V10
built is doing exactly what it was built for.

## Decided

* **Four voices, one bar, `subdivision: 16`, `swing: 0.2`, no `rim`, no toms, no
  new samples, and no ADR amendment.** The smallest groove change the app has
  had: one data file plus wiring.

* **No `rim`, and V13 neither waits for V11 nor calibrates it.** Second line is
  identified by its snare figure and its syncopated kick; the cross-stick on the
  "e" of 4 is an ornament. *"Take it out of bossa and there is no bossa; take it
  out of second line and there is still second line."* The cost of taking it
  would be real — `rim` means `kit.ts`, `kit.test.ts`, `KIT_VOICES`,
  `VOICE_ORDER` and `public/samples/`, every one of them a file V11 also edits,
  so two changes would be deriving the same numbers in the same files.

  **This makes V13 independent of V11 and buildable in either order.**

* **One bar, not two.** The registry supports `P` bars and the musician declined
  it for a musical reason: *"the figure's repeat period is what Sam finds 1
  against, and this is the groove where finding 1 is hardest."* At 92 bpm one
  bar repeats every 2.61 s and two every 5.22 s — doubling the period of the
  only repeating thing, in the one groove that removes the backbeat, is the
  wrong trade.

* **Swing is 0.2, frozen, and 0.22 is explicitly refused.** The sibling declares
  0.22; the difference at 92 bpm is **0.8 ms**, 0.5% of a step — a change that
  literally cannot be heard, and shipping it would override `docs/music.md` for
  nothing while breaking that document's own ordering, where second line is less
  lazy than boom-bap. If Sam's worry proves right and 0.2 is too subtle, the next
  value is **0.26**; past 0.3 a lilt becomes a shuffle and the style stops being
  this one.

* **`SECOND_LINE_TAP = 0.45`, not funk's `GHOST_VELOCITY` 0.37.** Derived, not
  guessed: at 0.37 the tap renders −40.89 dBFS, which is **0.73 dB below the
  hat's own sixteenths** at −40.16, so the rudimental figure would sink into the
  hat line. 0.45 puts it 2.47 dB above the hat and 16.4 dB under the displaced
  backbeat.

* **The fill's arrival is step 14, not step 15**, and this is arithmetic rather
  than taste. Funk's fill arrives at snare 0.94 on step 15, which renders
  −18.07 dBFS — **0.14 dB louder than the downbeat kick**. Funk gets away with
  that because it has a backbeat everywhere else. Here step 0 is the last anchor
  standing, so the fill's loudest note is capped at 0.86 / −21.27, **3.06 dB
  under the downbeat**.

* **Second line is last in the select order and never the default.** It gives
  the least reference of any groove. Sam's own exclusion applies: the person it
  does not serve is *"the drummer in a practice room"*.

## Amended at build time — 2026-09-12, V12 landed first

**This spec was written before V12 (Shuffle) shipped, and V12 changed
`swingOffset` underneath it.** Two sentences below are now wrong about the tree.
Neither changes what V13 builds; both change what its tests may claim.

* **"This would be the first groove that actually swings" is no longer true.**
  Shuffle got there first, at swing 2/3. V13 is the second, and the first at a
  *lilt* rather than a triplet.

* **"`swingOffset` returns 0 for any even step" is no longer true in general.**
  [ADR 0014](../../docs/adr/0014-swing-warps-the-grid.md) replaced per-step
  displacement with a grid **warp**: the function now takes a required `stride`
  = `groove.steps / groove.subdivision`, and at `stride` 2 — rock and shuffle —
  even grid steps do move. Shuffle's step 2 lands at 2/3 of a beat on purpose.

  **Second line is unaffected**, because it declares `steps: 16` and
  `subdivision: 16`, so its stride is 1 and the warp collapses to exactly the
  old arithmetic. Sam's condition holds untouched: the quarters stay dead on and
  the lilt lives strictly between them.

  What changed is the *scope* of the guarantee the `## Done when` bullet asks to
  be asserted. It is built as two assertions rather than one:

  1. **The quarters never move, for every groove the app can select** — a
     quarter is grid step `4k`, so `p = 4k / stride` is an even integer at
     stride 1 and stride 2 alike and picks up no lag. This is the stronger,
     truer form of what the bullet meant, and it is asserted over the groove
     registry rather than over a number, so a fifth groove cannot skip it. It is
     deliberately **not** claimed for all strides: at a hypothetical
     `subdivision: 4` the quarters would lilt.
  2. **At stride 1, no even step moves at all** — the original sentence, now
     scoped to the grooves it is true of, which includes second line.

* **The tightest swing margin is at 180 bpm, not 112.5.** The spec says below
  that *"the tightest margin anywhere in the app's 40-180 is at 112.5 bpm --
  swing 13.33 ms against worst-case jitter 8.00 ms"*. That pair is real but it
  leaves 5.33 ms of margin. The true minimum is at the **top** of the range:
  at 180 bpm the lilt is 8.33 ms against 5.00 ms of jitter, which is 3.33 ms --
  exactly the frozen contract. So the 3.3 ms number is right and its derivation
  was not. The test sweeps every integer tempo rather than the named ones, so it
  does not rest on which tempo is tightest.

  The risk the tech spec names first — *someone changes the parity test and
  every groove's quarters start lilting* — is caught by the first of those, and
  caught harder than by the original wording.

## What this change runs into

Facts about the tree, read before any question was asked.

* **This would be the first groove that actually swings.** `docs/music.md` §2
  gives second line swing 0.2 and the sibling's template declares 0.22. Every
  groove in the app so far declares swing **0** — funk, rock and bossa alike.
  `swingOffset` is written, tested and wired into `displace`, and it has never
  run at a non-zero value in the app's history. V13 is where that mechanism
  stops being theory.
* **Its defining feature is a displaced backbeat**, which is the one thing Sam
  has consistently leaned on. `docs/music.md` §2 describes it in exactly those
  words. ADR 0010's six invariants do **not** protect the snare — invariant 1
  pins only the kick on step 0 — so the idiom is permitted, but it is the
  sharpest test yet of the bet V8 took when the user overruled Sam's
  three-anchor condition.
* **It needs the `rim`, and V11 is the change that calibrates it.** The
  sibling's second line spends its cross-stick on step 13, the "e" of 4, in
  every bar — *"which turns a pickup into the turnaround click the figure sets
  up."* V11 (bossa nova) derives the `rim` nominals and extends the monotonic
  sweep; it is specced and **not yet built**. V13 either waits for it or does
  that calibration itself.
* **The registry is ready for this.** V10 shipped `GrooveDefinition` with
  `ordinary` as an array of bars, a per-groove `voices` list so selecting a
  groove fetches only what it needs, a declared `subdivision`, and a shared
  `invariants.ts`. A fifth groove is a data file plus wiring.
* **The tempo range is the narrowest yet**, 88–96 against rock's 80–140. The
  app offers 40–180 for every groove and does not clamp.

## Sam's verdict

Asked before any question, because the displaced backbeat could have made this
groove wrong for the player outright. It does not — but it arrives with three
conditions on the figure and two on swing.

**Build it, and it is a different session from funk.** *"On day one I'd hit
start, not find 1, play four bad bars and switch back to funk… On day forty I'd
pick it on purpose, because displacement is the thing I'm worst at."* It quotes
`docs/music.md` §1 back: *"Displacement is the hardest and the most useful. The
click stops being 'the beat' and becomes just another voice you play against."*

**Why this is not a repeat of V8's overrule.** *"My objection in V8 was never
that a displaced backbeat sounds bad, it was that it fails silently… That can't
happen here. I picked the row that says Second line. If I stumble, I know
exactly which decision caused it."* And the consequence, which settles a design
question before it was asked: **the groove selector is this feature's escape
hatch — do not add a second one.**

**Three conditions on the figure:**

1. **The stated subdivision must be 16, not 8.** With the snare displaced and
   the kick syncopated, *"the hat is the only voice left stating the grid, and
   it is carrying the entire job that three voices share in funk."* A groove
   declaring 8 here gives *"one anchor every half beat against a figure designed
   to fool me. Not enough."*
2. **The fill may not be the hat stopping.** That is rock's gesture and funk's,
   and it works there *"because the kick and snare hold the bar underneath it.
   Here there is nothing underneath."* Sam quotes its own V8 objection back:
   *"that's not a fill happening next to me, that's the floor going out — and it
   would be literally true here."* This removes the device both shipped grooves
   use.
3. **Invariant 1 is the last anchor standing.** *"The kick on step 0 at 0.95 is
   doing more work than it has ever done. Don't let 'syncopated kick' quietly
   soften it."*

**On swing — it is categorically not humanisation, and the distinction is
Sam's.** *"Every bar lilts identically, so by bar two it isn't displacement any
more, it's just where the notes are. A fixed, repeating, learnable offset is a
reference. A varying one isn't."* On telling it from a fault: *"Broken means
inconsistent. Swung means the same every time. Sixteen milliseconds that repeats
exactly is a feel; sixteen milliseconds that moves is a fault. I'd never confuse
them."*

Two conditions: **the quarters stay dead on** — *"as long as 1, 2, 3 and 4 land
where they always land and the lilt lives strictly between them, I'm fine"* —
and **no swing control anywhere on the page**: *"a number I can drag is a
control I have to read past on the way to play, and the person who wants to dial
swing to taste is the producer."*

Its worry is the inverse of the brief's: not that 0.2 reads as broken but that
*"it's so subtle I never notice it's there."*

**Two smaller notes.** Second line must never become the default on a fresh
visit — the person it does not serve is *"the drummer in a practice room"*, who
`docs/persona.md` already excludes. And it is the first groove where Sam would
reach for V9's count-in: *"four exact claves, then a figure that never states 2
and 4 — that's how I find bar 1 on the first pass."* Still not on by default.

## Swing, proved rather than asserted

**`swing.ts` guarantees Sam's condition by construction, and it is not a
property of 0.2.** The function returns 0 for any even step; the step reaching
it is the **absolute** step, and a bar is 16 steps, so absolute parity equals
bar-local parity in every bar forever. The quarters are bar positions 0, 4, 8
and 12 — all even — so **no quarter can move, at any tempo, at any swing
value.** The eighths (2, 6, 10, 14) are safe for the same reason; only the "e"s
and "a"s lilt. `Math.min(Math.max(swing, 0), 1)` also stops an odd step being
pushed past the step after it.

The model is right for a lilt rather than a shuffle: each sixteenth pair becomes
long–short at `50% + 25 × swing`, so 0.2 is **55:45**, inside the 54–58% range
sequencer swing controls use for this feel. A triplet shuffle is 66.7%.

| bpm | sixteenth | swing 0.2 |
| :-- | --: | --: |
| 88 | 170.45 ms | 17.05 ms |
| 92 | 163.04 ms | 16.30 ms |
| 96 | 156.25 ms | 15.62 ms |

**The swung sixteenth can never arrive early.** The humanize ceiling binds at
4 ms across this range against a 15.6–17.0 ms lilt, and the tightest margin
anywhere in the app's 40–180 is at 112.5 bpm — swing 13.33 ms against worst-case
jitter 8.00 ms. Freezable as a contract: *at every tempo the app offers, a swung
odd step lands late by at least 3.3 ms.*

**The count-in stays exact with no V13 change.** `createCountInSource.displace`
returns 0 outright while the count bar sounds, then subtracts 16 — an even
number, so the swing phase survives. Four exact claves, then a swung figure.

## What Sam locks to instead

The snare states **no quarter at all**: its strong notes are steps 6 and 14, the
"and" of 2 and the "and" of 4, exactly one eighth after where a backbeat would
be. The idiom is learnable as a rule rather than a shape — *the snare answers
every beat half a beat late, and never lands on one.*

Three things compensate, in every bar, marked or not. Each is stated as the
function it performs and the floor that performs it, because two of the three
are carried by different notes in a marked bar than in an ordinary one.

1. **The quarter is the loudest hat event of the bar** — in an ordinary bar the
   three rungs 0.90 / 0.78 / 0.66 render −30.54 / −35.33 / −40.16, which is
   4.79 dB and 9.62 dB of separation. In the light bar step 12's quarter is
   `hatOpen` 0.80 at −27.47 instead, 3.07 dB *louder* than the closed rung it
   replaces, so the anchor is strengthened there rather than moved. This is why
   Sam is right that `subdivision` must be 16: a groove stating 8 would leave
   the hat's ladder with nothing to be a ladder against.
2. **The kick states the two quarters that matter most** — 0.95 on step 0 and
   0.86 on step 12, the big four, in all three bars without exception. So beats
   1 and 4 are carried by two voices each; **beats 2 and 3 are carried by the
   hat's 0.90 rung alone.** That is the exercise, and it is the biggest
   listening risk.
3. **The approach to the downbeat is the loudest snare of the bar on step 14,
   then a drop of at least 14 dB on step 15, then the downbeat.** Step 14 is
   `snare` 0.86 / −21.27 in every bar. Step 15 is the hat alone at −40.16 in
   the ordinary and light bars, and in the fill it also carries the 0.45 tap.
   Measured as full-mix power the drop is **19.06 dB** in the ordinary bar,
   **20.54 dB** in the light one — which adds a kick on step 14 and so deepens
   the dip rather than shallowing it — and **14.64 dB** in the fill. All three
   are many times `gainTrim`'s ±1.6 dB and all three repeat identically on
   every cycle, so the cue is the dip and not the silence.

**This paragraph read "near-silence on 15" until the fill was measured against
it, and that was wrong of one bar in four.** See *Bar 4* below for why the tap
stays.

## The three bars

Grid 16, stated subdivision 16, `swing: 0.2`, `seed: 0x5f_32_6e_64`,
`humanize: STRAIGHT_FUNK_HUMANIZE` with `exactVoices: []`,
`voices: ['kick', 'snare', 'hatClosed', 'hatOpen']`.

### Ordinary

| Voice | Velocity | Steps | Renders | Reading |
| :-- | --: | :-- | --: | :-- |
| `kick` | 0.95 | 0 | −18.21 | invariant 1 |
| `kick` | 0.86 | 6, 12 | −21.81 | the "and of 2", the big four |
| `snare` | 0.86 | 6, 14 | −21.27 | **the displaced backbeat** |
| `snare` | 0.70 | 10 | −27.69 | the "and of 3" |
| `snare` | 0.45 | 3, 11 | −37.69 | the taps, both swung |
| `hatClosed` | 0.90 | 0, 4, 8, 12 | −30.54 | the grid |
| `hatClosed` | 0.78 | 2, 6, 10, 14 | −35.33 | |
| `hatClosed` | 0.66 | odd steps | −40.16 | |

24 events — identical density to funk's ordinary bar. **No `hatOpen` in an
ordinary bar:** its only idiomatic position is step 14, which is where the
displaced backbeat lives, and an open hat there would splash over the one note
that defines the groove.

### Bar 2, the light one

| Edit | Step | Change |
| :-- | --: | :-- |
| substitute | 12 | `hatClosed` 0.90 → `hatOpen` 0.80 |
| add | 14 | `kick` 0.78 under the displaced backbeat |

Step 12 rather than funk's and rock's step 10, because 12 is *this* groove's
event — the big four, the one quarter the snare deliberately avoids.

### Bar 4, the fill — the ordinary figure with its gaps filled in

That is what *"the style, not a punctuation on it"* translates to under
modify-never-replace. Every ordinary snare note keeps its own velocity; the fill
supplies only the notes between them, closing the hinted roll into a real one.

| Voice | Velocity | Steps |
| :-- | --: | :-- |
| `kick` | 0.95 / 0.86 | 0 / 6, 12 — **unchanged** |
| `snare` | 0.45 / 0.86 | 3 / 6 — unchanged, per invariant 3 |
| `snare` | 0.62 → 0.70 → 0.78 → 0.86 | 8 → 10 → 12 → 14 |
| `snare` | 0.45 | 9, 11, 13, 15 |
| `hatClosed` | 0.90 / 0.78 / 0.66 | **all 16 steps, unchanged** |

**Step 15 keeps the tap, and this was argued rather than inherited.** It is the
one place the fill departs from compensation 3 as originally written. It stays
for three reasons. The fill is the bar with the *most* downbeat information, not
the least: the crescendo −30.89 → −27.69 → −24.49 → −21.27 on steps 8/10/12/14
is a directional approach eight steps long, against the ordinary bar's two.
Those rungs are 3.20 / 3.20 / 3.22 dB apart — exactly invariant 6's floor — so
worst-case `gainTrim` can flatten them; the accent-against-tap alternation at
16.42 dB cannot be flattened, and it is the only humanize-proof structure the
fill has. And swing makes step 15 a pickup rather than an event of its own: at
92 bpm the lilt puts it 146.74 ms before the downbeat against 179.34 ms after
step 14, long–short into 1.

**There is no middle value.** A snare renders −40.16 — the hat's own level — at
velocity 0.388, so any tap quiet enough to deepen the dip meaningfully sinks
into the hat line, which is the 0.37 case this spec already refused. The choice
is 0.45 or nothing.

*Needs an ear:* whether a 14.64 dB drop into the downbeat reads as the same
run-in as the ordinary bar's 19.06 dB. If bar 4's downbeat proves harder to find
than bar 1's, remove the step-15 tap outright rather than lowering it.

**The hat never stops**, which is Sam's constraint 2 — and the gesture both
shipped grooves use was not available here anyway.

## ADR 0010 needs no third amendment

All six invariants hold against this figure as written. The two genuinely new
things — a snare that states no quarter, and a fill that *adds* where funk
subtracts — are permitted by the record as it stands, because invariant 1 pins
the kick and nothing else.

**V13 is the first groove to stress ADR 0010 without needing to change it**,
which is evidence the record generalised correctly in V10 and V11 rather than
evidence it should be superseded. V11's warning still stands unweakened:
invariant 1 fixes a *number* where it means a *role*, and this change does not
bring that day closer — the fill is designed around 0.95 rather than against it.

## One refinement to V11's ADR 0008 correction

The musician reproduced V11's claim independently from the audio and confirmed
it: a 20 ms window misses the eight shipped layers by a mean of 9.04 dB with
7.28 dB of residual spread, while 200 ms RMS minus 1.94 dB reproduces seven of
eight to within 0.03 dB. **The eighth is `hatOpen`, which misses by 0.99 dB and
fits a ~100 ms window instead** — it is a one-second ring, so 200 ms captures a
different share of its decay. Whoever rewrites ADR 0008 should say so, and must
write the −1.94 dB constant into the recipe, without which the method still does
not reproduce `kit.ts`. **V13 adds no voice, so it need not touch ADR 0008.**

## Open

* Nothing. The spec is settled; open questions now belong to
  [tech-spec.md](tech-spec.md).
