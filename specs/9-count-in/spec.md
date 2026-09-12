# V9. Count-in

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 9` (after 8)

## What

* *"Add an optional count-in before a groove starts."*
* *"4 clicks — as many clicks as 1 bar has beats."*
* *"Only for grooves, not for click."*
* *"Checkbox, initially turned off."*
* *"Stored in localStorage like other inputs."*

## Done when

* **Ticked, a Start press sounds one bar of four claves — 0.65 on beat 1 and
  0.50 on the other three, exact on the grid — and then bar 1 of the groove,
  with no claves anywhere after it.** *Needs an ear:* whether the seam reads as
  a handoff rather than as the app changing its mind.
* **The groove is bit-identical whether the count-in ran or not** — the same
  round-robin take sequence, the same displacement per step, the same downbeat.
  The groove's absolute step starts at 0 either way; the count-in occupies no
  part of its timeline.
* **The box is off on a first visit and survives a reload**, validated on its
  own so a bad stored value falls back to off without discarding the tempo, the
  groove or the fills flag.
* **The box is hidden while the click is selected**, and no count-in ever
  precedes the click down any path.
* **No count-in on the tap-tempo return, or on switching source mid-run.**
  Pressing Stop during the count-in stops it, and nothing of the groove sounds.

## Decided

* **How many counts** — one bar's worth, written as `BEATS_PER_BAR` rather than
  as the literal 4, because `docs/music.md` §5 Q5 leaves meter open and a
  hard-coded 4 is the thing that makes answering it expensive.
* **One bar at every tempo, with no threshold** — 6 s at 40 bpm and 1.3 s at
  180, and neither is shortened or doubled. Sam: *"four clicks at the speed I
  just asked for … the count tells me the tempo I'm about to play in."* On an
  eighth-note count at slow tempos: *"at 40 bpm slow is the thing I'm
  practising — shortening the wait by making the count faster hands me a tempo
  that isn't mine."* On a two-bar count at fast tempos: *"a tempo threshold is
  a rule I'd have to learn and couldn't hear — that's the trainer we didn't
  build."*
* **Default off** — the user's call. The count-in is for playing along from a
  standing start; someone looping a groove to practise over does not want to
  hear it every time they restart.
* **Click excluded** — a count-in on the click would be four claves before four
  claves, which states nothing.
* **The count-in is the claves click, accented on 1, exact on the grid** — the
  seam between the count and the band is the whole feature, and only a voice
  the groove never uses states it. Sam: *"Four beats of click, then the kit
  comes in and the click is gone — that seam is the whole point."* A hi-hat
  count was rejected in its own words: *"I'd be guessing whether the groove had
  started — that's the one outcome that makes the count-in worse than no
  count-in."* The cost is accepted: a groove's device now decodes
  `claves_mf.flac` alongside the 22 kit samples. Sam on that: *"One more sample
  next to a whole kit is nothing."*
* **The beat dots light normally through the count-in** — index 0 to 3, the
  same as any bar. Sam settled it by refusing the question: *"I'm two metres
  away with my eyes on the fretboard or shut. I won't see any of the three
  options, so pick the one that costs nothing to build."* The one shape ruled
  out is a dark row: *"Dark reads as 'nothing is happening' … the whole point
  of the count-in is that something is happening."* The count is stated by the
  claves and by nothing else — per `docs/persona.md`, *"nothing may be knowable
  only by looking."*
* **The checkbox is hidden while the click is selected**, exactly as V8's
  Fills box is, rather than greyed out. Sam: *"A greyed-out checkbox is one
  more thing between me opening the page and hitting play, and it's a thing
  that doesn't even do anything."* The discoverability argument for greying it
  out belongs to the student with a syllabus, who `docs/persona.md` names as
  not the persona.
* **A count-in fires only when sound starts from stopped.** The tap-tempo
  return and a mid-run source switch both carry straight on. Sam on tapping:
  *"I do it three or four times in a row to land on the thing I heard. Four
  claves before every return would make me stop using the feature — or worse,
  stop tapping."* On switching: *"I'm already in time — the bar is running …
  four claves would put the click back in the middle of the thing I just
  switched away from."*
* **The count-in is never humanized.** It is a click, and
  [ADR 0007](../../docs/adr/0007-a-groove-is-humanized-a-click-is-not.md)
  already says a click is exact. Nothing in the count-in reads the groove's
  seed, swing or displacement.

## Open

Nothing. The spec is settled; the remaining questions are the tech spec's.
