# V11. Bossa nova

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** spec

## What

* *"Another rhythm: bossa nova."* A third groove beside the click, rock and
  straight funk.

## Done when

* (to be written)

## Decided

* (nothing yet)

## What this change runs into

Facts about the tree, read before any question was asked.

* **The clave is two bars, and every groove so far has had a one-bar ordinary
  figure.** `docs/music.md` §2 writes bossa as *"rim — son/bossa clave, two
  bars"* over a one-bar kit, and gives the bossa clave 3–2 as bar 1 on steps
  `0, 6, 12` and bar 2 on `4, 10`. V10's `GrooveDefinition` carries a single
  `ordinary` line set. This is the change's real weight and it is structural,
  not musical.
* **It collides with ADR 0010's invariant 3.** *"Steps 0–7 of every bar are the
  ordinary figure"* — a marked bar identifies itself before it departs. With a
  two-bar clave there are **two** ordinary bars, so the invariant has to say
  which one a marked bar is measured against. This is the second time ADR 0010
  has needed generalising; V10 already amends invariant 2 for rests.
* **The four-bar variation cycle and the two-bar clave have to agree.** The
  cycle is ordinary / light / ordinary / fill. A two-bar clave means bars 1 and
  3 are *different* ordinary bars, and bars 2 and 4 fall on opposite halves of
  the clave. That is a feature — the clave completes twice per cycle — but only
  if it is stated rather than discovered.
* **The clave's instrument is not settled, and one option costs nothing.**
  `public/samples/claves_mf.flac` is already shipped as the click's voice, CC0
  from VCSL, owing no attribution. The sibling puts its bossa clave on a `rim`
  because its kit had one and it was saving the claves for another feel — and
  its own note says *"`claves` and `rim` never sound in the same groove"*. The
  pack's `rim` is 6 files, MuldjordKit, so it adds no credit string but does
  need ADR 0008 calibration from measurement.
* **Tempo 120–140, swing 0.** `docs/music.md` §2. The app offers 40–180 for
  every groove and V6 settled that grooves are not clamped.
* **It stacks on two unbuilt changes.** V9 (count-in) is mid-build in the
  working tree and V10 (rock, and the groove registry) is specced but unbuilt.
  V11 needs V10's registry — without it there is nowhere for a third groove to
  go.

## Sam's verdict

**Wants it, and expects to use it more than funk.** *"Funk is what I put on for
twenty minutes before dinner with the guitar… Bossa is a different session. I'd
pick it up with the sax and just play over it for an hour."* The reason is the
persona's plainest line: *"A bossa is a groove I'd listen to. That's not a
smaller reason, it's the bigger one — the metronome on my amp is
face-to-the-wall precisely because nobody wants to listen to it."*

**The two-bar clave is easier to hold time against, not harder** — because the
kit under it never stops stating the bar. *"The hat states the eighths every
bar, the kick states 1 every bar. The clave floats over the top… A two-bar
figure is more like a second musician, not less. It's the first thing in this
app that behaves like a song instead of a loop."*

**Hard condition: the clave must never be the only thing playing.** *"If a
thinning pass or a light bar ever leaves the clave alone over silence, I am lost
inside four seconds… The clave is not a reference. The kick and the hat are the
reference; the clave is the thing I'm playing against."*

**And a warning about humanize.** The clave's notes are all syncopated and all
exposed, with no dense hat line around them to reference. *"That's the worst
possible place for the humanised offset… a wobbling clave over a straight kit is
the sound of 'a groove that breathes', and I would just say the app felt
wrong."*

## The collision Sam found, which is real and documented

**Putting the clave on `claves` breaks V9's count-in**, and V9 excluded the
click for exactly this reason.

`specs/9-count-in/spec.md` decides: *"The count-in is the claves click, accented
on 1, exact on the grid — the seam between the count and the band is the whole
feature, and **only a voice the groove never uses states it**."* And it excludes
the click because *"a count-in on the click would be four claves before four
claves, which states nothing."*

A bossa whose clave is on `claves` recreates that defect: four claves counting
in, then five more claves as the figure. Sam: *"I cannot hear where the count
ended and the band started."*

**So the instrument question is one decision, not two.** Either the clave takes
the `rim`, or the count-in needs a different voice when bossa is selected. Sam
declined to choose — *"that's a cost question, and six files of work versus a
count-in special case is yours to weigh"* — and noted what spending the claves
costs later: `docs/music.md` §4 says `claves` and `rim` are near-duplicates,
*"both are the dry high crack a groove reaches for once"*, so whichever bossa
takes, the next groove wanting one has nothing left.

## Open

* **What plays the clave, and how does a two-bar figure fit a one-bar
  definition?** — asking the `musician` and `sam` before putting options.
