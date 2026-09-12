# V15. Per-voice mute

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** tech spec

## What

* Mute a groove's instrument voices one at a time — *"we will add a muting
  feature per instrument voice."*
* One toggle per instrument. *"no distinction between open / closed hat"* — one
  hat toggle covers both.
* *"At least 1 instrument must stay audible (therefore no muting for the
  click)."*
* *"For each instrument, please find an icon to display in front of the
  toggle."*
* *"there must be an enable-all button as well."*
* *"Muting groups are persisted in localStorage as every other toggle as well."*

## Done when

* One row of three toggles — **Kick, Snare, Hat**, in that order, each behind its
  instrument pictogram — is present whenever a groove is selected and absent on
  the click.
* Muting a voice silences it in **every** bar, marked bars included, and lands
  within a bar without restarting the run; unmuting restores it. *Needs an ear:*
  that a thinned groove still keeps time and still sounds like a groove rather
  than a broken one.
* The last audible voice cannot be muted — its toggle is disabled, and at least
  one voice always sounds.
* **Enable all** is absent until at least one voice is muted, and clears the
  mutes of the selected groove only.
* Mutes persist **per groove** in the stored setup and come back on reload. A
  record written before V15 reads back complete rather than costing the tempo.

## Decided

* **Per-voice mute at all, against `specs/features.md`'s "Not building" row** —
  yes. The persona asked for it in as many words: *"Fewer beats, fewer
  instruments, still a groove."* Beat toggles only deliver the first half —
  muting beats 1 and 3 to lose the kick also kills the hat there, which is
  holes in the bar rather than a thinner layer. Sam: *"hat off — now it's kick
  and snare, and I have to hold the sixteenths myself while something still
  tells me where the backbeat is. That's the one I'd use most, and it's the one
  I cannot build today."*

* **What keeps it from being the drum machine the persona rules out** — it is
  one row of voice toggles, never a grid of voices against steps. Sam: *"If this
  lands as voices-by-steps, it's the producer's feature and I close the tab.
  Three buttons in the row I already have is not that."*

* **Mute, not level** — a voice is on or off, with no fader. Sam: *"volume is
  mixing and mixing is setup before sound."*

* **One hat, not two** — Fred's call, and Sam's independently: *"Open versus
  closed hat is a distinction I couldn't name and wouldn't want to see."* So the
  UI voice `hat` mutes `hatClosed` and `hatOpen` together.

* **The click gets no mute row** — it has one voice, and the last audible voice
  can never be muted, so every toggle it could show would be dead. Consistent
  with `FillsToggle` and `CountInToggle`, which are already absent while the
  click plays: *"a checkbox that does nothing is a control I have to read past
  on the way to play."*

* **The row shows only the voices the selected groove has** — not a fixed four
  with the absent ones greyed out. Sam: *"What does cost me is a control that's
  there and doesn't do anything… a toggle I can press that changes no sound is
  the app lying to me, and I work by ear, so I'd never find out I'd been lied
  to."* Rock and funk get kick / snare / hat; bossa gets kick / snare / hat /
  rim.

* **The order never reshuffles.** Kick, snare, hat in that order every time,
  anything else on the end. Sam: *"I reach for hat by position, not by reading
  it."* `VOICE_ORDER` in `grooves/definition.ts` already states this order and
  the row takes it from there rather than declaring a second one.

* **Mutes are remembered per groove, not once for the app.** Sam: *"Tuesday…
  rock at 92, hat off… Then I switch to bossa — and the bossa comes up as kick
  and rim with no hat. Bossa's hat is the flat eighths that make the thing a
  bossa… I wouldn't think 'ah, my mute carried over,' I'd think the app's bossa
  is wrong."*

* **"Enable all" appears only once something is muted.** On a first open nothing
  is muted, so the button would be a dead control on the one screen that has to
  be all Play. Same rule that already hides `FillsToggle` on the click. Sam
  marked this his least certain answer: *"If you'd rather have it always sitting
  there for layout reasons, I won't fight you."*

* **Mute is a filter over the rendered hit stream, never a selector that picks a
  different bar.** `musician`: done this way *"invariant 3 survives trivially —
  the same voices vanish from the marked bar's first half and from the ordinary
  bar it is compared against, so they still match."* This is also the answer to
  Sam's fill question from the approval: mute the snare and bossa's fill loses
  its two notes, nothing else moves. Sam's condition — *"what I can't have is it
  changing per bar so I can't tell whether the mute took"* — is met by
  construction.

* **ADR 0010's invariants bind the written figure, not the audible result.**
  Forced, not chosen: `musician` showed the feature cannot ship otherwise —
  invariant 1 dies the moment anyone mutes the kick, invariant 2 dies on the hat
  mute in all four grooves, invariant 6 dies on a snare mute in rock. The code
  already reads this way (`sixInvariantViolations` takes a `GrooveDefinition`
  and knows nothing of mutes), so nothing changes; ADR 0010 gains one sentence
  saying why. The ADR exists to stop *the app* pulling the floor out silently,
  and a mute is the player's own act on a control they pressed and can un-press.

* **`rim` and `snare` are one toggle, called "Snare."** Fred's call, over
  `musician`'s objection. The row is therefore the same three toggles in every
  groove — **Kick, Snare, Hat** — in that order, and `VOICE_ORDER`'s existing
  order already states it. The mapping: `kick → kick`, `snare → snare, rim`,
  `hat → hatClosed, hatOpen`.

  What was overruled, so it can be revisited rather than rediscovered.
  `musician` argued the hat collapse rested on the two voices being **one line**
  — in rock's light bar step 10 is a substitution, `hatClosed` gives the step up
  and `hatOpen` takes it — and that rim and snare are built the opposite way:
  `bossaNova.ts` writes the fill's snare on odd steps, *"positions bossa never
  states, which is why they cannot be mistaken for one."* Also `exactVoices:
  ['rim']` exempts the rim from displacement and not the snare, and
  `docs/music.md` §4 files `rim` with the click voices rather than the backbeat.

  **The risk that comes with the decision**, in `musician`'s words: *"Sam reaches
  for the backbeat-removal exercise he knows from rock, presses the same-looking
  button in bossa, and deletes the clave instead. He works by ear and would not
  diagnose it; he would conclude the app's bossa is wrong."* Sam, asked directly,
  accepted that cost: *"on day one it sounds broken. I'd press it, hear the clave
  go, and press it straight back… On day forty it's the one I reach for."*

* **The icons are hand-drawn inline SVG pictograms of the instruments** — a kick
  drum front-on, a snare with its stripe, a hi-hat's two cymbals on a stem. No
  icon library ships a kick/snare/hat set (the popular ones have one generic
  drum), so a dependency would buy nothing, and the app has three runtime
  dependencies today. Drum-notation noteheads were rejected as the vocabulary
  the persona says Sam never learned: *"learned by ear and by tab, never by
  theory."*

* **The last audible voice's toggle renders disabled**, rather than accepting a
  press and refusing it. A refusal hidden behind a normal-looking control is the
  silent failure ADR 0010 and the Fills checkbox were both written against. The
  known cost, which the wrap-around and swap options were offered to avoid: Sam
  is not looking at the screen, so a press he cannot make tells his ear nothing.
  Accepted because the state is reached only by muting two of three voices
  yourself, one press at a time.

## Open

* Nothing in the product. `tech-spec.md` carries the build questions: where the
  glyphs live given that `src/components/` forbids a domain word in a primitive's
  name, and the stored shape for a per-groove mute set.
