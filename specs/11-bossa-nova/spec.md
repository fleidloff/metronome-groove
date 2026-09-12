# V11. Bossa nova

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 11` (after 10)

## What

* *"Another rhythm: bossa nova."* A third groove beside the click, rock and
  straight funk.

## Done when

**These bullets name `claves` where they first named `rim`.** The voice changed
after a listening pass, for the reason set out in `## What the ear changed` at
the end of this file — `rim` is measurably a snare, not a cross-stick.

* **A fourth entry plays bossa**: a two-bar clave on `claves` over a one-bar
  kit, across the app's full 40–180 though the figure is written for 120–140.
  *Needs an ear:* the clave's level against the kit, whether the flat hat at
  0.66 carries the grid, and whether the fill's two snare notes read as a
  turnaround rather than a mistake.
* **The clave never stops and is never alone.** It is bit-identical in all four
  bars, unaffected by the Fills toggle, and every bar keeps the hat on all eight
  even steps and the kick on at least four — so no marked bar and no thinning
  can leave the clave exposed.
* **`rim` ships calibrated, not copied**: 6 files, no new credit string,
  nominals derived per ADR 0008 and proved by extending `kit.test.ts`'s
  monotonic sweep with no step above 0.5 dB. It ships **unused** — see the
  closing section.
* **The clave is exact in time** via `exactVoices`, while velocity jitter still
  reaches it.
* **The records are corrected**: ADR 0010 gains an `## Amendments` section with
  two dated entries — V10's subdivision and V11's phase — ADR 0008's stated
  20 ms window is replaced with the method that actually reproduces `kit.ts`,
  and `docs/music.md` §3 and §4 are corrected where they called `rim` a
  cross-stick and `claves` its near-duplicate. Both were false and both are why
  the first attempt picked the wrong voice.

## Size test

| | Question | Verdict |
| :-- | :-- | :-- |
| 1 | Five `## Done when` bullets or fewer? | ✅ exactly five |
| 2 | At most two or three concern folders? | ❌ **five** |
| 3 | Leaves what `docs/music.md` marks as fixed alone? | ✅ `rim` is MuldjordKit, so the one credit string is unchanged |
| 4 | Would one `git revert` roll it back? | ✅ |

Question 2 fails on `lib/groove/`, `lib/transport/` for `SOURCE_IDS`, the
feature's `components/` and `hooks/`, `public/samples/`, and
`src/lib/snippets/`. It is the same failure V6 and V8 took.

* **Question 2 of the size test is waived and V11 ships in one pass.** There is
  no honest split: a calibrated `rim` with no groove playing it ships nothing a
  user can hear, and the ADR amendments are about bar structure rather than
  voices, so they would strand in the second half.

## The dependency chain, which is three deep

V11 needs V10's registry — without it there is nowhere for a fourth groove to
go. V10 needs V9, by the user's own build-order decision. **And V10 is currently
unbuildable**: its `tech-spec.md` says *"the three bar tables are frozen in
spec.md"* and `spec.md` carries prose about them and no tables, while Track B is
told to build the ordinary bar *"exactly as `spec.md` writes it"*. That is a
defect in a document this door wrote and it has to be fixed before V10 runs,
let alone V11.

## Decided

* **The clave is played on `rim`, not on the already-shipped `claves`.** Three
  independent arguments, and the first is decisive.

  **The V9 collision is worse than a lost seam — it is a seam that lies.** The
  count bar plays claves on steps 0, 4, 8, 12; bar 1 of a 3-2 bossa plays the
  clave on 0, 6, 12. **Two of the four count positions are also clave
  positions**, so a listener hears a claves pattern that changes shape but never
  stops.

  **`claves` cannot have round-robin, measured.** The pack's second take
  (`claves_mf_3.flac`) has a 13.95 ms lead-in against the shipped file's
  8.25 ms, and `Clock.leadInFor` is **per voice, not per take** — so adding it
  would put every other clave stroke 5.70 ms late, which is larger than the
  entire humanize bound. `claves` would therefore play ~1,600 bit-identical
  strokes in a twenty-minute session, on the voice that *is* the groove. That is
  ADR 0010's tom defect on a more exposed voice.

  **`docs/music.md` §4 is satisfied rather than violated.** *"A groove that uses
  both has neither"* — bossa uses `rim`, the count-in uses `claves` and stops
  before the groove starts. The permanent allocation: **`claves` is the app
  talking, `rim` is a percussionist in the band.** §4 should gain a clause
  saying so.

  Cost: 6 files, 192 KB, MuldjordKit so **no new credit string**, with nominals
  derived per ADR 0008 — `v74` at 0.800 with its boundary at 0.843, `v127` at
  0.886, both `leadInSeconds: 0`.

* **3-2 orientation.** `docs/music.md` writes only the 3-2 forms. The deciding
  reason is the loop's start: the 3-side's first stroke is on step 0, so
  position zero carries kick, clave and hat together — the strongest bar-line
  cue this kit can make, for a player who never looks at the screen. In 2-3 the
  clave is absent from the instant it most needs to be present. The musician's
  honest counterweight: in repertoire 2-3 is at least as common, and a loop with
  no melody has no idiomatic preference, so this is a loop-start argument rather
  than an idiom one.

* **The clave sits outside the variation system.** `rim` is bit-identical in all
  four bars and unaffected by the Fills toggle. It is the cleanest way to hold
  Sam's condition that the clave never stops, and it is a test rather than a
  principle.

* **Fills off does not reduce bossa to one bar.** V8's guarantee that the toggle
  off renders the single bar was funk-specific. The clave's two bars are the
  groove, not a variation, and the toggle must not touch them.

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

* **Bossa ships at the level it renders at, and the quietness question waits for
  an ear.** The musician checked the premise numerically rather than assuming
  it: bossa's rendered range is 21.95 dB against funk's 22.68, and its total
  energy per unit time is **1.6 dB** under funk — close to inaudible. The cause
  is ADR 0010's invariant 1: `kick` 0.95 on step 0 is the loudest event in the
  app and dominates the sum, so no groove can be much quieter than another while
  that number is fixed.

  What *is* measurably quieter is the texture: the loudest accent voice drops
  **10.0 dB** (funk's backbeat at −18.87 against bossa's clave at −28.85), the
  hat line carries 8.2 dB less per bar, and there are 24% fewer events per
  second. So bossa is quieter by texture and not by level, and the peak is
  deliberately unchanged.

  No per-groove output gain is added. It would be a new mechanism built before
  anyone has heard whether it is needed, and it would interact with the layer
  boundaries ADR 0008 spent real work making continuous. This is how V8's fill
  density was handled — listen, then reach for the knob. Lowering bossa's
  downbeat kick was rejected outright: it fights invariant 1, pushes voices into
  the wrong sample layers, and would be ADR 0010's third amendment in three
  releases, which is the point it should be superseded instead.

* **The rim is exact in time; everything else in bossa is humanized.**
  `Humanize` gains `exactVoices: readonly VoiceName[]` and `timingOffset`
  returns 0 for a member. The reason is arithmetic rather than taste: all five
  clave strokes fall on even steps and the hat plays every even step, so the
  clave is **doubled by the hat on all five**. Displacing it cannot produce life
  — its step is already occupied — and can only produce a flam, up to 7.50 ms
  when both voices draw opposite ways. A parameter that can only make things
  worse should be zero.

  `velocityJitter` still applies to the rim: in a flat groove ±1.6 dB is the
  only dynamic variation the texture has.

  **No ADR conflict, but it is new ground.** ADR 0007 rule 2 forbids a per-voice
  *lean* — a fixed offset. A per-voice *bound* is a range, and zero is not a
  lean. `Source.humanize` stays non-null, so rule 3 is untouched.

  The honest counterweight, which the musician raised itself: **funk already
  ships this exact worst case** — kick and hat both sound on step 0 of every
  funk bar, each displaced independently. So this is a recommendation from
  salience rather than from a new defect. What makes bossa different is that its
  texture is sparse and the clave carries the style, so the flam is far more
  exposed. It is checkable as a test: assert every `rim` step is also a
  `hatClosed` step.

## The four bars

Grid 16, stated subdivision 8 — every hit in an ordinary bar falls on an even
step, so bossa reads under V10's amended invariant 2 exactly as rock does.
`swing: 0`. `seed: 0x5f_62_6f_73`.

### Ordinary, phase 0 — the 3-side

| Voice | Velocity | Steps | Renders |
| :-- | --: | :-- | --: |
| `rim` | 0.80 | 0, 6, 12 | −28.85 dBFS |
| `kick` | 0.95 | 0 | −18.21 |
| `kick` | 0.86 | 8 | −21.81 |
| `kick` | 0.78 | 6, 14 | −25.01 |
| `hatClosed` | 0.66 | 0 2 4 6 8 10 12 14 | −40.16 |

### Ordinary, phase 1 — the 2-side

Identical, except `rim` 0.80 on **4, 10**. **Only the clave has two bars; the
kit has one** — `docs/music.md`'s own sentence, *"the clave carries it, the kit
stays flat."*

### Bar 2, the light one — phase 1, two edits, one voice

| Edit | Step | Change |
| :-- | --: | :-- |
| add | 12 | `kick` 0.86 — beat 4, a position no ordinary bossa bar states |
| raise | 14 | `kick` 0.78 → 0.86, exactly one ladder step |

The surdo opening toward quarters. Nothing removed, no step silenced, no new
voice.

### Bar 4, the fill — phase 1, the light bar's kick edits plus the snare

| Voice | Velocity | Steps |
| :-- | --: | :-- |
| `rim` | 0.80 | 4, 10 |
| `kick` | 0.95 / 0.86 / 0.78 | 0 / 8, 12, 14 / 6 |
| `snare` | 0.62 → 0.70 | **13, 15** |
| `hatClosed` | 0.66 | all eight even |

**No snare in the ordinary bars, and this is the strongest argument in the
table.** Bossa's defining property is that there is **no backbeat** — a snare in
an ordinary bar imports the exact cue Sam leans on in funk and rock and puts it
in the wrong place. So the snare's entire existence here is bar 4: two notes on
**odd** steps, positions bossa never states, which is why they cannot be
mistaken for a backbeat.

**The hat is flat, and flat is the gesture.** 0 dB of designed variation against
funk's 9.6 across three rungs. 0.66 is funk's softest rung, already shipped.
**No `hatOpen` anywhere** — a bossa hi-hat does not open, and step 14 is
structurally impossible anyway because step 15 is a rest, so invariant 5 would
fail. **No hat break in the fill**: the hat is the only voice on steps 2 and 12
of a phase-1 bar, so stopping it opens holes and invariant 2 refuses.

## Two amendments to ADR 0010, and a warning about a third

**Invariant 3 generalises to phase.** A groove's ordinary figure is `P` bars
long — 1 for funk and rock, 2 for bossa — and a bar at cycle index `b` is
measured against ordinary bar `b mod P`. For `P = 1` this reduces to today's
wording word for word.

**They are two entries in one `## Amendments` section, not two ADRs.** V10's is
about *subdivision* — a bar's vertical density. V11's is about *ordinary-figure
length* — a bar's horizontal identity. Neither implies the other, they ship in
different releases, and both preserve the old reading exactly, so neither is the
reversal a new ADR is for.

**The warning:** two generalisations in two consecutive releases means ADR 0010
was written against one groove. A third is the point at which it should be
**superseded rather than amended again** — and the musician names the candidate
third: invariant 1 fixes a *number* (kick 0.95) where it means a *role* (the
loudest hit of the bar).

## A defect in ADR 0008, found by measurement

ADR 0008 says a nominal comes from *"mean level over the first 20 ms."*
**That is not the method that produced `kit.ts`.** A 20 ms window misses the
eight shipped layers by a constant 9.04 dB with 7.28 dB of residual scatter —
no constant offset fits. **200 ms RMS, mono, averaged over takes, does**:
residual ≤ 0.05 dB on seven of eight layers.

| Layer | 200 ms RMS − 1.94 | `kit.ts` |
| :-- | --: | --: |
| `kick_v80` | −20.79 | −20.77 |
| `snare_v44` | −25.95 | −25.97 |
| `hatClosed_v44` | −44.36 | −44.37 |

The next voice added would otherwise be derived from a written recipe that does
not reproduce the existing numbers. **Correcting ADR 0008's stated window is in
scope for this change**, because V11 is the change that adds that next voice.

## Open

* Nothing. The spec is settled; open questions now belong to
  [tech-spec.md](tech-spec.md).

## What the ear changed

The clave shipped on `rim` and a listening pass returned one line:

> *"the rim click doesn't work. it feels more like a snare"*

**It was a snare.** `rim` is MuldjordKit's snare played as a quiet stroke, not a
cross-stick. Measured against `snare`: dominant partial 210-220 Hz against
215-225 — 0.4 of a semitone — onset-to-peak 4.92 ms against 4.76, and *less*
energy above 1 kHz rather than more. Same drum, same room, 126 ms longer ring.

**Two false premises in `docs/music.md` produced the choice**, and both are now
corrected there:

* *"Cross-stick"* in the §3 inventory. Inherited from the sibling pack, whose own
  notes describe a VCSL `Snare2_stick` it no longer ships; the files on disk are
  `SnareRest`, and its inventory table says so.
* *"`claves` and `rim` are near-duplicates in function."* Measured, 3.0 octaves
  of centroid apart — `claves` 3059 Hz, `rim` 381 Hz. This was the clause that
  made `rim` look like a free substitute for `claves`.

**The clave is now `claves` at 0.50**, its own nominal, so the sample plays
untouched. It sits 20.3 dB clear of the hat inside 1-4 kHz, where 94.5% of its
energy is, and shares no band with the kick. Fallbacks: 0.47 down, 0.55 up —
and the knob is the line velocity in `bossaNova.ts`, **never**
`CLAVES_NOMINAL_VELOCITY`, which would move the click too.

`exactVoices` moves with it, to `['claves']`. Its premise is unchanged: all five
clave strokes are on even steps, the hat plays every even step, so the clave is
still doubled on all five and displacing it could only make a flam.

### What this costs, and it was the user's call

V9 decided the count-in is four claves because *"only a voice the groove never
uses states it."* Bossa now uses it, so a count-in before bossa is four claves
followed by a clave figure on the same voice — the seam V9 exists to make
audible.

The user was offered three ways out and took this one:

* **Chosen:** accept the collision. One voice and one velocity change, nothing
  else. The count-in is off by default, so it only reaches someone who switches
  it on.
* Rejected: give bossa its own count-in voice on `rim`, via a `countInVoice`
  field on `GrooveDefinition` and count-bar velocities derived per voice rather
  than from `CLICK_PATTERN`'s literals. Correct, and a new mechanism.
* Rejected: put the clave on `cowbell`. One CC0 file, no mechanism change — but
  89% of its energy sits in the kit's own 200-500 Hz band, so it competes rather
  than floats, against Sam's *"the clave floats over the top."*

### `rim` is now shipped and unused

The 6 files (192 KB) stay in `public/samples/`, calibrated in `KIT` and covered
by `kit.test.ts`'s sweep, and **no groove lists them** — so nothing fetches
them. Whether to keep a calibrated voice nothing plays is a separate decision
and has not been taken here.
