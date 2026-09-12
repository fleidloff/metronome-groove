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
| [2](2-simple-4-4-metronome/) | Simple 4/4 metronome | 2026-09-12 | A claves click scheduled on the audio clock: start/stop, a 40–180 bpm slider, four beat dots, and an accent on beat 1 driven by a reusable velocity curve that future grooves share. Compensates the sample's 8.3 ms lead-in. Also moved every user-facing word into `src/lib/snippets/`. Produced [ADR 0003](../docs/adr/0003-snippets.md). |
| [1](1-next-app-scaffold/) | Next.js app scaffold | 2026-09-12 | Next 16 / React 19 / TypeScript / Tailwind v4, Vitest + Testing Library, and the import graph turned from a description into an enforced, tested fact. One stubbed `metronome` slice reached through its `index.ts`. Produced [ADR 0001](../docs/adr/0001-enforced-import-graph.md) and [ADR 0002](../docs/adr/0002-tailwind-v4.md). |

---

## Candidates

Seeded from [docs/music.md](../docs/music.md). Nothing here is decided.

### The spine

| Candidate | Why | Notes |
| :-- | :-- | :-- |
| ~~Next.js app scaffold~~ | — | Shipped as V1 |
| ~~Synthesized click~~ | — | Shipped as V2, with a claves sample rather than synthesis |
| ~~Tempo control~~ | — | Shipped as V2: a 40–180 bpm slider |
| Tap tempo — *the known debt from V2* | Sam: the slider "costs me the reason I opened the tab about half the time" | `docs/persona.md` ranks it above the slider for stating a tempo by ear. Deferred from V2 deliberately; it carries its own decisions (how many taps average, what a stray tap does, whether it works while running) |
| Tempo control | A metronome's one required input | music.md Q2 — continuous or a ladder — decides whether anything can be pre-rendered |
| Time signature / meter | Four of the thirteen grooves need it | music.md Q5. Building 4/4-only is cheaper and forecloses waltz, 6/8 and odd meters |
| Accent scheme | Beat 1 against the rest is the minimum useful structure | `cowbell` on 1, `claves` on 2–4 is music.md's first try |

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
| Tap tempo | *"not a nice-to-have. It is how an ear-trained player states a tempo"* | The persona ranks this above the slider for stating a tempo by ear |

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
| Persisted setup | *"Coming back tomorrow costs nothing and starts where they stopped"* | Tempo and toggles in the browser. No account — the persona counts a sign-up as setup before sound |
| Credit strings in the UI | CC-BY is an obligation, not a footnote | Blocks shipping any MuldjordKit or DRSKit voice. **Not** triggered by claves, which is CC0 |

### Ruled out by the persona

Kept visible so they are not re-proposed as good ideas.

| Not building | Why |
| :-- | :-- |
| Streaks, scores, accuracy readouts | *"Being graded… that is homework, and homework is the thing they quit three times."* |
| Named practice methods or a progression | *"It is an instrument, not a trainer."* |
| Per-voice mute grid | *"a grid of voices against beats is a drum machine and they did not ask for one."* |
| An account | *"No account, and nothing to lose."* |
| Anything in the lead register | *"Sam brings the melody instrument."* |
