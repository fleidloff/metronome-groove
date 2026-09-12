# metronome-groove

A metronome that plays a groove instead of a click.

A click is one reference point per beat. A groove is many — a kick on 1, a
backbeat on 2 and 4, a hat stating the subdivision — and a player can lock to
whichever one their instrument needs. That is the whole premise.
[docs/music.md](docs/music.md) holds the research behind it;
[docs/persona.md](docs/persona.md) holds the one player it is built for.

The click is still here. It is the first entry in the groove list.

---

## What it is

**An instrument, not a trainer.** Pick a groove, set a tempo, switch off the
instruments you don't want, hit play. It runs until you stop it. It does not
track you, grade you, or suggest what to practise next. The practice methods in
[music.md](docs/music.md) — backbeat only, one per bar, thinning the click out —
are things the player builds by hand with the beat toggles, not modes the app
offers.

It remembers your last setup in the browser. No account, no sign-up, no sound
behind a permission prompt.

## The controls

| Control | What it does |
| :-- | :-- |
| **Groove** | Picks the pattern. "Click" is one of the entries |
| **Tempo** | Continuous BPM, plus tap tempo |
| **Time signature** | The top-level control — see below |
| **Instruments** | One toggle per voice in the groove. Off is silence, not a substitute |
| **Beats** | One toggle per beat in the bar: `x0x0` instead of `xxxx` |
| **Swing** | 0 to ~0.67. Each groove ships with a default; the player can push it |

### Beat toggles are per beat, not per voice

Switching off beat 3 silences everything landing on or inside beat 3 — every
voice, the whole beat. It is one row of toggles whether you are on the click or
on a five-voice funk pattern.

This is deliberate. The technique being served is *less reference*, not a
different pattern. A grid of voices against beats would be a pattern editor, and
this is not one.

### Meter drives, the groove list follows

Time signature is the top-level control and it is free. Grooves are written for
a meter, so the list shows only the ones that fit the current one. Set 7/8 and
you get the click and a list that says why it is short.

Most time signatures will work. Grooves will exist for the common ones first —
4/4, then 3/4 and 6/8. Which meters get grooves beyond that is not decided.

## How it sounds

Real drum samples, scheduled live in the browser with Web Audio. Tempo is a
continuous user control, so nothing can be pre-rendered — every hit is placed at
play time.

The sample pack comes from the sibling project
[`daily-groove`](../daily-groove): 179 mono FLAC files with a manifest of
velocity layers and round-robins per voice. See
[music.md §3](docs/music.md#3-the-samples-we-have) for what is in it and what it
cannot yet play.

### Licence obligation

Two of the source libraries are **CC-BY 4.0**, so anything the app renders
carries two credit strings that a user of the app can see:

> Drum samples provided by DrumGizmo.org
>
> Ride cymbal samples from DRSKit, provided by DrumGizmo.org

This is a requirement, not a footnote. A rendered groove is a derivative work of
its samples and the obligation follows the audio.

## On screen

A row of beat markers, the current one lit, moving across the bar. Readable from
across the room with your hands on an instrument. It is the same row you tap to
mute beats — one control, two jobs.

Nothing else. It is a metronome; you listen to it.

## Still open

- Does the pack get copied into this repo or depended on next door? Copying
  carries both credit strings and lets the two projects diverge; depending does
  not survive anyone else cloning this.
- How much of the 7.4 MB pack ships, and when it downloads.
- Which meters get grooves past 4/4.

---

## Running it

```bash
npm install
npm run dev
```

Then [http://localhost:3000](http://localhost:3000).

## The docs

| Document | What it governs |
| :-- | :-- |
| [docs/persona.md](docs/persona.md) | Who this is for. A feature that does not serve them needs another reason |
| [docs/music.md](docs/music.md) | What it sounds like — metronome practice, the grooves, the sample pack |
| [docs/architecture.md](docs/architecture.md) | How the tree is shaped and why |
| [docs/coding-guidelines.md](docs/coding-guidelines.md) | The concrete rulebook. Read before writing code |
| [docs/testing.md](docs/testing.md) | What must be tested |
| [docs/adr/](docs/adr/) | Why the shape is this one, in the order it was decided |
