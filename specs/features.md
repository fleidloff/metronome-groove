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
| — | — | — | nothing yet |

---

## Candidates

Seeded from [docs/music.md](../docs/music.md). Nothing here is decided.

### The spine

| Candidate | Why | Notes |
| :-- | :-- | :-- |
| Walking skeleton — Next.js app + synthesized click | Everything hangs off an accurate scheduler; it is the part never thrown away | Audio-clock scheduling, start/stop, a tempo. No samples, so no licence obligation yet |
| Tempo control | A metronome's one required input | music.md Q2 — continuous or a ladder — decides whether anything can be pre-rendered |
| Time signature / meter | Four of the thirteen grooves need it | music.md Q5. Building 4/4-only is cheaper and forecloses waltz, 6/8 and odd meters |
| Accent scheme | Beat 1 against the rest is the minimum useful structure | `cowbell` on 1, `claves` on 2–4 is music.md's first try |

### Practice methods

Each is a way of giving the player *less* reference. Roughly in order of cost.

| Candidate | Trains | Notes |
| :-- | :-- | :-- |
| Subdivision click | Even spacing inside the beat | 8th / 16th / triplet |
| Backbeat only | Holding 1 and 3 internally | Click on 2 and 4 |
| One per bar | Bar-length internal time | |
| Half / double time | Wide or narrow reference | |
| Gap click | Internal clock over silence | N bars on, N bars off |
| Drift test | Whether the internal clock held | Click returns after N bars — needs a way to show what drifted |
| Displacement | Hearing the click as a weak position | music.md calls this the hardest and most useful |
| Tempo ladder | Technique at a measured tempo | Fixed tempo raised in steps |

### The groove layer

The premise of the project, and the expensive half.

| Candidate | Why | Notes |
| :-- | :-- | :-- |
| Sample pack: copy, decode, schedule | A groove gives many reference points where a click gives one | music.md Q1 and Q3 — render offline vs synthesize, copy the pack vs depend on it. Carries two CC-BY credit strings into the UI |
| One groove end to end | Proves the pipeline before the catalogue | Straight 8th rock is the baseline |
| Groove under the click | music.md Q4 calls this the safer default | The thing to thin out first |
| The nine playable 4/4 grooves | What the pack can play today | Everything in music.md §2 except samba and the non-4/4 rows |
| Clave-based grooves | Bossa and samba are written around a two-bar key pattern | The pattern *is* the groove; get it right before the kit around it |

### Product

| Candidate | Why | Notes |
| :-- | :-- | :-- |
| Persisted settings | Coming back tomorrow to the tempo you left | |
| Practice session / streak | Turns a tool into a habit | Needs `docs/persona.md` written first — a product call nobody can make on Sam's behalf yet |
| Credit strings in the UI | CC-BY is an obligation, not a footnote | Blocks shipping anything that renders a sample |
