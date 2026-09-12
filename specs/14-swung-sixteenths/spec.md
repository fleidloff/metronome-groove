# V14. Swung sixteenths

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** tech spec

## What

* *"Let's add swung-sixteenth as groove style."* A groove whose sixteenths are
  swung — the first one in the app that swings at the sixteenth level rather
  than the eighth.

## Decided

* **The number is 14, and 13 is reserved for second line.** The user's
  allocation. `specs/` holds folders through 12 and `features.md`'s tables stop
  at 10, so nothing in the tree contradicts it — 13 is held for a change that
  has not been vibed yet.

* **The groove is swung sixteenths itself, not a genre.** Asked as a choice
  between boom-bap, the half-time shuffle, and a figure written for this app;
  the answer was *"swung-sixteenth, the spec is already started"* — the style
  was named in the original ask and is not up for re-selection. So the figure
  is written here rather than transcribed from `docs/music.md` §2, the way V12
  declined to use that section's shuffle notes verbatim.

  Sam's preference between the two named grooves is **not discarded** — it is
  the brief the figure is written to. He would leave boom-bap running for
  twenty minutes and would hit the half-time shuffle once and go back to funk,
  and the reason he gives is structural rather than a matter of taste: *"the
  only unambiguous event in the bar is one snare on 3. Everything else is a
  texture I'd have to decode while my hands are busy."* The figure therefore
  leans sparse and keeps an unmissable backbeat.

* **The button says "Swung 16ths".** Asked with Sam's objection in the option
  — *"a theory label on a button, which is homework"* — and against the reading
  that every other entry in the list is an idiom name. The user chose the
  mechanical label anyway: it is what they called the change, and it is the one
  name that is true of the figure whatever the figure turns out to be, since
  this groove is not a transcription of a genre.

  It is the only non-idiom entry in a list that otherwise reads Click, Rock,
  Shuffle, Straight funk, Bossa. **That is the thing to watch in the listening
  pass** — not whether the word is correct, but whether Sam finds the groove by
  it.

* **It keeps the turnaround, and the Fills toggle behaves as it does
  everywhere else.** Two snare notes on steps 14 and 15 at `0.74 → 0.86`,
  touching neither the grid nor the hat nor the backbeat. Sam's objection is to
  being displaced by something he did not see coming — *"a fill every four bars
  is me stumbling every fifteen seconds and blaming the app"* — and bar 2
  already plays three-quarters of this gesture, so it is heard twice per cycle
  before it completes.

  His fallback of defaulting Fills **off** for this groove alone was rejected:
  it would make a global toggle groove-dependent for the first time, against
  V8's design, and he half-retracts it in the same breath. Shipping no fill at
  all was rejected because it is not a groove decision — `fillSnareLadder`
  requires two snare values in the fill bar's second half, so it means editing
  `invariants.ts` and amending ADR 0010.

  **If the listening pass says the turnaround interrupts**, the escalation is
  option 3 and it is a rulebook change. Recorded so nobody reaches for it
  quietly.

* **It sits after Straight funk in the list**, decided rather than asked, on
  V12's own reasoning applied one step further: shuffle went next to rock
  because *"the two are the pair a listener compares"*, and the pair here is
  straight funk against this — the same sixteen-step grid, one straight and one
  swung. Say if you would rather it went last; it is one line in
  `SourceSelect.tsx`.

* **V12 is assumed built.** The user's own framing: *"Swing is probably part of
  v12 and we assume that 12 is done first."* V12 turns swing on and generalises
  `swingOffset` to take a `stride`.

## What this change runs into

Facts about the tree, read before any question was asked.

* **V12's warp already swings sixteenths, with no machinery added.** Its
  contract is `swingOffset(swing, step, stepSeconds, stride)` with
  `stride = groove.steps / groove.subdivision`. A groove at `subdivision: 16`
  has `stride` 1, so `f` = 0, `warped = A(n)`, and the offset reduces to
  `swing × stepSeconds / 2` on odd steps and 0 on even ones — a swung sixteenth
  pair, exactly. At `swing = 2/3` step 1 lands at 1/3 of a beat, which is
  2/3 of the way through its own pair.

  So V14 is a definition file plus the entry lines, and V12's Track A has
  already paid for the mechanism. **This is why V12 must land first**: at
  today's `swingOffset` the same thing is true, but the two-argument version is
  the one V12 replaces, and writing against it would be writing against a file
  that is mid-change.

* **A swung-sixteenth groove has no free capacity, so its fill must subtract.**
  ADR 0010's invariant 4 bars a marked bar from changing `stepSeconds`, and a
  groove that states sixteenths on the sixteen-step grid has nowhere finer to
  go. That is funk's situation, not rock's — funk's fill is the hat stopping
  for seven steps, rock's is the subdivision doubling. Whatever figure V14
  picks, its fill is a gesture of subtraction or of substitution.

* **`docs/music.md` §2 offers two swung-sixteenth grooves and they are very
  different.** Half-time shuffle at swing 0.55–0.65, *"swung 16ths with ghosts.
  The hardest one here"*; boom-bap at swing 0.3, *"lazy swung 16ths under a
  straight stab"*. Second line at 0.2 is the third, and it is V13.

* **No new samples and no new credit string**, whichever figure wins: the four
  voices funk and rock already share cover all three candidates, so switching
  fetches nothing (ADR 0013).

## Sam's verdict, taken before the question was asked

Recorded here because it is an input to the open question below, not an answer
to it.

* **Boom-bap, "not close."** *"I'd play to boom-bap and I'd leave it running
  for the whole twenty minutes. It's sparse, it loops, and there's a hard snare
  I can hang a guitar part off."* Against the half-time shuffle: *"I'd hit it
  once, go 'oh, Rosanna', smile, and go back to funk… the only unambiguous
  event in the bar is one snare on 3. Everything else is a texture I'd have to
  decode while my hands are busy."* And on `docs/music.md` calling it the
  hardest one: *"that's a drummer's exam piece. I'm not a drummer."*

* **The name may not be "Swung 16ths".** *"'Swung sixteenths' is a phrase I'd
  have to stop and work out… Call it Boom-bap or Hip-hop and I pick it the way
  I pick everything — by the sound the word makes in my head. Call it 'Swung
  16ths' and it's a theory label on a button, which is homework."* He says the
  same of "Half-time shuffle": *"Two of those words are instructions."*

* **It is audibly not the shuffle.** *"A shuffle bounces at the quarter — it
  walks. Boom-bap sits flat on top and drags underneath."*

* **The list is not yet too long.** Seven idioms is fine; his line is scrolling
  — *"the moment the list needs a scroll to see all of it, it stopped being a
  shelf and became a menu."*

* **Four things that would lose him**, each one a decision this spec still owes
  an answer to:
  1. A swing slider. *"Bake one number in per groove."*
  2. A moving anchor. *"Let the hats be lazy, that's the idiom. If the snare is
     also late I cannot tell whether I dragged or it did."*
  3. **The fill, on this groove specifically.** *"On a groove where the
     sixteenths are already uneven, a fill every four bars is me stumbling
     every fifteen seconds and blaming the app. I'd want Fills off by default
     here… and if that breaks the 'a ticked box is not setup' rule, I'd rather
     you ship the groove without a fill at all."*
  4. Ghosts he cannot place. *"If it gets to the point where I need the screen
     to know where 1 is, that's the whole app broken."*

## The musician's findings

Every dB is the **rendered** level from `velocity.ts`'s curve against `kit.ts`'s
measured nominals, derived rather than copied (ADR 0008).

### The mechanism, confirmed and simplified

At `subdivision: 16` the stride is 1, so every grid step is a *stated* step and
the warp has no in-between positions to stretch: `f` = 0, `warped = A(n)`, and
the offset is `swing × stepSeconds / 2` on odd steps and 0 on even ones —
**bit-identical to the pre-V12 two-argument `swingOffset`.** V14 adds no
mechanism whatever. V12 must still land first only because it is the signature
mid-change.

One number to carry: the offset on an odd step is `s/24` beats, **at every
tempo**.

### The swing constant — `1 / 3`, written as the ratio

It puts step 1 at **7/24 of a beat**. Straight is 6/24; the sextuplet the
shuffle rides is 8/24. **7/24 is the exact midpoint of the two grids this app
already states** — lazy but not shuffled, derived rather than tuned.

* Long:short is **7:5**, and `(2 + s)/4` = **58.33%** — the MPC/SP-1200 "58"
  setting, the idiom's own number.
* **It is exactly half of V12's `2/3`, at half the note value.** The two
  constants become a designed pair rather than two separate tunings.
* `docs/music.md` §2's `0.30` differs by **2.78 ms at 90 bpm**, under the 4 ms
  humanize bound — the same feel written as an exact rational, as V12 chose
  `2/3` over *"0.6–0.67"*. §2's row owes the edit.
* It is never inside the noise: offset ÷ humanize bound is **15.6× at 40 bpm,
  6.9× at 90, 5.6× at 180**.

Against the shuffle, by construction rather than by taste: at stride 1 every
quarter and every eighth stays exactly on the grid and only the "e" and the "a"
lean. That is Sam's *"sits flat on top and drags underneath"* as arithmetic —
a shuffle's own quarters subdivide long-short, and these do not.

### The backbeat stays put by placement, not by `exactVoices`

**`exactVoices` cannot do this job**, and the musician read the code rather than
the doc: it lives on `Humanize` and is read only by `timingOffset`, while
`source.ts` computes `displace = swingOffset(...) + timingOffset(...)`. Swing
never consults it. A backbeat on an odd step would be swung by 1/24 of a beat
whatever `exactVoices` said.

So the rule is **placement**: the two backbeat notes sit on even steps in every
bar. No invariant enforces this, so **this spec owes it a test of its own.**

`exactVoices` stays `[]`. Bossa's `['rim']` is earned by a stated criterion — a
voice doubled on every step it sounds, where displacement can only make a flam —
and this snare is not doubled. Sam's complaint is *systematic* lateness he
cannot attribute; humanize is ±4 ms, symmetric and zero-mean, and it is the
28 ms of swing that placement already prevents. *"A groove whose snare alone is
exact is a click wearing a groove."*

### Three voices, and no open hat

`voices: ['kick', 'snare', 'hatClosed']` — the sparseness brief taken literally,
and 21 of the 22 files, so ADR 0013's "switching downloads nothing" holds. At
`subdivision: 16` there are no rests, so the longest ring available to an open
hat is one long swung sixteenth — 194 ms at 90 bpm — which is a choked splash
rather than an open hat. It also removes the choke question entirely.

### Bar 1 / 3 — ordinary

| Voice | Steps | Velocity | Rendered | Sounds at |
| :-- | :-- | --: | --: | :-- |
| `kick` | 0 | 0.95 | −18.21 dBFS | beat 1 |
| `kick` | 7 | 0.78 | −25.01 dBFS | beat 2 + 19/24 |
| `kick` | 10 | 0.86 | −21.81 dBFS | beat 3 + 1/2 |
| `snare` | 4, 12 | 0.95 | −17.67 dBFS | beats 2, 4 |
| `hatClosed` | 0, 4, 8, 12 | 0.90 | −30.54 dBFS | the quarters |
| `hatClosed` | the twelve others | 0.66 | −40.16 dBFS | |

No ghosts, no open hat, five events that are not the hat.

**The hat is two rungs and the division of labour is the point.** *Timing states
the eighth — every even step on the grid, every odd step 1/24 of a beat late.
Dynamics state the quarter.* The ladder is **9.62 dB**: funk's full top-to-bottom
hat span compressed into two rungs instead of terraced over three. Both values
are funk's own, so nothing is invented.

**`subdivision: 16` is forced, not chosen.** Swing at stride 1 moves only odd
steps, so a groove declaring `subdivision: 8` would leave them rests — a
swung-sixteenth groove with nothing on its swung sixteenths. The hat therefore
plays all sixteen. That is texture and not events: Sam's objection to the
half-time shuffle was eight ghosts to decode, and there are none here.

**The downbeat is findable by ear three ways.** Shift the kick set `{0, 7, 10}`
by half a bar and you get `{8, 15, 2}` — **zero overlap**, so the kick figure
alone carries the bar line, as *position* rather than as V10's 3.60 dB. Beat 3
has only a hat under it while beat 1 has a kick. And step 0's kick is the
loudest kick in every bar.

**Why it is not funk with a number.** It shares only the canonical step 10;
step 7 replaces funk's step 3, moving the non-downbeat kick figure **between the
two backbeats**, which is where this feel drags. Plus: no ghosts, a 0.95
backbeat against funk's 0.92, two hat rungs against three, no open hat.

### Bar 2 — light

Ordinary plus one note, one voice. Nothing removed, nothing silenced.

| Voice | Steps | Velocity | Rendered | Sounds at |
| :-- | :-- | --: | --: | :-- |
| `kick` | 7, **13** | 0.78 | −25.01 dBFS | beat 2 + 19/24, **beat 4 + 7/24** |

**Step 13 is the identity note** — odd, therefore swung, a position no straight
groove in this app can state. It is the only free step in 8–15 that crowds no
kick, and it lands *after* the backbeat rather than before it. Steps 11 and 15
were rejected for exactly that: each sits 5/24 of a beat ahead of a backbeat or
a downbeat, which at 180 bpm is 69 ms of kick immediately before the note Sam
navigates by.

### Bar 4 — the turnaround

The light bar plus one voice — bossa's shape, not rock's. Steps 0–7 are bar 1
verbatim; two snare notes are added and nothing else moves.

| Voice | Steps | Velocity | Rendered | Sounds at |
| :-- | :-- | --: | --: | :-- |
| `snare` | **14** | 0.74 | −26.09 dBFS | beat 4 + 1/2 |
| `snare` | **15** | 0.86 | −21.27 dBFS | beat 4 + 19/24 |

Everything else is bar 2. The hat never stops, the grid never opens, the
backbeat on 12 never moves. `0.74 → 0.86` is a **4.82 dB** crescendo into the
downbeat, peaking below the 0.95 backbeat so the backbeat stays the loudest
snare in the bar.

**This is a third gesture the spec had not named: superposition.** A
`subdivision: 16` groove cannot double its grid, but a voice can still arrive on
steps the grid already states — which is what bossa's fill does. Rock adds, funk
subtracts, this superposes. `docs/music.md` owes that sentence.

### ADR 0010's six invariants, checked against `invariants.ts`

| # | Function | Result |
| :-- | :-- | :-- |
| 1 | `downbeatKick` | ✅ `kick` at exactly 0.95 on step 0 in all three bars |
| 2 | `noHoleInTheSubdivision` | ✅ stride 1; the closed hat sounds on all 16 steps of all three bars |
| 3 | `firstHalfOrdinary` | ✅ every edit is in 13–15 |
| 4 | `contentNotGrid` | ✅ no marked bar touches `swing`, `seed` or `humanize` |
| 5 | `everyOpenHatClosed` | ✅ vacuously — no `hatOpen` |
| 6a | `hatLadder` | ✅ two rungs, **9.62 dB** against a worst case of 3.20 dB |
| 6b | `fillSnareLadder` | ✅ `0.95 → 0.74 → 0.86`, gaps of **8.42** and **4.82 dB** |

Nothing fails, and nothing sits at the `1e-9` tolerance V12's fill did — the
tightest margin is 4.82 against 3.20.

One implementation note that is really an invariant note: the light bar's kick
must be written as one line `steps: [7, 13]`, because `firstHalfOrdinary`
compares by `JSON.stringify` and splitting the line would move step 7's bytes.

### Where it touches the edges

* **Humanize against swing.** The shortest inter-onset interval is the short
  half of a swung pair, **5/24 of a beat** — 69.44 ms at 180 bpm, against a
  bound of 2.5 ms there, closing to 64.44 ms worst case (−7.2%). Overtaking
  would need 5 ms against 69. **This is longer than V12's 55.6 ms**, so V14 sets
  no new floor for the scheduler.
* **No choke.** No `hatOpen`, so `CHOKE_S`, `KIT_CHOKES` and `audioClock`'s ramp
  are untouched.
* **The four dots stay correct.** `isQuarter(step, 16)` gives 0, 4, 8, 12 — all
  even, and at stride 1 swing displaces only odd steps.
* **The count-in still seams.** The claves count four exact quarters and hand
  off to a groove whose quarters are also exact; the swing lives entirely
  between them.
* **40–180, no clamp.** At 40 the pair is 437.5 / 312.5 ms — an exaggerated
  limp. At 180 the displacement is 13.9 ms and the groove reads close to
  straight. Both are costs of the policy, per V6/V10/V12.
* **Round-robin holds.** Every velocity lands in a three-take layer, so
  `lcm(3, 16)` = 48 steps and no bar position freezes to one file.
* **Nothing `docs/music.md` marks as fixed breaks.** Three MuldjordKit voices,
  so the DrumGizmo string already ships and DRSKit's stays unshipped.

### Listening items — none of this has been heard

| # | Item | Cheapest fallback |
| :-- | :-- | :-- |
| 1 | `swing = 1/3` at 90 bpm — lazy, or just slightly wrong? | `0.42`, 6.25 ms further at 90 bpm and so over the 4 ms bound |
| 2 | **The hat ladder at 9.62 dB** — an accent on the quarter, or twelve hats that vanish? | low rung → 0.72, giving 7.22 dB, still wider than shuffle's 4.79 |
| 3 | The backbeat under ±4 ms of humanize — does Sam hear it as *his* drag? | `exactVoices: ['snare']`, permitted by ADR 0007 but it makes the snare the only exact voice |
| 4 | Sixteen hats a bar may be too present against a sparse kit | both rungs down one step to 0.86 / 0.62, which preserves the ladder exactly |
| 5 | The kick on step 7 at 0.78 — an anticipation of beat 3, or a smudge on it? | → 0.70, widening to 10.00 dB under the downbeat kick |
| 6 | **No open hat anywhere** — may read as monotone over twenty minutes | `hatOpen` 0.76 on step 14, light bar only, choked by the closed hat on 15 |
| 7 | The turnaround's two snares — an ending, or an interruption? | there is nothing smaller available; see the fill question |
| 8 | Step 15's snare 5/24 of a beat before the downbeat — 69 ms of snare-then-kick at 180 | drop step 15 and move the crescendo to 13 → 14 |


## Done when

* **A new entry plays swung sixteenths** — the "e" and the "a" of every beat
  1/24 of a beat late while every quarter and eighth stays exactly on the grid,
  on three voices and 21 of the 22 files, so switching to it downloads nothing.
  *Needs an ear:* whether `1/3` at 90 bpm reads lazy or just slightly wrong, and
  whether a 9.62 dB hat ladder accents the quarter or makes twelve hats vanish.

* **V14 adds no mechanism.** `swing.ts`, `humanize.ts`, `kit.ts` and
  `invariants.ts` are untouched — the change is one definition file plus the
  four entry lines. At `subdivision: 16` the stride is 1 and V12's warp reduces
  to `swing × stepSeconds / 2` on odd steps, which is a test rather than a
  claim.

* **The three bars are as the musician wrote them**, and
  `sixInvariantViolations` returns empty for this groove and for every other
  groove in `GROOVES`. *Needs an ear:* the step-7 kick, and whether the
  turnaround reads as an ending or an interruption.

* **The backbeat never swings.** Both backbeat notes sit on even steps in every
  bar, so swing cannot reach them. No invariant in `invariants.ts` enforces
  this and `exactVoices` cannot — it is read only by `timingOffset`, while
  `source.ts` adds `swingOffset` separately — so **this change owes it a test of
  its own.**

* **`'swung-16ths'` survives a reload** via `SOURCE_IDS`, the one Fills toggle
  governs it like every other groove, and `docs/music.md` §2 is corrected:
  swing `0.3` → `1/3` with the figure written out, plus the sentence naming
  **superposition** as a third fill gesture beside rock's adding and funk's
  subtracting.

## Size test

| | Question | Verdict |
| :-- | :-- | :-- |
| 1 | Five `## Done when` bullets or fewer? | ✅ exactly five |
| 2 | At most two or three concern folders? | ✅ **one** — `lib/groove/`, plus one line each in `lib/transport/source.ts`, `hooks/useClickTransport.ts`, `components/SourceSelect.tsx` and `src/lib/snippets/` |
| 3 | Leaves what `docs/music.md` marks as fixed alone? | ✅ three MuldjordKit voices, no new file, no new credit string |
| 4 | Would one `git revert` roll it back? | ✅ |

The smallest change this door has specced, and the reason is V12: it paid for
the mechanism and V14 spends it.

## Open

* Nothing. `spec.md` is settled; the conversation moves to `tech-spec.md`.
