# 0007. A groove is humanized in time; the click never is

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

Two documents said humanisation here was a mix choice and never a timing one.
`docs/music.md` §1: *"Humanisation is a mix choice here, not a timing one."*
`docs/persona.md`: *"Samples, scheduled live, dead on the grid."*

V6 asked for timing displacement anyway, and the `musician` argued against it
with measurements of the sibling's technique. Three defects, all from the fact
that daily-groove humanizes a **pre-rendered finite file** and this app loops
**live and indefinitely**:

- Its random walk saturates. `gaussianUnit` has σ ≈ 0.333, so each step adds
  about 3 ms and the walk reaches its ±9 ms clamp after nine steps. The hat
  plays sixteen steps a bar. That is not jitter but a sustained offset that
  wanders — *"a hat consistently 8 ms late for thirty seconds and then
  consistently 8 ms early."*
- Separate per-voice walks decorrelate the grid: kick at +9 while snare is at
  −9 is 18 ms between the two voices that define the bar.
- The walk is stateful in scheduling order, so this app's lookahead windows and
  a backgrounded tab change its output. `docs/music.md` requires displacement to
  be bounded **and deterministic**; the walk fails the second half.

The user accepted the reasoning and drew a different line from it.

## Decision

**A groove is displaced in time. The click never is.** In the user's words:
*"I want the click sound to be perfectly in time. For a groove, I think timing
adjustments to make it sound human are ok."*

The condition they attached is what fixes the mechanism: *"it's minimal and we
can agree that the beat is not completely drifting apart but always coming back
together."*

So the displacement is **stateless**. Each hit's offset is a pure function of
`(seed, voice, absoluteStep)` — no walk, no accumulator, no RNG stream. Every
hit is computed from its true grid position, so the groove is pulled back to the
grid on every note rather than wandering away from it.

Three rules follow:

1. **The bound is a fraction of a step with a millisecond ceiling**, never a
   bare millisecond figure. A sixteenth is 375 ms at 40 bpm and 83 ms at 180, so
   a flat 9 ms would mean 2.4% of a step at one end and 10.8% at the other.
   Straight funk uses `min(3% of a step, 4 ms)`.
2. **No per-voice lean.** A fixed offset is not humanisation — it is a backbeat
   that sits somewhere other than where it claims, and a player working by ear
   cannot see that.
3. **The click carries `humanize: null`, not a zeroed record**, and has no
   `displace` or `trim` at all. A click humanized by zero is one edit away from
   being humanized by something.

## Consequences

**What this buys.** The groove has life without the app lying about where the
beat is, and the click keeps the one guarantee that makes it worth having. It is
also fully deterministic: same settings and same start give the same output
forever, which is what makes a listening pass repeatable.

**What it costs.** daily-groove's `humanize.ts` cannot be ported, and neither
can its numbers. Anyone reaching next door for a feel's `timingMs` and `lean`
will import the defect along with them.

**What changes in the documents.** The *"never a timing one"* sentence in
`docs/music.md` §1 and `docs/persona.md` is wrong as written and is edited: the
click keeps that guarantee and a groove does not.

**What it rules out.** Any accumulating or stateful displacement, and any
sinusoidal tempo drift — `driftDepth` stays 0, because a deliberate wobble in a
timing reference is the defect the persona names.

## Alternatives considered

- **Zero timing displacement, velocity jitter only** — the `musician`'s
  recommendation and what both documents already said. Lost because the user
  judged that a bounded, non-drifting offset is worth having, and the property
  they named is exactly what a stateless offset provides.
- **Porting daily-groove's walk and leans** — lost on the three measured
  defects above.
