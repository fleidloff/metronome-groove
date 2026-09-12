# V10. Rock

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 10` (after 9)

## What

* A second groove: **straight 8th rock**, *"simply called rock"*.
* *"Same four voices as the funk groove, no new samples."*
* *"It gets its own variation bars like the funk groove does"* — a light bar 2
  and a fill bar 4, under [ADR 0010](../../docs/adr/0010-a-marked-bar-modifies-the-figure.md).

## Done when

* (to be written)

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
