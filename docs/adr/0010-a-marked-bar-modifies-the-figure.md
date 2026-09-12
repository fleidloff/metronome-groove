# 0010. A marked bar modifies the figure and never replaces it

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

V8 added a four-bar cycle to the straight funk groove: bar 2 carries a light
variation, bar 4 a fill, and bars 1 and 3 are the ordinary figure. The obvious
way to build it was the sibling project's, which V8 was explicitly asked to
resemble — and daily-groove **replaces** a marked bar outright: *"a marked bar
emits only the phrase's voices."*

That works next door and fails here, for a reason that is about what the two
apps are rather than about taste. daily-groove renders a finite file, where the
marked bar is the last of a four-bar pass and the next thing is a new pass. This
app loops indefinitely and the loop is a **timing reference** someone is playing
against. Replacing the bar removes the hat's sixteenths for one bar in four —
25% of practice time with no stated subdivision. That is not a fill; it is the
gap-click method `docs/music.md` §1 lists as a separate thing a player builds by
hand with the beat toggles.

The persona put the failure mode more usefully than the theory does. Asked what
happens when a bar-replacing fill arrives while playing:

> That takes the hat away for a whole bar and moves the backbeat, at the exact
> moment I have to come back in on 1. That's not a fill happening next to me,
> that's the floor going out.

And it fails **silently**: *"I wouldn't diagnose it. I'd notice I kept stumbling
every fifteen seconds, decide the app was off, and go back to the click."*

## Decision

**A marked bar modifies the ordinary figure. It never replaces it.** Six
invariants bind every bar this app will ever play, marked or not:

1. `kick` sounds on step 0 at velocity 0.95.
2. Every one of the 16 steps carries at least one hit, so the grid is never
   interrupted.
3. Steps 0–7 are the ordinary figure — a marked bar identifies itself as this
   groove before it departs, and a fill lives in the second half of the bar.
4. Nothing in a marked bar changes `stepSeconds`, swing, the seed or the
   humanize bound. A fill is a change of content, never of grid.
5. Every `hatOpen` step is followed by a `hatClosed` step inside the same bar.
6. Adjacent non-ghost velocities in a designed contour differ by at least
   `2 × DYNAMIC_RANGE_DB × velocityJitter` — today 0.08, or 3.2 dB.

**Invariant 6 is derived, not chosen.** `gainTrim` is ±1.6 dB per hit, so two
notes 0.08 apart are 3.2 dB apart and worst-case jitter closes exactly that:
every designed contour step can be **flattened but never reversed**. It is
scoped to the contours a variation designs and deliberately excludes V6's kick
line, where 0.82 → 0.86 is half a ladder step and is frozen by the toggle-off
guarantee.

**How far a bar may depart is a rule, not a feeling: steps 0–7 stay ordinary and
the gesture lives in steps 8–15.** The first half of a 4/4 bar establishes and
the second half is where a one-bar fill lives — which is why drummers start
fills on beat 3 or 4. A fill beginning at step 0 has abandoned the bar, and
abandoning the bar is the one thing a metronome may not do.

## Consequences

**What this buys.** A groove can stop being wallpaper without stopping being a
reference. The player keeps a stated downbeat, an uninterrupted sixteenth grid
and two ordinary bars in every four.

**What it costs, and this was argued.** The persona asked for three anchors —
kick on 1, snare on 2 and 4, **and** the hat stating sixteenths. The user
overruled the last two: *"we need snare and also hat variations for the fill…
it will make practicing more fun for Sam because it feels more like playing a
song. If he doesn't want it, there is always the toggle."* Releasing the hat is
what made the fill possible at all — under the three-anchor rule the musician
could only add snare notes beneath an unbroken hat, *"a busier bar rather than a
different one"*, and the gesture that carries bar 4 is the hat **stopping** for
seven steps.

So the bet this record carries is explicit: a variation that loses a player
loses them silently, and the toggle is what converts that into a visible
control. It only works if a player connects the stumbling to the box.

**What it rules out.** Porting a sibling feel's `FILLS` phrase directly — those
are written to replace. Any variation that mutes the downbeat, opens a hole in
the grid, or changes the grid itself.

## Alternatives considered

- **Replacing the bar, as daily-groove does** — lost on the gap-click argument
  and on the persona's account of the failure being undiagnosable.
- **The persona's three anchors** — lost to the user's judgement that the
  resulting gesture was too small to be worth having, with the toggle as the
  mitigation.
- **Buying the pack's toms for a descending fill** — lost on measurement rather
  than on cost: the tom files ship **two** round-robins per layer, and 2 divides
  16, so every fill would play the identical two files in the identical order
  for the life of the run. That is the bit-identical-loop defect V6's
  absolute-step indexing exists to prevent, landing on the most exposed bar in
  the loop.
