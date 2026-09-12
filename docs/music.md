# Music

Research notes for a metronome that plays grooves. Three parts: what a
metronome is for, which grooves are worth training against, and what the sample
pack we already have can actually play.

Nothing here is a decision yet. [architecture.md](architecture.md) governs where
code lives; this document will govern what it sounds like once we start.

---

## 1. What a metronome does, and what it does not

A metronome states **pulse**. It states nothing else — not the subdivision, not
the backbeat, not the feel. Everything a player finds hard about time lives in
what the click leaves out.

Three jobs it does well:

| Job | How it shows up |
| :-- | :-- |
| Reference | An external pulse to align against, so drift is audible instead of felt |
| Diagnosis | Where you rush or drag becomes a specific bar, not a vague impression |
| Ladder | A fixed tempo you can raise in steps, so difficulty is a number |

Two things it does badly, both well documented by teachers:

- **Click-dependency.** Timing locked to a click does not transfer to a band.
  The common cure is to thin the click out — 2 and 4, then one per bar, then
  silence — rather than to practise with it more.
- **Stiffness.** Players confuse *even* time with *rigid* time and tighten up.
  A groove does not produce this; a click does.

### Standard practice methods

These are the techniques a metronome app is expected to support. They are all
ways of giving the player *less* reference, not more.

| Method | Click lands on | Trains |
| :-- | :-- | :-- |
| Straight | Every quarter | Baseline alignment |
| Subdivision | Every 8th / 16th / triplet | Even spacing inside the beat |
| Backbeat only | 2 and 4 | Holding 1 and 3 internally |
| One per bar | Beat 1 | Bar-length internal time |
| Half / double time | Every 2 bars, or every 8th | Wide or narrow reference |
| Gap click | N bars on, N bars off | Internal clock over silence |
| Displacement | An off-beat — the "&", the "e", the "a" | Hearing the click as a weak position |
| Slow-click | One click per 2 or 4 beats at fast tempo | Long-span stability |
| Tempo ladder | Fixed, raised in steps | Technique at a measured tempo |
| Drift test | Click drops out, returns after N bars | Whether the internal clock held |

Displacement is the hardest and the most useful. The click stops being "the
beat" and becomes just another voice you play *against* — which is what a
second musician is.

### Why a groove beats a click

A click is one reference point per beat. A groove is many: a kick on 1, a
backbeat on 2 and 4, a hat stating the subdivision, a bass stating the bar. The
player can lock to whichever one their instrument needs.

That is the whole premise of this project. The trade is that a groove has to
hold the grid — a backing track that *drifts* is a worse reference than a click,
not a better one.

**This paragraph used to say humanisation was a mix choice and never a timing
one. That is now half wrong and the half matters.** A groove's hits are
displaced in time; the click's never are
([ADR 0007](adr/0007-a-groove-is-humanized-a-click-is-not.md)). What the
original sentence was reaching for is the distinction between *displaced* and
*drifting*: the offset is a pure function of `(seed, voice, absoluteStep)`, so
it never accumulates and every hit is computed from its true grid position. The
requirement that displacement be bounded and deterministic survives unchanged —
it is in fact what rules out the sibling project's accumulating walk.

A groove also carries what a click cannot: swing, dynamics, and an idiom. A
player who can sit inside a bossa cannot necessarily sit inside a shuffle, and a
click will never tell them which.

---

## 2. Grooves worth training against

Sorted by what they train, not by genre. Tempos are the usable practice range,
not the range the style is played at.

| Groove | Meter | BPM | Grid | Swing | Trains |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Straight 8th rock | 4/4 | 80–140 | 8 | 0 | The baseline. Backbeat, nothing else |
| 16th funk | 4/4 | 90–110 | 16 | 0–0.2 | Sixteenth placement, ghost notes |
| Half-time | 4/4 | 60–85 | 16 | 0–0.3 | Wide backbeat, long empty spaces |
| Shuffle | 4/4 | 75–95 | 8 | 0.6–0.67 | Triplet feel, skipping the middle triplet |
| Half-time shuffle | 4/4 | 80–100 | 16 | 0.55–0.65 | Swung 16ths with ghosts. The hardest one here |
| Jazz / ride | 4/4 | 100–200 | 8 | 0.55–0.65 | Riding a cymbal, feathered kick |
| Bossa nova | 4/4 | 120–140 | 16 | 0 | Clave against a straight kit |
| Samba | 4/4 | 90–110 | 16 | 0 | Sixteenth density, foot on the "&" |
| Second line | 4/4 | 88–96 | 16 | 0.2 | Displaced backbeat, syncopated kick |
| Boom-bap | 4/4 | 85–95 | 16 | 0.3 | Lazy swung 16ths under a straight stab |
| Waltz | 3/4 | 90–160 | 8 | 0 | A bar that is not four |
| 6/8 | 6/8 | 60–120 | 12 | 0 | Compound time |
| Odd meter | 5/4, 7/8 | 90–140 | 16 | 0 | Counting a bar that does not resolve |

Everything above 4/4 in that table is a **meter feature**, not a groove feature
— it needs bar length to be a variable before any of it can be written.

### Clave is the thing to get right

Three of the grooves above are built on a two-bar key pattern rather than a
one-bar figure. Written on a 16-step grid, two bars:

| Pattern | Bar 1 (3-side) | Bar 2 (2-side) |
| :-- | :-- | :-- |
| Son clave 3–2 | `0, 6, 12` | `4, 8` |
| Rumba clave 3–2 | `0, 6, 14` | `4, 8` |
| Bossa clave 3–2 | `0, 6, 12` | `4, 10` |

Reversing the bars gives the 2–3 forms. The pattern is the groove — everything
else in a bossa or a samba is written around it.

### The core patterns, on a 16-step grid

One bar, steps 0–15, where 0 is beat 1 and 4, 8, 12 are beats 2, 3, 4.

**Straight 8th rock** — shipped as V10
```
hatClosed  0 2 4 6 8 10 12 14
snare      4 12
kick       0 8
```

**Rock is written on the 16-step grid and *states* the eighth.** The table's
`Grid 8` column above is the felt subdivision, not the notation. The deciding
argument is ADR 0010's invariant 4: a marked bar may not change `stepSeconds`,
so on a genuine 8-step bar the finest event placeable anywhere is an eighth and
rock's fill could only be four eighth notes — a stop, not a fill. The eight
empty odd steps are free capacity that only the fill spends.

That distinction is now a property every groove carries, and it is what
[ADR 0010](adr/0010-a-marked-bar-modifies-the-figure.md)'s amended invariant 2
reads against: the stated subdivision may not be interrupted, and the positions
between its steps are **rests, not holes**.

**The bar line is the kick velocity and nothing else.** Every other element of
rock's ordinary bar is invariant under a half-bar shift — the hat has period 4,
the snare sits on 4 and 12 at one velocity, the kick on 0 and 8. With the two
kicks equal the figure states a two-beat loop and the downbeat is inaudible.
`kick` 0.95 against 0.86 is 3.60 dB and is the whole of that cue.

**Its fill adds where funk's subtracts.** Funk is already maximally dense, so
its only gesture is the hat stopping; rock leaves eight steps empty, so its
gesture is the subdivision doubling to sixteenths for the last six steps. Two
further inversions: the kick keeps time underneath, which is strictly better for
a metronome, and the arrival is the downbeat rather than step 15, so the fill
crescendos *into* bar 1.

**16th funk** (Funky Drummer shape, thinned)
```
hatClosed  every step except 14
hatOpen    14
snare      4 12          ghosts 7 9 15
kick       0 3 10
```

**This is the *ordinary* bar, and V8 made it one of three.** The groove now runs
a four-bar cycle — ordinary, light, ordinary, fill — derived from the absolute
step so nothing becomes stateful, and shown on screen as one bar because the
display is four beat dots.
[ADR 0010](adr/0010-a-marked-bar-modifies-the-figure.md) governs how far a
marked bar may depart: it **modifies** this figure and never replaces it, the
gesture lives in steps 8–15, and six invariants hold in every bar. The sibling's
`FILLS` phrases are written to replace a bar and cannot be ported directly.

A player can switch the cycle off, and with it off the render is bit-identical
to the single bar above.

**The exception on step 14 is a correction, not a detail.** This figure
originally put the closed hat on every step *and* the open hat on 14. One
hi-hat cannot be open and closed at the same instant. The open hat also has to
be choked when the closed hat returns on 15, or it rings about a second into a
2.4-second bar and sounds over the next downbeat.

Ghost velocity is **0.37** as this repo renders it, not the 0.15–0.25 a reader
might carry over from the sibling: that range is calibrated for a linear gain
law and this repo's curve is decibel-linear, where 0.20 sits 28 dB under the
backbeat instead of 22. See
[ADR 0008](adr/0008-sample-calibration-is-derived-not-copied.md).

**Half-time**
```
hatClosed  0 2 4 6 8 10 12 14
snare      8
kick       0 10
```

**Shuffle** — same notes as rock, played at swing 0.64 on the 8th grid
```
hatClosed  0 2 4 6 8 10 12 14
snare      4 12
kick       0 8
```

**Bossa nova** — the clave carries it, the kit stays flat
```
rim        son/bossa clave, two bars
hatClosed  0 2 4 6 8 10 12 14
kick       0 6 8 14
```

**Samba**
```
ride       0 1 2  4 5 6  8 9 10  12 13 14
hatClosed  2 6 10 14                        (the foot, on every "&")
kick       0 3 4 7 8 11 12 15
```

**Jazz ride** — 8th grid, swing ≈ 0.6
```
ride       0 4 7 8 12 15
hatClosed  4 12                             (the foot, on 2 and 4)
kick       feathered quarters, below ghost threshold
```

---

## 3. The samples we have

From the sibling project, `daily-groove`:

```
/Users/frederik.leidloff/dev/daily-groove/scripts/grooves/samples/
```

**179 FLAC files, 7.4 MB, mono, 44.1 kHz, 16-bit.** Capped in length per voice,
faded out over the last 80 ms, no front trim and **deliberately not normalised** —
the level difference between velocity layers is the data.

`pack.json` is a ready-made manifest: every voice, its velocity layers with a
`maxVelocity` threshold and a `nominalVelocity`, and the round-robin files in
each layer. `provenance.json` records source library, licence and treatment per
file. Both are directly reusable; we would not have to re-derive any of it.

### Percussion voices

| Voice | Layers | Files | Notes |
| :-- | --: | --: | :-- |
| `kick` | 4 | 12 | 3 round-robins per layer |
| `snare` | 4 | 12 | 3 round-robins per layer |
| `hatClosed` | 4 | 12 | |
| `hatOpen` | 3 | 9 | |
| `ride` | 1 | 3 | Bow, struck with the tip. One layer only |
| `rideBell` | 2 | 5 | Same cymbal, same session, struck on the bell |
| `rim` | 2 | 6 | Cross-stick |
| `tomHigh` | 3 | 6 | |
| `tomLow` | 3 | 6 | |
| `bongoHigh` | 3 | 6 | |
| `bongoLow` | 3 | 6 | |
| `claves` | 1 | 2 | |
| `cowbell` | 1 | 2 | |

### Pitched voices

| Voice | Instrument | Range | Sampled notes | Layers | Files |
| :-- | :-- | :-- | :-- | --: | --: |
| `bass` | Electric bass VI, pick, flatwound, muted | Db1–Db3 | MIDI 25–49, every 3 semitones | 3 | 81 |
| `comp` | Upright piano | A2–Db6 | MIDI 45–85, every 4 semitones | 1 | 11 |

Both are sampled on an even grid, so any note in between is a pitch-shift: at
most **±1 semitone** for the bass, **±2** for the comp. The comp has one
velocity layer and one round-robin per note — it will sound identical on every
strike unless we vary it ourselves.

### Licence — this is an obligation, not a footnote

| Library | Voices | Licence |
| :-- | :-- | :-- |
| MuldjordKit | kick, snare, hats, rim, toms | **CC-BY 4.0** |
| DRSKit | ride, rideBell | **CC-BY 4.0** |
| VCSL | bongos, claves, cowbell | CC0 |
| VSCO 2 CE | comp | CC0 |
| Pastabass | bass | CC0 |

The two CC-BY libraries mean **a render carries a credit string per library it
actually draws on**, visible to a user of the app and not only in the repo:

> Drum samples provided by DrumGizmo.org
>
> Ride cymbal samples from DRSKit, provided by DrumGizmo.org

**This section used to say every render owes both.** It owes one per library it
uses. The second string is DRSKit's, and DRSKit supplies only `ride` and
`rideBell` — so the app ships the first string alone until a groove reaches for
the ride. Shipping the second today would claim a source we do not use.

A rendered groove is a derivative work of its samples, so the obligation follows
the audio wherever it goes.

---

## 4. What the pack can and cannot play

**Built so far:** 16th funk (V6) and straight 8th rock (V10), both on the same
four voices and the same 22 files.

**Can play, today:** straight rock, 16th funk, half-time, shuffle, half-time
shuffle, jazz ride, boom-bap, second line, bossa nova. That is nine of the
thirteen grooves in section 2 — every 4/4 one except samba.

**Two voices the pack holds that this app will never play.** `bass` and `comp`
are documented in §3 because the pack contains them, not because we will use
them: [ADR 0006](adr/0006-rhythm-instruments-only.md) rules out every melodic
voice permanently. The gaps below are therefore all percussion.

**Gaps, in the order they would bite:**

| Missing | Costs us |
| :-- | :-- |
| Crash / splash | No downbeat accent after a fill. Workable — `rideBell` stands in |
| Shaker, tambourine | No continuous 16th texture that is not a hi-hat |
| Surdo | Samba has no bottom. The kick is not a substitute at samba density |
| Congas, agogô, timbale | Latin styles beyond bossa |
| A second ride layer | `ride` is one velocity. A riding feel cannot accent without the bell |
| Brushes | Bossa and ballads want them and there is no snare that is not a stick |

**The click itself.** For a metronome we need a click voice, and the pack has
three candidates already levelled: `claves` (dry, high, cuts through anything),
`cowbell` (louder, idiomatic as a downbeat accent) and `rim` (softer, blends
into a groove rather than sitting over it). `rideBell` is the fourth option and
the most musical. A click of `cowbell` on 1 and `claves` on 2–4 is the obvious
first try.

Note that `claves` and `rim` are near-duplicates in function — both are the dry
high crack a groove reaches for once. A groove that uses both has neither.

**`claves` does a second job since V9: it counts the groove in.** A count-in is
one bar of the click — the same `CLICK_PATTERN` accent, the same exact grid —
in front of a groove that has none of that voice. The seam is the feature: four
claves, then the kit, and no claves again. A hi-hat count was rejected for the
opposite reason, that a hat count into a hat-led groove reads as the pattern
changing rather than as a handoff.

This is also why `claves` is now decoded into a *groove's* bank and not only the
click's. The count-in is never humanized and never swung, which
[ADR 0007](adr/0007-a-groove-is-humanized-a-click-is-not.md) already covers: it
is a click, and a click is exact.

---

## 5. Open questions

**Three of these were answered by V6** — see
[`specs/6-straight-funk-groove/`](../specs/6-straight-funk-groove/). Q1: the
groove is decoded and scheduled live in the browser. Q3: the pack is copied, 22
files of it. Q4 was answered **against** this document's stated lean — the
groove replaces the click rather than playing under it, because the figure
already states what a click would: the hat plays every sixteenth and the kick
states 1. Q2 and Q5 are still open.

1. **Do we render offline or synthesise in the browser?** `daily-groove`
   pre-renders MP3s and commits them, because its grooves are fixed. A
   metronome's tempo is a user control, so ours probably cannot be — which
   means decoding the pack in the browser and scheduling it live, and a very
   different size budget than 7.4 MB of FLAC.
2. **Is tempo continuous or a ladder?** Decides whether grooves can be
   pre-rendered per tempo at all.
3. **Do we copy the pack or depend on it?** Copying carries both CC-BY strings
   and lets the two projects diverge. Depending on a sibling checkout does not
   survive anyone else cloning this repo.
4. **Does a groove replace the click, or play under it?** Under it is the safer
   default and the thing to thin out first.
5. **Is meter a variable?** Four of thirteen grooves need it. Building 4/4-only
   is cheaper and forecloses waltz, 6/8 and odd meters.

---

## Sources

- [How to REALLY Use the Metronome — RCJacH](https://rcjach.github.io/blog/how-to-really-use-the-metronome/)
- [Making the Most of your Practice: The Metronome — Liberty Park Music](https://www.libertyparkmusic.com/practice-music-metronome-2/)
- [Unlock Groove: Advanced Metronome Techniques — MetronomeOnline](https://metronomeonline.org/blog/unlock-groove-advanced-metronome-techniques)
- [Mastering Metronome Subdivisions — metronome.wiki](https://metronome.wiki/blog/mastering-metronome-subdivisions-for-complex-rhythms)
- [Practicing With a Metronome — Modern Drummer](https://www.moderndrummer.com/2012/05/practicing-with-metronome/)
- [Developing a Strong Sense of Time Without a Click Track — I Can Play Drums](https://www.icanplaydrums.com/blog/developing-time-without-click)
- [When To Work To A Groove (Instead of a Click) — Joey Sturgis Tones](https://joeysturgistones.com/blogs/learn/when-to-work-to-a-groove-instead-of-a-click)
- [Improve Drum Timing: From Click-Perfect to Feel-Perfect](https://themystickeys.com/improve-drum-timing-from-click-perfect-to-feel-perfect/)
- [Drum Beats Everyone Should Know — Drumeo](https://www.drumeo.com/beat/drum-beats-everyone-should-know/)
- [15 Common Drum Beats and Patterns — DrumHelper](https://drumhelper.com/learning-drums/common-drum-beats-and-patterns/)
- [Drumming With Samba and Bossa Nova Beats — Von Baron Music](https://vonbaronmusic.com/bossa-nova-beats/)
- [Groove Essentials #34: Samba — Vic Firth](https://ae.vicfirth.com/education/groove-essentials/groove-essentials-34-samba-slow/)
- `daily-groove/docs/music.md` and `daily-groove/scripts/grooves/samples/README.md` — the sibling project's own reasoning, including why the ride is DRSKit's and why the bass changed.
