# 0014. Swing warps the grid, it does not displace single steps

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

Swing has existed since V6 and had never run at a non-zero value. Funk declares
`0`, rock declares `0`, bossa declares `0`. V12 turned it on for the first time,
and the shuffle is what found the defect.

The original `swingOffset` delayed **odd grid steps** by `swing × stepSeconds /
2`. Written that way, a groove on the 16-step grid that states eighths gets its
eighths swung and its sixteenths left where they were. In a shuffle at `swing
2/3` the stated eighths land on the triplet and the sixteenths stay at 0.25 and
0.75 of the beat — straight sixteenths sounding against a 2:1 pulse. Those are
not ornaments. They are wrong notes, and the fill is built out of them.

The grid and the subdivision a groove *states* on it stopped being the same
thing in V10, when rock arrived written on 16 steps and stating 8. ADR 0010's
invariant 2 already reads against `groove.subdivision` for exactly this reason.
Swing did not, so a `subdivision: 8` groove swung nothing it could hear.

## Decision

**Swing warps the grid. Every stated step moves, and the grid between two stated
steps stretches with them.**

`swingOffset` takes a required `stride` — `groove.steps / groove.subdivision`,
the number of grid steps in one stated step. For grid step `t`:

```
p = t / stride
n = floor(p)
f = p − n
A(k) = k + (k odd ? swing / 2 : 0)
warped = A(n) + f × (A(n + 1) − A(n))
offset = (warped − p) × stride × stepSeconds
```

A sub-stated-step note is therefore felt **inside** the swung pair rather than
against it. At `swing = 2/3, stride = 2` the warped grid lands on
`{0, 1/3, 2/3, 5/6}` of each beat — a proper subset of the sextuplet grid, which
is what makes a shuffle fill reachable at all.

**`stride` is required and has no default.** A default of 1 would make every
future `subdivision: 8` groove silently swing nothing, which is the bug this
record exists to fix, and it would fail quietly — the groove still plays.

**`swing` is the long-short ratio `(2 + s) / (2 − s)`, clamped to `[0, 1]`.**
`2 / 3` is the 2:1 triplet, `1` is 3:1. This is not what `swing.ts` said before
V12: its comment claimed `1` landed the off-beat on the next on-beat, while the
formula has always landed it at 0.75 of a beat.

## Consequences

**Three properties hold, and each is a test rather than a claim.**

| Property | Why it holds |
| :-- | :-- |
| Funk is bit-identical | `stride` 1 ⇒ `f` = 0 ⇒ `offset` = `swing × stepSeconds / 2` on odd steps, 0 on even — the old formula, character for character |
| Rock and bossa are bit-identical | `swing` 0 short-circuits to 0 |
| No hit overtakes the next | `A(n+1) − A(n)` is `1 ± swing/2`, so it is ≥ 0.5 for `swing ≤ 1`, and interpolation inside each interval is linear and increasing |

The third one is not an aesthetic guarantee. `scheduler.ts` queues on grid time
and schedules on displaced time, so a non-monotone displacement would reorder
hits under lookahead windowing. Per-step displacement gave no such guarantee;
this does.

**Bit-identity is arithmetic, not approximation.** The implementation computes
the warp as a delta from the straight grid rather than as an absolute warped
position. Adding the integer stated-step index and subtracting it again rounds:
at step 15 with swing 0.18, `(15 + 0.09) − 15` is `0.08999999999999986`. The two
forms are algebraically the contract's formula; only one of them survives a
`toBe`.

**What this constrains.** Every swung groove that follows lands here —
half-time shuffle, boom-bap, jazz ride and second line are all in
`docs/music.md` §2 and all of them carry a non-zero swing. None of them needs to
think about the warp; each of them would have been wrong under the old one.

**What it costs.** The grid a swung groove can reach is now a function of its
`subdivision`, and it is not the whole sextuplet. At `stride` 2 the second half
of the first triplet — 1/6 of a beat — is unreachable. A groove that needs it
must state a finer subdivision, and that is a declaration in its definition
rather than a change here.

**What it rules out.** A per-groove swing control. The value is a constant in a
groove definition, and V12 decided that against a dial on the persona's
evidence: *"I could not tell you what swing 0.67 means, and I'd never know
whether the value I landed on was a real feel or just a mistake I'd got used
to."* A dial would also make swing a second, silent humanizer — the division of
labour [ADR 0007](0007-a-groove-is-humanized-a-click-is-not.md) draws.

## Alternatives considered

- **A 12- or 24-step triplet grid.** Both notate the feel exactly and neither
  breaks `isQuarter` or `stepSeconds`. Both lose to round-robin:
  `roundRobinIndex` is `step % 3` on the absolute step, and 3 divides 12 and 24,
  so every bar position would freeze to one take for the life of the run. That
  is the bit-identical-loop defect [ADR 0010](0010-a-marked-bar-modifies-the-figure.md)
  cites when it rejects buying the pack's toms. 16 keeps a 3-bar take period and
  12 bars against the 4-bar cycle.
- **Keeping per-step displacement and writing shuffle on eighths only.** Loses
  the fill: a shuffle fill *is* the middle triplet arriving, and on an
  unwarped grid that position does not exist.
- **Defaulting `stride` to 1.** Loses on the failure mode rather than on the
  ergonomics — a groove that does not swing still plays, so nothing catches it.
