# V12. Shuffle

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 12`

## What

* *"Let's add the shuffle as groove type."* A fourth entry beside the click,
  rock and straight funk — and the first thing in the app that is not straight.
* It is the change that turns swing on. The mechanism has been written, tested
  and shipped since V6 and has never once run at a non-zero value.

## Decided

* **V12 is built on top of V10, which has now landed** — the answer was
  *assume V10*, and by the time it was given the tree already agreed. Shuffle is
  therefore one definition file plus the swing generalisation, and it writes no
  part of V10's refactor.

* **It is a groove type, not a swing control on rock** — the user's own framing,
  and a groove type is a thing you pick. Sam, asked whether it should instead be
  a dial, came back the same way and harder:

  > *"Rock and a shuffle are different songs to me, not the same song at two
  > settings… A dial makes them one thing and makes me responsible for the
  > difference between them. You pick the 0.62. That's the job I'm paying you
  > in attention for."*

  > *"I could not tell you what swing 0.67 means, and I'd never know whether
  > the value I landed on was a real feel or just a mistake I'd got used to.
  > Shuffle is a word I learned off records."*

  So the swing value is a constant in a groove definition and never a control.
  `SourceId` gains `'shuffle'`; `SOURCE_IDS` gains a fourth entry, which is what
  makes it survive a reload through `storedSetup`.

* **The select reads Click, Rock, Shuffle, Straight funk** — decided rather than
  asked. Shuffle sits next to rock because the two are the pair a listener
  compares. Say if you would rather it went last; it is one line in
  `SourceSelect.tsx`.

* **The grid stays 16, and swing becomes a warp of it.** The musician's §1, and
  it is the structural weight of this change.

  Today `swingOffset` delays single odd steps. Written that way, a shuffle's
  odd steps stay at 0.25 and 0.75 of a beat — straight sixteenths sounding
  against a 2:1 pulse, which in a shuffle are not ornaments but wrong notes.
  Instead the grid *between* two stated steps is stretched with them, so a
  sub-eighth note is felt inside the swung pair rather than against it. At
  swing 2/3 the warped grid lands on `{0, 1/3, 2/3, 5/6}` of each beat — a
  proper subset of the sextuplet grid, which is what makes the fill possible.

  **Funk and rock are provably unchanged**: funk's `ratio` is 1 so the formula
  collapses to today's arithmetic, and rock's swing of 0 short-circuits. The
  warp is also monotone, so no hit can overtake the next step's — a guarantee
  per-step displacement does not give, and one the scheduler depends on.

  **→ ADR.** This constrains every swung groove that follows — half-time
  shuffle, boom-bap, jazz ride are all in `docs/music.md` §2 and all of them
  land here. `/implement-vibe-with-docs` §8a writes it.

* **A 12- or 24-step triplet grid is rejected, and round-robin is why.** Both
  notate the feel exactly and neither breaks `isQuarter` or `stepSeconds`. But
  `roundRobinIndex` is `step % 3` on the absolute step, and 12 and 24 are both
  divisible by 3 — so every bar position freezes to one take for the life of the
  run. That is the defect ADR 0010 cites when it rejects buying the pack's toms.
  16 keeps the 3-bar take period, and 12 bars against the cycle.

* **The figure is not rock's notes.** `docs/music.md` §2 writes shuffle as
  *"same notes as rock, played at swing 0.64"*; §2 also opens by saying nothing
  in it is a decision yet, and V10 already departed from it. Identical lines
  would make rock and shuffle the same groove at two values of a number the user
  cannot see — Sam's dial, wearing a different hat.

  **The kick on step 10 is the note that does not exist in a straight groove.**
  Swung, it sounds at 2/3 of beat 3: the lowest voice in the kit states the
  third triplet, which is the canonical shuffle lick. Set swing to 0 and this
  figure does not become rock, it becomes a straight beat with a misplaced kick.
  Step 10 rather than 6 or 14 for a metronome reason — 6 anticipates beat 3 and
  weakens it, 14 blurs the downbeat ADR 0010's invariant 1 protects.

* **Swing is `2 / 3`, written as the ratio.** It puts the off-beat eighth at
  exactly 2/3 of the beat, a 2:1 long-short — the thing the word shuffle names.
  `0.667` is the same number rounded, and reads as a tuned value someone should
  re-tune.

  `docs/music.md`'s flatter 0.60 is a real alternative and measurably so: at
  85 bpm it sits 11.8 ms shy of the triplet, about 3× the humanize bound. 0.64
  is the one indefensible choice — 4.7 ms out, which is inside the noise, so it
  neither is the triplet nor audibly isn't. And a permanently flattened constant
  would be a second, silent humanizer that never varies, which is precisely the
  division of labour ADR 0007 draws.

## What this change runs into

Facts about the tree, read before any question was asked.

* **Swing exists, is tested, and has never run at anything but zero.**
  `STRAIGHT_FUNK_SWING` is `0` and V10 declares rock at `0` too, so the function
  has been asserted and never heard.

* **V10's `subdivision` field becomes load-bearing here.**
  `grooves/definition.ts` already carries `subdivision: 8 | 16` next to
  `steps: 16`, documented as what ADR 0010's invariant 2 reads against. Swing
  has to read it too, or a shuffle is a rock with a number that does nothing.

* **The units are not what `swing.ts`'s comment says they are.** The comment
  reads *"`1` lands on the next on-beat"*; the formula lands it at 0.75 of a
  beat. The ratio is `(2 + s)/(2 − s)`. The build owes the comment a rewrite —
  the signature changes anyway.

* **V10 has landed** — in the working tree, uncommitted, while this was being
  written. `cycle.ts`, `invariants.ts`, `source.ts`'s `createGrooveSource` and
  `grooves/{definition,straightFunk,rock}.ts` are all there, `SOURCE_IDS` reads
  `['click', 'rock', 'straight-funk']`, and it produced two ADRs this change
  inherits rather than writes: [0012](../../docs/adr/0012-a-groove-is-data.md)
  and [0013](../../docs/adr/0013-a-device-is-keyed-by-its-bank.md).

* **`invariants.ts` executes ADR 0010's six invariants over any definition.**
  V10 built more than its spec promised: `sixInvariantViolations(groove)`
  returns what a groove breaks, so shuffle's compliance is a test rather than an
  eyeball. Checked by hand against the figure above, all six pass — including
  the fill's snare ladder, whose tightest rung is 3.2 dB against a worst-case
  jitter of `2 × 40 × 0.04` = exactly 3.2 dB.

* **ADR 0013 makes "switching downloads nothing" free.** A device is keyed by
  its bank, and shuffle's bank is rock's bank, so nothing is fetched on the
  switch without this change doing anything to earn it.

* **V11 bossa is specced, ready to build, and changes the shared contract.**
  Its tech spec turns `GrooveDefinition.ordinary` into an array of bars so the
  clave can be two, and it already re-touches funk and rock. Whichever of V11
  and V12 goes second pays one line — shuffle writing `ordinary: [ORDINARY]`,
  or bossa touching a fourth definition file. The two do not otherwise meet:
  bossa is swing 0 and never enters `swing.ts`, shuffle is one ordinary bar and
  never enters the phase logic. **Not worth sequencing around**, which is why
  it is recorded here rather than asked.

* **No new samples, and no new credit string.** The same four voices and 22
  files as funk and rock, so switching downloads nothing and `docs/music.md`
  §3's DRSKit string stays unshipped.

* **One `Fills` toggle governs every groove** (V10), so shuffle needs a light bar
  and a fill, and both land on a swung grid.

## The musician's findings

Every dB below is the **rendered** level from `velocity.ts`'s curve against
`kit.ts`'s measured nominals, derived rather than copied (ADR 0008).

### Bar 1 / 3 — ordinary

| Voice | Steps | Velocity | Rendered |
| :-- | :-- | --: | --: |
| `kick` | 0 | 0.95 | −18.21 dBFS |
| `kick` | 8 | 0.86 | −21.81 dBFS |
| `kick` | 10 | 0.78 | −25.01 dBFS |
| `snare` | 4, 12 | 0.95 | −17.67 dBFS |
| `hatClosed` | 0, 4, 8, 12 | 0.90 | −30.54 dBFS |
| `hatClosed` | 2, 6, 10, 14 | 0.78 | −35.33 dBFS |

No open hat, no ghosts, nothing on an odd step.

**What makes it a shuffle rather than rock with a number**, beyond the step-10
kick above:

* **The bar line is structural, not a velocity.** V10's worry was that rock's
  ordinary bar is invariant under a half-bar shift except for 3.60 dB on one
  voice. Shift shuffle's kick set `{0, 8, 10}` by eight steps and you get
  `{8, 0, 2}` — step 2 carries no kick. The downbeat is findable from position,
  so V10's first listening item is much weaker here.
* **The hat ladder is 4.79 dB where rock's is 3.19.** V10 computed 0.78 for
  rock's lower rung and rejected it, because rock must read as even eighths.
  Shuffle must not: the third triplet is the weak *"ba"* of *"dum-ba"*, and a
  shuffle is long-short in dynamics as well as in time. Same rung funk already
  uses, comfortably inside the `v98` layer.
* **Everything shared with rock is held constant deliberately** — snare 0.95 on
  4 and 12, top hat rung 0.90, kick 0.95 / 0.86. Switching Rock → Shuffle should
  change the feel and the kick, not the backbeat level.
* **No ghosts.** `docs/music.md` §2 gives ghosts to the half-time shuffle —
  *"the hardest one here"*. Leaving them out is what lets that be its own groove.

### Bar 2 — light

Bar 1 with one edit, as rock has one: the closed hat on step 10 gives way to an
open hat, so the open hat and the shuffle's signature kick land together.

| Voice | Steps | Velocity | Rendered |
| :-- | :-- | --: | --: |
| `hatClosed` | 2, 6, 14 | 0.78 | −35.33 dBFS |
| `hatOpen` | 10 | 0.76 | −29.07 dBFS |

Everything else is bar 1. **`hatOpen` 0.76 is derived**: the designed lift is
6.26 dB over the closed hat it displaces, the same figure funk and rock both
hit. It equals funk's value because the input equals funk's input.

**Step 10 is the only position available** — steps 0–7 are barred by invariant
3, step 14 has no closed hat after it inside the bar because step 15 is a rest
(invariant 5), and step 12 carries the backbeat.

### Bar 4 — fill

**A shuffle fill is the middle triplet arriving.** Rock's gesture is doubling to
sixteenths; here a straight sixteenth is a wrong note and on the warped grid is
not even reachable. The groove is defined by skipping the middle triplet, and
the fill is where it stops skipping. Steps 0–7 are bar 1 verbatim.

| Voice | Steps | Velocity | Rendered | Sounds at |
| :-- | :-- | --: | --: | :-- |
| `kick` | 0 | 0.95 | −18.21 dBFS | beat 1 |
| `kick` | 8, 12 | 0.86 | −21.81 dBFS | beats 3, 4 |
| `snare` | 4 | 0.95 | −17.67 dBFS | beat 2 |
| `snare` | 9 | 0.62 | −30.89 dBFS | beat 3 + 1/3 |
| `snare` | 10, 13 | 0.70 | −27.69 dBFS | beat 3 + 2/3, beat 4 + 1/3 |
| `snare` | 12, 15 | 0.78 | −24.49 dBFS | beat 4, beat 4 + 5/6 |
| `snare` | 14 | 0.86 | −21.27 dBFS | beat 4 + 2/3 |
| `hatClosed` | 0, 4, 8, 12 | 0.90 | −30.54 dBFS | |
| `hatClosed` | 2, 6 | 0.78 | −35.33 dBFS | |
| `hatOpen` | 10 | 0.76 | −29.07 dBFS | beat 3 + 2/3 |

Step 11 is a rest.

**The hat rides the departure rather than stopping**, as rock's fill does — but
for a reason specific to shuffle rather than by copying it. V10's argument for
stopping the hat was that a hat under the added notes makes the doubling read as
a texture change; that holds for rock, where the added sixteenths sit between
hat notes at a comparable density. Shuffle's added notes land on the **middle
triplet, a position the hat never states in any bar of any groove in this app**.
It is unambiguously new whether or not a hat is playing.

**The open hat covers empty time, not the gesture.** It sounds at beat 3 + 2/3
and is choked at beat 4, and the next hit in the bar is that choke — step 9 is
before it and step 13 after it, so it cannot mask the notes that are the point
of the bar. Against the snare on its own step it is 1.38 dB under, the same
pairing rock already makes.

**Step 10 carries the groove's identity in all three bars**: the kick on it in
bars 1/3, the open hat in bar 2, and in bar 4 the open hat plus the first stated
note of the crescendo, with the kick stepping aside to keep time on 8 and 12.
That is a better design than rock's, which previews on a position with no other
job.

**The velocity set is rock's, and the three departures are each derived:**

| | rock | shuffle | why |
| :-- | :-- | :-- | :-- |
| added snare note | step 11, at 0.75 of beat 3 | **step 9**, at 1/3 of beat 3 | rock adds the straight sixteenth; shuffle adds the note it is defined by skipping |
| `hatClosed` lower rung | 0.82 — 3.19 dB | **0.78** — 4.79 dB | long-short in dynamics, not only in time |
| `hatOpen` | 0.80 | **0.76** | derived from shuffle's own displaced 0.78 closed hat, per ADR 0008 |

Everything else is rock's exactly — stated eighths 10/12/14 at 0.70 / 0.78 /
0.86, added notes 9/13/15 one rung under at 0.62 / 0.70 / 0.78 — so what a
listener hears between the two fills is the rhythm and nothing else. The peak is
0.86 on step 14, so the fill crescendos *into* bar 1, and step 15 at 5/6 of the
beat is the standard blues pickup.

**`hatOpen` must be 0.76 in both marked bars and cannot be rock's 0.80.** The
preview device needs the two open hats at one level, and ADR 0008 needs that
level derived from the hat this groove displaces. 0.76 is the only value that
satisfies both.

All six of ADR 0010's invariants hold in all three bars, checked against
`invariants.ts`'s actual reading of them rather than against the ADR's prose.
The tightest margin is the fill's snare contour — `0.62 → 0.70 → 0.78 → 0.70 →
0.86 → 0.78` is 3.20 dB at three of its five rungs, which is exactly the
worst-case jitter of `2 × 40 × 0.04` and exactly what the `1e-9` tolerance in
`ladderViolations` exists for.

### Where it touches the edges

* **Humanize and swing do not collide.** Both are pure functions of the step's
  true grid position and neither accumulates, so ADR 0007 holds. The tightest
  inter-onset interval in the design is 1/6 of a beat; worst-case humanize
  closes it by 8%, at every tempo. At 180 bpm that interval is 55.6 ms — the
  **shortest this app will ever schedule**, a third shorter than funk's
  sixteenths, and still well inside the 100 ms lookahead.
* **The open hat's choke is more audible than rock's**, in both marked bars,
  because swing moves the open hat later and the choke on step 12 stays put.
  Straight that gap is half a beat; swung it is a third — 235 ms at 85 bpm
  against rock's 375 at 80, so 29–44% shorter across the practice range and cut
  at roughly −8 dB rather than −12. It never rings past its bar at any tempo and
  `CHOKE_S` needs no change. The reason step 12 is the choke is better stated
  here than in rock: it **keeps the ring to one triplet eighth**, the length of
  the short note the shuffle is built on.
* **The four dots are unaffected** — `isQuarter(step, 16)` gives the on-beats,
  and swing never displaces an on-beat.
* **One benign scheduler edge**: `dropOvertakenSteps` compares against grid
  time with half a step of grace, so on return from a throttled tab it can drop
  one step whose swung sound was ~29 ms in the future. Once, on wake. Worth not
  being surprised by.
* **No clamp on tempo**, per V6/V10 policy. At 180 the figure is stated more
  squarely than a band would play it; at 40 the swung eighth reads as two
  quarters. Both are the cost of the policy, not defects.
* **`docs/music.md` §2's shuffle block owes an edit** — it currently says
  *"same notes as rock, played at swing 0.64"*.

### Listening items — none of this has been heard

| # | Item | Cheapest fallback |
| :-- | :-- | :-- |
| 1 | `swing = 2/3` at 85 bpm — a strict 2:1 may read as mechanical | `0.62`, which is 8.3 ms flat of the triplet: twice the humanize bound, so a real change rather than noise |
| 2 | The kick on step 10 at 0.78 — the skip note, or a flam on beat 3? | → 0.70, widening to 6.40 dB |
| 3 | The hat ladder at 4.79 dB — bouncing, or lopsided? | → 0.82, back to rock's 3.19 dB |
| 4 | The fill's added triplets at 0.62 / 0.70 — arriving, or a smudge? | raise both a rung |
| 5 | Fill density, seven snare notes over two beats | drop step 15 |
| 6 | **The preview must not be quieter than the payoff.** The light bar's open hat sits under a kick 4.06 dB over it; the fill's sits under a snare 1.38 dB over it. A kick is 50–100 Hz and an open hat 5–12 kHz, so masking is not predicted — but this is the one part of the device that could come out backwards | raise both open hats to 0.80, which departs from the ADR 0008 derivation deliberately and must be done in **both** bars or the preview breaks |
| 7 | **The open hat riding the fill at all** — 235 ms of wash at 85 bpm between the middle triplet on 9 and the backbeat on 12 | drop it and put `hatClosed` 0.78 back on step 10; the closed hat on 12 then becomes optional rather than required by invariant 5 |

## Done when

* **A fourth entry plays a shuffle**, on the same four voices and the same 22
  files as funk and rock — switching between them downloads nothing.
  *Needs an ear:* whether `2/3` at 85 bpm bounces or reads mechanical.
* **Swing warps the grid rather than displacing single steps** — a sub-eighth
  note lands on the triplet grid, and funk and rock render bit-identically
  because `ratio` 1 and swing 0 both collapse to today's arithmetic.
* **Shuffle's three bars are as the musician wrote them**, and ADR 0010's six
  invariants hold under V10's amended invariant 2. *Needs an ear:* the step-10
  kick and the fill's density.
* **`sixInvariantViolations(SHUFFLE)` returns empty**, and `'shuffle'`
  survives a reload — `SOURCE_IDS` carries it, so `storedSetup`
  validates it; the one Fills toggle governs it like every other groove.
* **The two wrong sentences are corrected** — `swing.ts`'s doc comment and
  `docs/music.md` §2's shuffle block — and the warp is recorded as an ADR.

## Size test

| | Question | Verdict |
| :-- | :-- | :-- |
| 1 | Five `## Done when` bullets or fewer? | ✅ exactly five |
| 2 | At most two or three concern folders? | ✅ **one** — `lib/groove/`, plus one line each in `lib/transport/source.ts`, `components/SourceSelect.tsx` and `src/lib/snippets/` |
| 3 | Leaves what `docs/music.md` marks as fixed alone? | ✅ no new voice, no new library, one credit string |
| 4 | Would one `git revert` roll it back? | ✅ |

## Open

* Nothing. `spec.md` is settled; the conversation has moved to `tech-spec.md`.
