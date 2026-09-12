# V2. Simple 4/4 metronome

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ✅ shipped 2026-09-12 — see [features.md](../features.md)

## What

* "let's start with a 4/4 simple metronome"
* The click is **claves**, taken from the sibling project's sample pack at
  `daily-groove/scripts/grooves/samples/claves/`.
* "using WebAudio for exact timing" — scheduled on the audio clock, not on a
  `setInterval`.
* A **start / stop** control, and a **tempo slider from 40 to 180 bpm**.
* This fills in the slice V1 stubbed: `src/features/metronome/` currently holds
  a placeholder that says "Nothing keeps time yet."

## What the samples actually are

Read from the sibling checkout before speccing, because three of these facts
change what is worth deciding:

| | |
| :-- | :-- |
| Files | `claves_mf.flac`, `claves_mf_3.flac` — two round-robin alternates |
| Format | mono, 44.1 kHz, 16-bit FLAC, 0.4 s, ~18 KB each |
| Licence | **CC0** (Versilian Community Sample Library) |
| Treatment | capped at 0.4 s, 80 ms fade-out, resampled down a perfect fifth — "a bigger pair of sticks" |
| The two alternates | deliberately **2.50 dB apart**; `music.md` calls that level difference the round-robin variation, not an accident to normalise away |

**The licence is the good news and it is worth stating plainly.** The CC-BY
obligation in `docs/music.md` §3 attaches to MuldjordKit (kick, snare, hats,
rim, toms) and DRSKit (ride, bell). Claves is VCSL, CC0. A metronome that uses
**only** claves therefore ships with **no credit string in the UI** — the
obligation arrives with the first drum voice, not with this change.

## Done when

1. **The velocity curve is a pure function, tested directly**, and the click's
   bar is expressed against it as a pattern — accent on 1, 2–4 even — rather
   than as a branch on the beat number. A future groove can pass a different
   pattern without touching it.
2. **Start plays claves in 4/4 at the slider's tempo and stop silences it**,
   from a single copied sample with no round-robin. That beat 1 is *audibly* the
   downbeat needs **an ear** — it is graded partly until someone listens.
3. **Beats are scheduled on the audio clock, within a tolerance the spec
   names**, asserted by advancing a fake clock. No `setInterval`, and no test
   that sleeps. **The sample's 8.3 ms silent lead-in is compensated**, so what a
   listener hears lands on the beat rather than 8.3 ms after it.
4. **The slider spans 40–180 bpm**; a change while running takes effect from the
   next beat and never rewrites a beat already scheduled, and start always
   begins a fresh bar on beat 1.
5. **Four dots track the beat**, stopping when the click stops, and the
   indicator never delays or perturbs the audio. **The dots are legible at two
   metres**: big, and the downbeat distinguished by more than colour — Sam's
   condition, because "if the downbeat is distinct by colour and colour alone,
   and the dots are small, it reads as a flicker and I stop looking". A dot
   lights with the **audible** beat, not with the scheduled one.

## Decided

Nothing in this conversation yet. Settled elsewhere and not re-asked:

* **The slice is `src/features/metronome/`**, reached only through its
  `index.ts` — [ADR 0001](../../docs/adr/0001-enforced-import-graph.md). Zone 6
  is already configured for the `lib/` folder this change creates.
* **No adapter is built in a component file.** The thing that owns an
  `AudioContext` is a module under `lib/<concern>/`, a hook owns its lifetime,
  the component takes values —
  [coding-guidelines.md](../../docs/coding-guidelines.md#anti-patterns-and-their-fixes).
* **Time comes from an injected source**, never `Date.now()` or a bare
  `setTimeout`, and a test drives a fake clock rather than sleeping —
  [testing.md](../../docs/testing.md#timing-is-not-a-wall-clock).
* **Tailwind v4 for styling** — [ADR 0002](../../docs/adr/0002-tailwind-v4.md).

And decided in this conversation:

* **A velocity curve, built now and built to outlast the click** — "let's
  already start with a velocity curve that we will also use for future grooves.
  For the click, put an accent on the 1 and leave the rest even."

  So the accent is not a special case in the click's code. A beat carries a
  **velocity**, the curve turns velocity into gain, and the click's pattern is
  simply `[accent, even, even, even]`. A future groove writes a different
  pattern against the same curve.

  **Why this is more than it looks.** The pack gives claves exactly **one**
  velocity layer (`maxVelocity: 1`, `nominalVelocity: 0.5`). With one layer,
  velocity cannot select a sample the way it does for kick or snare — it has to
  become gain. So this change is where the project decides what velocity
  *means*, and every voice added later inherits that meaning. Getting it wrong
  is cheap now and expensive once four voices depend on it.

  The curve's actual shape is a musical decision and goes to `musician` at
  tech-spec time, not settled here.

* **One claves take, always — the round-robin does not alternate.** Because a
  reference should not wobble: with one take, the accent is the only level
  difference in the sound, so the velocity curve is audible rather than muddled
  against a 2.5 dB variation that could otherwise make an un-accented beat 3
  land louder than beat 1.

  **The cost, stated:** a fast click is bit-identical every beat, which some
  ears read as mechanical. That is a trade this change accepts and a groove
  later may not — the second file stays in the pack, unused by V2 rather than
  discarded.

  Which of the two takes ships is a musical call for `musician`, not a coin
  toss: they differ in level *and* in strongest partial (1556 Hz against
  3766 Hz after the pitch-down).

* **A tempo change takes effect at the next beat.** The beat already scheduled
  stays where it is; the new tempo applies from the one after. Because dragging
  then feels responsive without ever shortening a beat already sounding — and
  because it keeps the scheduler honest: **only the future is ever rewritten.**

  That last part is the load-bearing half. A Web Audio scheduler works by
  queueing beats slightly ahead of the clock, so "immediately" would mean
  un-scheduling something already committed to the audio device. Next-beat
  semantics means the lookahead window is the only thing a tempo change
  touches, which is also what makes it testable against a fake clock.

* **Start always begins a fresh bar on beat 1.** Stop clears the position.
  Because the accent then reliably means "here is one", which is what a player
  counts in from — and because it makes the feature's behaviour deterministic:
  pressing start always produces the same sequence, so a test asserts one
  thing rather than one thing per stored position.

* **The samples are copied into this repository, not read from the sibling
  checkout.** This answers `docs/music.md` §5 question 3 for the claves case.
  Because a path into `~/dev/daily-groove` does not survive anyone else cloning
  this repo, and because a browser cannot read one anyway — the file has to be
  served. The provenance record travels with it, even though CC0 does not
  require attribution, because where a file came from and what was done to it
  is not something to rediscover later.

* **Tap tempo is not in V2. It gets its own change.** Because V2 is the
  scheduler, and tap tempo carries its own decisions — how many taps average,
  what a stray tap does, whether it works while running, whether it snaps —
  which deserve a conversation rather than being bolted onto this one.

  **Sam's objection stands unaddressed, on the record:** the slider "costs me
  the reason I opened the tab about half the time", because "I heard a thing
  and want to sit in it, not calculate it". This is a known debt, not an
  oversight, and it is in [features.md](../features.md) as a candidate.

* **A four-dot beat indicator is in**, current beat lit, downbeat distinct, and
  it stops when the click stops. Because the 4/4 should be visible as well as
  audible — useful with the volume down or in a loud room.

  **This is the riskiest thing in the change and it should be built as such.**
  It needs a bridge from the audio clock back into React state, which is where
  Web Audio apps jank: a per-beat `setState` driven from a scheduler callback
  can re-render during a dragged slider, and a subscription not torn down on
  unmount leaks a running context. The audio must not depend on the UI keeping
  up — if the indicator stutters, the click stays exact.

## The musician's numbers

Decided by the `musician` agent against `docs/music.md`, from measurement rather
than taste. Full reasoning is in `tech-spec.md`'s `## Contracts`.

* **Curve:** decibel-linear over a 40 dB range, referenced to the selected
  layer's `nominalVelocity`, with gain clamped at +6 dB over the recorded level.
* **Click:** accent `v = 0.65`, even `v = 0.50` — **6.0 dB apart**. The even
  beats sit exactly at claves' `nominalVelocity`, so three beats in four play the
  sample completely untouched and the accent is the only gain change in the
  feature.
* **Take:** `claves_mf.flac`, because its energy is split between a 1556 Hz
  fundamental and a 3779 Hz partial, where the alternate concentrates at
  3763 Hz — the ear-canal resonance where fatigue is best documented. Over
  twenty minutes at one stroke per beat, that is the whole question.

**And one finding nobody asked for, which is why it matters:** the sample has an
**8.3 ms silent lead-in**, deliberately kept by the pack. Beat *spacing* is
unaffected, so a fake-clock test would have passed while the indicator led the
sound by 8.3 ms — 2.5% of a beat at 180 bpm — and the error would only have
surfaced as two voices refusing to line up, long after this change shipped.

## Signed off by ear and by eye — 2026-09-12

The two things nothing in this pipeline can check, checked by a person running
the app locally:

* **The accent reads.** "the first beat is accented (lightly)". That closes
  `## Done when` 2, which was graded partly by design until someone listened.
* **The dots are in sync with the audio.** That closes the change's declared
  riskiest part end to end — the 8.3 ms lead-in compensation, and the
  animation-frame bridge that holds each beat until the audio clock reaches the
  moment it is heard rather than lighting it up to 100 ms early when it was
  queued.

* **Two-metre legibility: accepted on the user's say-so, not separately
  verified.** Asked directly whether they had stood back from the screen, the
  answer was "good enough — mark it done" after running it locally. So `## Done
  when` 5 is closed on that basis. What the tests actually assert is proxies —
  the dots differ by `size-16 sm:size-24` against `size-9 sm:size-14` plus a
  ring, not by colour alone, which is Sam's condition. Nobody measured the
  distance. If the dots ever turn out to be too small in a real room, this is
  the paragraph that says the check was accepted rather than made.

* **The snippets module stays inside V2 rather than becoming its own change.**
  The verifier flagged that it answers none of V2's five bullets while editing
  every component, so reverting V2 also reverts it and ADR 0003. Accepted
  knowingly: the cost only bites on a revert of V2 specifically, and
  back-writing a spec folder for finished work is bookkeeping rather than a
  record of a decision.

**On the word "lightly".** The `musician` set the accent at 6.0 dB and gave an
explicit escalation before anyone listened: *"If you cannot hear where bar 1
starts without counting deliberately, go to 9 dB — `ACCENT_VELOCITY = 0.725`.
No other value changes."* The sign-off says the accent is audible, so 6.0 dB
stands. The lever is recorded here so a later change is a one-constant edit
rather than a re-derivation.

## Open

* Nothing. The spec is settled and the change is built.

## What the persona constrains

`docs/persona.md` was empty when the questions above were first asked and was
filled during this session, so **the four decisions above were taken without a
persona line.** They were re-examined against it afterwards rather than left to
stand on their own — that is the honest order, and it is why this section reads
as a check rather than as an input.

What it says that bears on V2:

| persona.md | What it means here |
| :-- | :-- |
| "Play is the biggest thing on the page" · "a sound in one tap" | Start/stop is the dominant control, not one of two equal ones beside the slider |
| "Readable at two metres. Big beat markers, big numbers." | The four dots are **big**, and the bpm readout is big. This is not a desktop-sized control panel; the phone is propped up across the room and the hands are on an instrument |
| "The same row they tap to mute is the one that shows the bar" | The dot row is later also the mute row. Build it as a row of four *controls* that currently only display, not as decoration that has to be replaced |
| "A groove that breathes… is worse than the click" | The timing tolerance in `## Done when` 3 is a product requirement, not an engineering nicety |
| "It is an instrument, not a trainer" | No counting, no accuracy readout, no session memory of how it went |

### Sam's verdict, asked directly

**"It is the thing on the shelf, and I would not practise with it."**

> "I quit because four evenly spaced events a bar give me nothing to sit
> against. I'd open it, hit start, listen for maybe thirty seconds, and then be
> playing *to* it and stiffening up exactly the way I do with the one in the
> drawer."

That is not an argument against building V2, and Sam says so:

> "The thing I'd actually use is a groove that thins out, and a groove that
> thins out is a scheduler plus voices plus the mute row. You're building the
> scheduler. Just don't ship it to me as a metronome and ask whether I like it,
> because the answer stays no until a second voice lands on 2 and 4."

**The sharpest thing in the verdict is who V2 does serve:**

> "The person who *would* use V2 as shipped is in the file by name — 'the
> drummer in a practice room — who wants a click in their monitor at a fixed
> tempo and nothing else.' You're building his product on the way to mine. Fine,
> as long as nobody mistakes his approval for mine."

So V2 is explicitly **infrastructure, judged as infrastructure.** Its `## Done
when` bullets are about exactness and reuse, not about whether anyone enjoys it.
The feature that earns Sam's approval is the one that puts a backbeat on 2 and 4.

**Where Sam endorsed a decision already taken:** the single take. *"Taking the
variation out to make the accent mean exactly one thing costs you nothing I care
about"* — and, on a wobble fighting the accent, *"that would feel wrong and I
would not be able to tell you why."*

**Where Sam added a requirement:** the dots work at two metres **only if the
dots themselves are big, and the downbeat is not distinguished by colour
alone.**

> "If the downbeat is distinct by colour and colour alone, and the dots are
> small, it reads as a flicker and I stop looking."

That is now in `## Done when` 5. Sam noted the persona is silent on *how many*
dots — "the size requirement is real and the layout question isn't mine."

**Where Sam disagreed with the scope:** tap tempo. Put to the user, who kept the
slider — see `## Decided`.

## Not in this change

Named so they are visibly out rather than forgotten:

* Any voice other than claves — and with it, the CC-BY credit strings.
* Subdivisions, swing, and any meter that is not 4/4.
* Persisting the tempo between sessions.
* The practice methods in [features.md](../features.md) — gap click, backbeat
  only, displacement. This change is the scheduler they will all hang off.
