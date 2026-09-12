# V10. Rock

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 10` (after 9)

## What

* A second groove: **straight 8th rock**, *"simply called rock"*.
* *"Same four voices as the funk groove, no new samples."*
* *"It gets its own variation bars like the funk groove does"* — a light bar 2
  and a fill bar 4, under [ADR 0010](../../docs/adr/0010-a-marked-bar-modifies-the-figure.md).

## Decided

* **It is called "rock"**, not "straight 8th rock". The user's word. `SourceId`
  gains `'rock'`; the select box gains a third entry.

* **`lib/groove/` is generalised into machinery plus data.** `cycle.ts` and
  `source.ts` hold what every groove does — the bar index, the cycle, the
  `Source` factory — and `grooves/straightFunk.ts` and `grooves/rock.ts` hold
  only lines, humanize, swing and seed. Chosen over a parallel `lib/rock/`
  folder, which would copy `barIndexFor` and the source factory so the next
  timing fix would land twice, and over adding rock's lines to `figure.ts`,
  which would leave a folder called `groove` and constants called
  `STRAIGHT_FUNK_*` describing two grooves. The third groove then costs one
  file rather than forcing this refactor with more to move.

  **Funk's behaviour does not change**, so its tests should survive as
  behaviour tests. Any that break were testing the shape rather than the sound,
  and that is worth knowing.

* **One "Fills" toggle for every groove, not one per groove** — decided rather
  than asked. `Setup.fills` is a single boolean and stays one: the persona's
  whole objection to controls is having to read past them, and a per-groove
  matrix would turn one checkbox into a setting that changes meaning depending
  on what is selected. Say if you would rather it were per groove; it is a
  field shape, not a rewrite.

* **The select box reads Click, Rock, Straight funk** — rock second because
  `docs/music.md` calls it *"the baseline"* and a list is read top-down by
  someone choosing. It reorders an existing entry, which is a small surprise for
  anyone used to two, and that is the cost.

* **No tempo clamp per groove.** `docs/music.md` gives rock 80–140, but V6
  already settled that the app offers its full 40–180 for every groove:
  clamping per groove is the trainer behaviour `docs/persona.md` rejects. The
  range in the document is advice about where the figure was written, not a
  limit.

* **ADR 0010's invariant 2 is amended, and the amendment is about rests.** The
  user's words: *"rests should be allowed and if rock is an 8th grid, we have
  all the sixteenth as rests."*

  The record currently reads *"Every one of the 16 steps carries at least one
  hit, so the grid is never interrupted."* That was written when one groove
  existed and it is false of rock's ordinary bar, which states eighths and
  leaves the odd steps silent.

  **A silent step is a rest, not a hole**, and that is the distinction the
  invariant was always reaching for. Restated: every step of the groove's
  **stated subdivision** carries a hit, and the positions between them are
  rests. For funk the stated subdivision is the sixteenth, so all sixteen still
  carry hits and nothing about it changes. For rock it is the eighth, so the
  eight even steps carry hits and the odd ones are rests by declaration rather
  than by omission.

  What the invariant still forbids is unchanged: a marked bar may not open a
  hole in the subdivision the groove has declared. That is the thing that would
  turn a fill into a gap click.

  **→ ADR.** This skill writes only the two files under `specs/10-rock-groove/`;
  `/implement-vibe-with-docs` §8a is what edits `docs/adr/0010-*`. Recorded here
  so the build makes the edit rather than a later reader finding a loosened
  assertion in `figure.test.ts` and guessing why.

  It also gives a groove a property it did not have: **a stated subdivision.**
  That is new data every groove definition now carries, and the registry is
  where it lives.

## What this change runs into

Facts about the tree, read before any question was asked.

* **This is the change that turns *the* groove into *grooves*.** `lib/groove/`
  is written for exactly one: `figure.ts` exports `STRAIGHT_FUNK_STEPS` and a
  bare `hitsAt`, `humanize.ts` exports `STRAIGHT_FUNK_HUMANIZE`, `swing.ts`
  exports `STRAIGHT_FUNK_SWING`, `source.ts` exports
  `createStraightFunkSource`. Only `kit.ts` is genuinely shared — the four
  voices and their calibration belong to no particular groove.
* **Rock is on the eighth grid, and nothing has been.** `docs/music.md` §2 gives
  straight 8th rock subdivision 8 against funk's 16. `STEPS_PER_BAR` is 16 and
  `stepSeconds(bpm, stepsPerBar)` already takes the grid as an argument, so the
  machinery exists — but no groove has ever used a value other than 16, and the
  click's 4 is the only other one in the app.
* **Its tempo range is the widest yet.** 80–140 against funk's 90–110, inside
  the app's own 40–180.
* **Swing has still never run at anything but zero.** `swingOffset` is written,
  tested and wired into `displace`; `STRAIGHT_FUNK_SWING` is 0 and rock is 0
  too. So V10 does not exercise it either.
* **`SOURCE_IDS` is the validation list.** `storedSetup.ts` validates a stored
  `source` against it, so a third entry is what makes `'rock'` survive a
  reload — and a stored `'rock'` read by an older build would fall back to the
  click rather than break.
* **V9 is specced and unbuilt.** `specs/9-count-in/` reads *ready to build*, and
  `lib/countIn/` already exists in the tree. It wraps a `Source`, so it and V10
  both touch source identity. They are independent features but the build order
  matters, and V10's tech spec has to say which it assumes.

* **Switching between funk and rock needs no download.** Both play the same four
  voices from the same 22 files, so the kit is already in memory. Whether the
  current code *knows* that — `select()` tears down the device and rebuilds it —
  is a question for the tech spec.

## The musician's findings

**The grid is 16 with the odd steps empty, and this is the same decision as the
fill.** `docs/music.md` §2's heading is *"The core patterns, on a 16-step
grid"* and it already writes rock at 16-grid positions; the table's `Grid 8`
column is the *felt* subdivision, not the notation. The deciding argument is
ADR 0010's invariant 4: a marked bar may not change `stepSeconds`, so on a
genuine 8-step bar the finest event placeable anywhere is an eighth and rock's
fill could only be four eighth notes — *"a stop, not a fill"*. The eight empty
odd steps are free capacity that only the fill spends, which changes content and
never grid.

Round-robin does not decide it: 3 takes is coprime with every power of two, so
both grids give a 3-bar take period and a 12-bar combined period. The humanize
arithmetic on 16 is funk's exactly, so nothing new is introduced.

**Rock's ordinary bar has no bar line except the kick velocity.** Every element
is invariant under a half-bar shift — the hat has period 4, the snare sits on 4
and 12 at one velocity, the kick on 0 and 8 — so with the two kicks equal the
figure states a two-beat loop and the downbeat is inaudible. `kick` 0.95 against
0.86 is 3.60 dB and is *the whole of* that cue. It is not decoration, and it is
the top listening item: if the bar line cannot be found with Fills off, widen
step 8 to 0.82 before reaching for anything else.

**What makes it rock rather than funk with notes removed**, concretely: the kick
is on 0 and 8, both quarters, where funk puts two of three off the quarter — and
no amount of deleting funk notes produces that. No ghosts at all, where funk's
three at 0.37 are its defining device. A flat hat, 3.2 dB across two rungs
against funk's 9.6 across three. No open hat in the ordinary bar, which is what
makes bar 2's land. Nothing on an odd step, ever, in an ordinary bar.

**The fill differs from funk's in kind, and the reason is arithmetic.** Funk is
already maximally dense, so its only gesture is subtraction — the hat stops.
Rock leaves eight steps empty, so its gesture is **addition**: the subdivision
doubles to sixteenths for the last six steps, which is the most recognisable
rock-fill device there is and needs no toms. Two further inversions of funk's:
**the kick keeps time underneath** (steps 8 and 12, equal at 0.86) where funk
removes it for thirteen steps, which is strictly better for a metronome; and the
**arrival is the downbeat, not step 15** — with the backbeat at 0.95 no snare
can sit a ladder step above it, so the fill crescendos *into* bar 1. Funk's
step-15 spine device does not transfer and does not need to.

**Humanize is shared, unchanged** — the same record, the same three numbers. On
a 16-step bar rock's bound is funk's arithmetic exactly: 4.00 ms at 80 bpm,
crossover at 112.5, 3.21 ms at 140. A second record would hold the same numbers
and be a second thing to drift. The name `STRAIGHT_FUNK_HUMANIZE` is now wrong
for what it holds, which is an architecture call rather than a musical one.

**The open hat behaves differently on this grid, measured.** The sample is
~4 dB down after a funk sixteenth (150 ms at 100 bpm) but ~12 dB down after a
rock eighth at 80 bpm, so the choke's audibility fades as tempo drops and the
hat reads as a sustained *tsss* rather than funk's clipped *tss*. It never rings
past its bar at any tempo. `CHOKE_S` needs no change. **Step 10 is the only
position available**: step 14 is impossible because rock's step 15 is empty, so
an open hat there has no closed hat after it inside the bar and invariant 5
fails.

**Nothing contradicts ADR 0006, 0007 or 0008**, no new library, still one credit
string, swing declared at 0, and `isQuarter(step, 16)` keeps the four dots
working unchanged.

## The three bars

Frozen. Written on a 16-step grid, `steps: 16`, `subdivision: 8`. The odd steps
are rests in bars 1–3. Voice order `kick, snare, hatClosed, hatOpen`, as
`figure.ts` writes it. Every dB below is the **rendered** level from
`velocity.ts`'s decibel-linear curve and `kit.ts`'s measured layer nominals, not
a velocity difference.

### Bar 1 / 3 — ordinary

| Voice | Steps | Velocity | Rendered |
| :-- | :-- | --: | --: |
| `kick` | 0 | 0.95 | −18.21 dBFS |
| `kick` | 8 | 0.86 | −21.81 dBFS |
| `snare` | 4, 12 | 0.95 | −17.67 dBFS |
| `hatClosed` | 0, 4, 8, 12 | 0.90 | −30.54 dBFS |
| `hatClosed` | 2, 6, 10, 14 | 0.82 | −33.73 dBFS |

No `hatOpen`, no ghosts, nothing on 1, 3, 5, 7, 9, 11, 13, 15.

### Bar 2 — light

Bar 1 with **one** edit: step 10's closed hat is removed and an open hat takes
it. Step 10 carries `hatOpen` only; step 14 stays closed.

| Voice | Steps | Velocity | Rendered |
| :-- | :-- | --: | --: |
| `kick` | 0 | 0.95 | −18.21 dBFS |
| `kick` | 8 | 0.86 | −21.81 dBFS |
| `snare` | 4, 12 | 0.95 | −17.67 dBFS |
| `hatClosed` | 0, 4, 8, 12 | 0.90 | −30.54 dBFS |
| `hatClosed` | 2, 6, 14 | 0.82 | −33.73 dBFS |
| `hatOpen` | 10 | 0.80 | −27.47 dBFS |

### Bar 4 — fill

Steps 0–8 are bar 1 verbatim. Step 9 is a rest. Steps 10–15 are the sixteenths.

| Voice | Steps | Velocity | Rendered |
| :-- | :-- | --: | --: |
| `kick` | 0 | 0.95 | −18.21 dBFS |
| `kick` | 8, 12 | 0.86 | −21.81 dBFS |
| `snare` | 4 | 0.95 | −17.67 dBFS |
| `snare` | 10 | 0.70 | −27.69 dBFS |
| `snare` | 11 | 0.62 | −30.89 dBFS |
| `snare` | 12 | 0.78 | −24.49 dBFS |
| `snare` | 13 | 0.70 | −27.69 dBFS |
| `snare` | 14 | 0.86 | −21.27 dBFS |
| `snare` | 15 | 0.78 | −24.49 dBFS |
| `hatClosed` | 0, 4, 8, 12 | 0.90 | −30.54 dBFS |
| `hatClosed` | 2, 6 | 0.82 | −33.73 dBFS |
| `hatOpen` | 10 | 0.80 | −27.47 dBFS |

No `hatClosed` on 10 or 14.

**The hat line here was revised after the first listening pass** — see
`## What the ear changed` at the end of this file. It originally stopped after
step 8 and opened nothing.

### The rest of the definition

`swing: 0`. `humanize: STRAIGHT_FUNK_HUMANIZE`, the shared record unchanged.
`seed: 0x5f_72_6f_63`, which must differ from funk's `0x5f_75_6e_6b` — the value
is not a musical decision, only its being fixed is.

### Why these numbers and not their neighbours

* **`kick` 0.95 / 0.86 — 3.60 dB.** The only asymmetry in the bar. Not
  0.90/0.86: 1.6 dB is half of `2 × DYNAMIC_RANGE_DB × velocityJitter`, so
  jitter alone could reverse it and the bar line would vanish on some bars and
  not others. 0.95 is also invariant 1's mandated step-0 velocity, so it is not
  free.
* **`snare` 0.95, against funk's 0.92.** Rock has no ghosts, so the snare has no
  lower rung to define it against and its authority has to come from absolute
  level. It is also the ceiling that forces the fill's arrival into the next
  bar. Freely reversible to 0.92.
* **`hatClosed` 0.90 / 0.82 — 3.19 dB, two rungs.** The top rung is funk's top
  rung unchanged, so the same hat leads both grooves. The lower is 0.82 rather
  than funk's 0.78 because 0.78 gives 4.79 dB — half of funk's 9.62 dB span —
  and the hat would read as funk's contour thinned rather than as even eighths
  with an accent. 0.08 is the minimum invariant 6 permits, which is the point:
  this ladder is meant to be barely a ladder.
* **The accent is on 0, 4, 8, 12**, not on the "&"s. Quarter-accented is the
  rock hat; accenting the offbeats is a funk device and would fight a kick and
  snare that are all on quarters.
* **`hatOpen` 0.80, not funk's 0.76.** Derived rather than copied, per
  [ADR 0008](../../docs/adr/0008-sample-calibration-is-derived-not-copied.md).
  Funk's open hat sits 6.26 dB above the closed hat it displaces; rock displaces
  a *louder* closed hat, so the same designed lift needs 0.80. Reusing 0.76
  would give 4.66 dB — a weaker event in the groove that has less open hat to
  lean on, not more.
* **One edit in bar 2, not funk's two.** Funk's second edit raises the step-15
  ghost; rock has no ghosts and step 15 is empty. Every other available edit is
  an addition on an odd step, which would spend bar 4's whole gesture two bars
  early.
* **Fill `snare` 0.78 on step 12 — 6.82 dB under the backbeat.** The largest
  departure in the design and the second listening item. The backbeat is not
  removed but demoted to the middle rung of the crescendo; 6.82 dB is two full
  ladder steps and a half, so jitter cannot restore it to backbeat authority.
* **The crescendo is two interleaved ladders, not one run.** A strictly rising
  six-note ladder at the 0.08 minimum, pinned at 0.78 on step 12, would end at
  1.02 — off the scale. So the stated eighths 10, 12, 14 rise 0.70 → 0.78 →
  0.86 and the added sixteenths 11, 13, 15 rise 0.62 → 0.70 → 0.78 one rung
  under, in parallel. The accents land on the groove's own subdivision, which is
  the metronome argument and the same reason the kick keeps time.
* **The fill peaks at 0.86**, 3.60 dB under the backbeat and 3.06 dB under the
  arriving kick. Nothing in the gesture out-shouts the figure.
* **`hatOpen` 0.80 on step 10 of the fill — bar 2's own event, at bar 2's own
  level.** Not a re-derivation: the reference is no longer a displaced
  neighbour but the light bar itself, so the absolute level is what carries.
  Bars 2 and 4 rhyme, and the light bar reads as a one-note preview of the
  fill.
* **`hatClosed` 0.90 returns on step 12, and invariant 5 is why.** An open hat
  with no closed hat after it inside the bar rings into the downbeat the fill
  exists to arrive at. Step 12 is the only position that keeps the ring to one
  eighth, as bar 2's is — step 14 would give the longest open hat in the app,
  750 ms at 80 bpm. 0.90 is the ordinary bar's own value there, so the edit
  introduces no new rung, and it re-marks a beat 4 whose snare is demoted 6.82
  dB.
* **`kick` 8 and 12 equal at 0.86**, deliberately. Two equal velocities are not
  a contour, so invariant 6 has nothing to bind — and the kick line is named as
  excluded from it in ADR 0010 anyway.

### The half-bar asymmetry, in numbers

Every element of the ordinary bar is invariant under a shift of 8 steps except
one:

| Element | Steps | Under +8 | Invariant? |
| :-- | :-- | :-- | :-- |
| `hatClosed` 0.90 | 0, 4, 8, 12 | same set | yes |
| `hatClosed` 0.82 | 2, 6, 10, 14 | same set | yes |
| `snare` 0.95 | 4, 12 | same set, same velocity | yes |
| `kick` positions | 0, 8 | same set | yes |
| **`kick` velocities** | 0 → 0.95, 8 → 0.86 | 0 → 0.86, 8 → 0.95 | **no** |

The shifted bar differs at exactly two of sixteen steps, by 3.60 dB, on one
voice. Set the two kicks equal and the bar becomes exactly invariant — a
two-beat loop with no downbeat. **That is what Track B step 2 asserts**, not the
two velocities.

### The listening items, each with its one cheapest fallback

| # | Item | Fallback |
| :-- | :-- | :-- |
| 1 | The bar line with Fills off | `kick` step 8 → 0.82, widening to 5.20 dB |
| 2 | Bar 4 beat 4, the backbeat 6.82 dB down | `snare` step 12 → 0.86, ladder to 0.78 / 0.86 / 0.94 |
| 3 | The hat ladder reading as even eighths | lower rung → 0.86, which is below invariant 6 and would have to be declared a flat line |
| 4 | Backbeat 0.95 against funk's 0.92 | → 0.92. Free; nothing else reads it |
| 5 | The open hat at 80 bpm, ringing 375 ms into its choke | `hatOpen` step 10 → 0.76 |
| 6 | Fill density, six sixteenths every 12.0 s at 80 bpm | drop steps 11 and 13 |

**None of the six has been heard.** The dB figures say what the levels are, not
whether the bar line can be found.

## Done when

* **A third entry in the select box plays rock**, on the same four voices and
  the same 22 files as funk — switching between the two downloads nothing.
  *Needs an ear:* whether the ordinary bar has a findable bar line with Fills
  off, which rests on 3.60 dB between the two kicks and nothing else.
* **`lib/groove/` holds machinery and data separately** — one cycle, one source
  factory, and a definition per groove carrying lines, humanize, swing, seed and
  its stated subdivision. Funk's sound is unchanged, so its behaviour tests pass
  unaltered.
* **Rock's three bars are as the musician wrote them**, and ADR 0010's six
  invariants hold for both grooves under the amended invariant 2.
* **`'rock'` survives a reload** — `SOURCE_IDS` carries it, so `storedSetup`
  validates it; one Fills toggle governs both grooves.
* **ADR 0010 is amended in place**, stating that a groove declares a
  subdivision and that the positions between its steps are rests.

## Size test

| | Question | Verdict |
| :-- | :-- | :-- |
| 1 | Five `## Done when` bullets or fewer? | ✅ exactly five |
| 2 | At most two or three concern folders? | ✅ **two** — `lib/groove/` and the feature's `components/`, plus one line each in `lib/setup/` and `src/lib/snippets/` |
| 3 | Leaves what `docs/music.md` marks as fixed alone? | ✅ no new voice, no new library, one credit string |
| 4 | Would one `git revert` roll it back? | ✅ |

**The first change in a while to pass all four.** No new samples, no licence
change, no scheduler change — the weight is the registry refactor, and that is
confined to one folder.

## Open

* Nothing. The spec is settled; open questions now belong to
  [tech-spec.md](tech-spec.md).

## What the ear changed

The first listening pass produced one verdict, and it overturned a design
decision rather than a number.

> *"I don't like the fill after 4 bars. I think the hat should also do something
> similar like open-hat on the 2nd bar fill"*

The fill originally stopped the closed hat after step 8 and opened none, on the
musician's argument that *"the hat and the snare state the same subdivision in
the same register, and a hat under the snare run would make the doubling a
texture change rather than a rhythmic one."* That argument is not wrong; it lost
to the ear, which is the order those two settle in.

**Two lines changed**, both inside steps 8–15 so invariant 3 is untouched:
`hatOpen` 0.80 added on step 10, and `hatClosed` 0.90 extended to step 12.
`sixInvariantViolations(ROCK)` stays empty and the snare ladder is untouched.

**What it trades away**, stated rather than glossed: the open hat sits 0.22 dB
*above* the snare's 0.70 at step 10, so the crescendo's bottom rung is masked at
the instant the fill departs and the ladder audibly begins at step 12. And the
closed hat on beat 4 briefly re-states the eighth pulse inside a sixteenth run,
so the second half reads a little more as texture and a little less as the
subdivision doubling.

**The alternative, if this is not what the ear wanted.** "The announcement":
`hatOpen` 0.88 *substituting* the closed hat on step 8, `hatClosed` 0.90 on step
12, step 10 left hat-free. The hat then opens on beat 3 *before* the fill starts
and decays across its entry, which is the more idiomatic rock placement —
drummers open the hat ahead of a fill, not on it. It was not picked because the
stated reference was bar 2, and this is a different event at a different step
and level. Three numbers in the same `FILL` const.
