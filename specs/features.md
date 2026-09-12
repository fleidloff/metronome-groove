# Features

Every change to this app, and every change we have considered. One row per
change, in both tables.

- **`specs/<N>-<title>/`** is where a change is designed and built. The folder
  stays after it ships — it is the record, not scratch.
- **Implemented** is the archive: what landed, when, and what it produced.
  `/implement-vibe-with-docs` writes the row.
- **Candidates** is the backlog: things worth building, with enough of a note to
  pick one up cold. A candidate is not a commitment and carries no number until
  `/vibe-with-docs` allocates one.

Numbers are never reused. `N` for a new change is one higher than the largest
in either table.

---

## Implemented

| N | Title | Shipped | What landed |
| :-- | :-- | :-- | :-- |
| [13](13-second-line/) | Second line | 2026-09-12 | A New Orleans street-parade feel, and the groove that removes the backbeat: the snare states **no quarter at all**, answering every beat half a beat late on the "and" of 2 and the "and" of 4. Three things compensate in every bar — the hat's three rungs, the kick on 0 and 12, and a fixed two-step run-in to the downbeat — and beats 2 and 3 are carried by the hat's 0.90 rung alone, which is the exercise. Its fill is the only one in the app that **adds**: rock's and funk's gesture is the hat stopping, and here there is no backbeat underneath to hold the bar, so the hat plays all sixteen steps and the snare fills in the gaps its ordinary figure hints at, capped 3.06 dB under the downbeat kick. The first groove to *lilt* rather than shuffle, at swing 0.2 on a stride-1 grid. It produced **no ADR** — the first groove to stress [ADR 0010](../docs/adr/0010-a-marked-bar-modifies-the-figure.md) without needing to change it, which is evidence the record generalised correctly rather than evidence it should be superseded. Its spec predated V12 and gained an `## Amended at build time` section: [ADR 0014](../docs/adr/0014-swing-warps-the-grid.md)'s warp made "no even step is ever displaced" false at stride 2, so the guarantee is now asserted as *the quarters never move*, over every selectable groove. `docs/music.md` §2 gained the written figure it had never carried, guarded by a test that derives every step list from the definition so the two cannot drift. The build also found the spec contradicting itself: its third compensation promised *"near-silence on 15"* in every bar, which the fill breaks with a tap. A musician kept the tap and restated the rule as *the loudest snare on 14, then a drop of at least 14 dB* — 19.06 dB ordinary, 20.54 light, 14.64 fill — which is measurable and now tested in all three bars. |
| [12](12-shuffle/) | Shuffle | 2026-09-12 | The first groove in the app that is not straight, and the change that turned swing on — the mechanism had shipped in V6 and never once run at a non-zero value. Written that way it delayed single odd steps, so a groove stating eighths kept its sixteenths at 0.25 and 0.75 of the beat: straight sixteenths against a 2:1 pulse, which in a shuffle are wrong notes rather than ornaments. Swing now **warps the grid** — every stated step moves and the grid between two of them stretches with it — so a sub-eighth lands on the triplet and `{0, 1/3, 2/3, 5/6}` of each beat is reachable, which is what makes the fill possible at all. Funk and rock are bit-identical, by arithmetic rather than by tolerance. Shuffle is not rock at a different number: the kick on step 10 sounds at 2/3 of beat 3, the hat ladder widens to 4.79 dB, and the fill's gesture is the middle triplet *arriving* where rock's is a doubling to sixteenths. Produced [ADR 0014](../docs/adr/0014-swing-warps-the-grid.md), and corrected two wrong sentences — `swing.ts`'s doc comment, which claimed `1` landed on the next on-beat, and `docs/music.md` §2's *"same notes as rock, played at swing 0.64"*. |
| [11](11-bossa-nova/) | Bossa nova | 2026-09-12 | A two-bar son clave over a one-bar kit — the first groove whose ordinary figure is longer than a bar, which made `GrooveDefinition.ordinary` an array of bars and generalised ADR 0010's invariant 3 to read against the ordinary bar of the same *phase*. The clave shipped on `rim` and a listening pass sent it back: `rim` is measurably MuldjordKit's snare, not the cross-stick `docs/music.md` called it, so the clave moved to `claves` at its own nominal and the count-in collision was accepted knowingly. `Humanize` gained `exactVoices`, because a voice doubled by the hat on every step it sounds can only be flammed by displacement, never enlivened. Fetching became per groove: a definition declares its voices and the bank grows, so nothing downloads a voice it does not play. Amended [ADR 0008](../docs/adr/0008-sample-calibration-is-derived-not-copied.md) (the stated 20 ms window never produced `kit.ts`; 200 ms RMS does) and [ADR 0010](../docs/adr/0010-a-marked-bar-modifies-the-figure.md) (a second dated amendment, and a note that a third should supersede it instead). |
| [10](10-rock-groove/) | Rock | 2026-09-12 | A second groove — straight 8th rock — on the same four voices and the same 22 files as funk, with its own light bar and fill. The change that turned *the* groove into *grooves*: `lib/groove/` is now machinery plus one data file per groove, so a third costs one file. Rock is written on the 16-step grid and *states* the eighth, which amended ADR 0010's invariant 2 in place — a silent step is a rest, not a hole. Switching between two grooves now fetches nothing, because the device is keyed by its sample bank rather than by its source. Produced [ADR 0012](../docs/adr/0012-a-groove-is-data.md) and [ADR 0013](../docs/adr/0013-a-device-is-keyed-by-its-bank.md), and amended [ADR 0010](../docs/adr/0010-a-marked-bar-modifies-the-figure.md). |
| [9](9-count-in/) | Count-in | 2026-09-12 | An optional bar of clicks before a groove starts — the click's own accent pattern on claves, exact on the grid, then the kit and no claves again. Off by default, hidden while the click plays, stored in V7's setup record. It fires only on a Start press: never on the tap-tempo return and never on a mid-run source switch. Built as a `Source` that wraps a `Source`, which forced `Source.takeStep` — round-robin take selection had been reading the scheduler's raw step, so without it a count-in would have rotated the groove's takes by one in three for the whole run. Produced [ADR 0011](../docs/adr/0011-a-pre-roll-is-a-source-that-wraps-a-source.md). |
| [8](8-groove-variations/) | Groove variations | 2026-09-12 | The funk groove runs a four-bar cycle — ordinary, light, ordinary, fill — derived from the absolute step, shown on screen as one bar. A marked bar modifies the figure rather than replacing it: six invariants hold in every bar, and the fill's gesture is the hat stopping for seven steps. A "Fills" checkbox, on by default, hidden while the click plays, stored in V7's setup record. With it off the render is bit-identical to V6. Produced [ADR 0010](../docs/adr/0010-a-marked-bar-modifies-the-figure.md). |
| [6](6-straight-funk-groove/) | The first groove — straight funk | 2026-09-12 | A one-bar funk groove selectable instead of the click: kick, snare and both hats, 22 samples fetched when the groove is chosen. The scheduler now walks a 16-step grid and asks a `Source` what sounds, so the click is a source like any other. A groove's hits are displaced by a bounded, stateless offset that never accumulates; the click stays exact. Produced [ADR 0006](../docs/adr/0006-rhythm-instruments-only.md), [0007](../docs/adr/0007-a-groove-is-humanized-a-click-is-not.md) and [0008](../docs/adr/0008-sample-calibration-is-derived-not-copied.md). |
| [7](7-remembered-setup/) | Remembered setup | 2026-09-12 | The tempo and the groove are kept in `localStorage` and come back on the next visit; a first visit opens at 100 bpm on the click. One versioned object, each value validated on its own so a renamed groove cannot forget the tempo. Produced [ADR 0009](../docs/adr/0009-the-setup-lives-in-the-browser.md). |
| [5](5-design-system-extraction/) | Design system extraction | 2026-09-12 | Eight primitives lifted out of the metronome slice into `src/components/` — `Button`, `Slider`, `Readout`, `Dot`, `List`, `Stack`, `PageFrame`, `Eyebrow` — and a lint rule that keeps them there: no `className` under `src/features/`. The `Space` scale gained its first consumer and widened to carry 10 and 12. Class assertions split by subject: the design system proves a variant is distinct, the feature proves it asked for it. Produced [ADR 0005](../docs/adr/0005-styling-lives-in-the-design-system.md). |
| [4](4-bluetooth-tap-tempo/) | Start and stop from the speaker | 2026-09-12 | The speaker's button starts and stops the click, on Chrome. Specced as tap-tempo-over-Bluetooth; a hardware probe cut it to this, and the probe's findings are [ADR 0004](../docs/adr/0004-bluetooth-media-buttons.md). Absent on Firefox by decision, not degraded. Armed by the first on-screen press, because a browser will not let an untouched page claim a media session. |
| [3](3-tap-tempo/) | Tap tempo | 2026-09-12 | Tap a tempo on screen: the click goes quiet while you tap and returns at the new tempo when you stop. No tap count — the tapping commits when it stops, after two beats of whatever was tapped (two seconds flat while there is only one tap). Shares one value with the slider. |
| [2](2-simple-4-4-metronome/) | Simple 4/4 metronome | 2026-09-12 | A claves click scheduled on the audio clock: start/stop, a 40–180 bpm slider, four beat dots, and an accent on beat 1 driven by a reusable velocity curve that future grooves share. Compensates the sample's 8.3 ms lead-in. Also moved every user-facing word into `src/lib/snippets/`. Produced [ADR 0003](../docs/adr/0003-snippets.md). |
| [1](1-next-app-scaffold/) | Next.js app scaffold | 2026-09-12 | Next 16 / React 19 / TypeScript / Tailwind v4, Vitest + Testing Library, and the import graph turned from a description into an enforced, tested fact. One stubbed `metronome` slice reached through its `index.ts`. Produced [ADR 0001](../docs/adr/0001-enforced-import-graph.md) and [ADR 0002](../docs/adr/0002-tailwind-v4.md). |

---

## Candidates

Seeded from [docs/music.md](../docs/music.md). Nothing here is decided.

### The spine

| Candidate                                                                              | Why | Notes |
|:---------------------------------------------------------------------------------------| :-- | :-- |
| ~~Next.js app scaffold~~                                                               | — | Shipped as V1 |
| ~~Synthesized click~~                                                                  | — | Shipped as V2, with a claves sample rather than synthesis |
| ~~Tempo control~~                                                                      | — | Shipped as V2: a 40–180 bpm slider |
| ~~Tap tempo~~                                                                          | — | Shipped as V3 |
| sync display with external audio with mic                                              | — |  |
| fill-ins for grooves every x bars                                                      | — |  |
| increase tempo by 5 every time you stop and resume                                     | — |  |
| groove variations (after 2 and 4 bars, still displayed as 1 bar, optional, selectable) | — |  |
| ~~optional count-in 4 clicks for grooves~~                                              | — | Shipped as V9 |
| store settings in localStorage                                                         | — |  |
| disable single instruments from a groove (add icons for the instruments)               | — |  |
| add more grooves                                                                        | — | Rock V10, bossa V11, shuffle V12, second line V13; one file per groove |
| Bluetooth remote — *specced as [V4](4-bluetooth-tap-tempo/)*                           | Set the tempo without touching the phone | **Leads with a probe**: a diagnostic page run on a phone paired to a real speaker, measuring what a double press actually sends and where the firmware starts swallowing presses. Its answer decides whether V4 has a tap-tempo half or ships play/stop only |
| Tempo control                                                                          | A metronome's one required input | music.md Q2 — continuous or a ladder — decides whether anything can be pre-rendered |
| Time signature / meter                                                                 | Four of the thirteen grooves need it | music.md Q5. Building 4/4-only is cheaper and forecloses waltz, 6/8 and odd meters |
| Accent scheme                                                                          | Beat 1 against the rest is the minimum useful structure | `cowbell` on 1, `claves` on 2–4 is music.md's first try |

### Reference thinning — one row of toggles, not a menu of methods

**This section was rewritten after `docs/persona.md` was written.** It used to
list thirteen named practice methods — gap click, displacement, drift test,
tempo ladder — as features to build. The persona rules that out in as many
words: *"It is an instrument, not a trainer. No methods, no progression, no
memory of how they did. The practice techniques exist — they build them by hand
with the beat toggles, and the app never mentions them."*

So there is one candidate here, not ten. The methods in
[docs/music.md](../docs/music.md) §1 stay as **reasoning about why thinning
matters** — they are not a backlog.

| Candidate | Why | Notes |
| :-- | :-- | :-- |
| Beat mute toggles | The whole of reference-thinning, in one row | Tap a beat to mute it for every voice at once. Backbeat-only, one-per-bar and gap click all fall out of this without the app naming any of them. The persona is explicit that muting is per-beat and not per-voice: *"a grid of voices against beats is a drum machine and they did not ask for one"* |

### The groove layer

The premise of the project, and the expensive half.

| Candidate | Why | Notes |
| :-- | :-- | :-- |
| ~~Sample pack: copy, decode, schedule~~ | — | Shipped as V6: decoded and scheduled live, 22 files copied, one CC-BY string in the UI |
| ~~One groove end to end~~ | — | Shipped as V6, with 16th funk rather than straight 8th rock |
| ~~Groove under the click~~ | — | Answered against in V6: the groove *replaces* the click, because its hat already states every sixteenth |
| The nine playable 4/4 grooves | What the pack can play today | Everything in music.md §2 except samba and the non-4/4 rows |
| Clave-based grooves | Bossa and samba are written around a two-bar key pattern | The pattern *is* the groove; get it right before the kit around it |

### Product

| Candidate | Why | Notes |
| :-- | :-- | :-- |
| **Tell the player the speaker needs one press first** | V4 ships a feature nobody can discover | A browser will not let an untouched page claim a media session, so the speaker's button does nothing until Start has been pressed once on screen. A player pressing the speaker on a fresh page gets silence and no way to find out why from two metres away. Needs to say it **without** becoming setup-before-sound, which `docs/persona.md` names as a thing that loses Sam — so probably a line that appears only where it is relevant, and never a modal or a tutorial |
| Use `nexttrack` from the speaker | A second signal the hardware does deliver | Deferred from V4 deliberately. A double press arrives as `nexttrack`; [ADR 0004](../docs/adr/0004-bluetooth-media-buttons.md) has the measurements. What it should *do* is undecided |
| ~~Persisted setup~~ | — | Shipped as V7 |
| ~~Credit strings in the UI~~ | — | Shipped as V6: one always-visible line below Play. DRSKit's second string is not shipped, because no groove plays the ride |

### Ruled out by the persona

Kept visible so they are not re-proposed as good ideas.

| Not building | Why |
| :-- | :-- |
| Streaks, scores, accuracy readouts | *"Being graded… that is homework, and homework is the thing they quit three times."* |
| Named practice methods or a progression | *"It is an instrument, not a trainer."* |
| Per-voice mute grid | *"a grid of voices against beats is a drum machine and they did not ask for one."* |
| An account | *"No account, and nothing to lose."* |
| Anything in the lead register | *"Sam brings the melody instrument."* |
