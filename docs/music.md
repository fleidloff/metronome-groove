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

That is the whole premise of this project. The trade is that a groove has to be
**dead on the grid** — a backing track that breathes is a worse reference than a
click, not a better one. Humanisation is a mix choice here, not a timing one;
any displacement we add must be bounded and deterministic.

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

**Straight 8th rock**
```
hatClosed  0 2 4 6 8 10 12 14
snare      4 12
kick       0 8
```

**16th funk** (Funky Drummer shape, thinned)
```
hatClosed  every step
hatOpen    14
snare      4 12          ghosts 7 9 15
kick       0 3 10
```

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

The two CC-BY libraries mean **anything we render carries two credit strings**,
visible to a user of the app and not only in the repo:

> Drum samples provided by DrumGizmo.org
>
> Ride cymbal samples from DRSKit, provided by DrumGizmo.org

A rendered groove is a derivative work of its samples, so the obligation follows
the audio wherever it goes.

---

## 4. What the pack can and cannot play

**Can play, today:** straight rock, 16th funk, half-time, shuffle, half-time
shuffle, jazz ride, boom-bap, second line, bossa nova. That is nine of the
thirteen grooves in section 2 — every 4/4 one except samba.

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

---

## 5. Open questions

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
