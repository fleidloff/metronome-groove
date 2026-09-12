# 0008. A sample's velocity calibration is derived here, never copied from the sibling pack

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

V6 brought in 22 drum samples from daily-groove's pack, which ships a
`pack.json` giving every velocity layer a `nominalVelocity` and a
`maxVelocity`. Reusing those numbers is the obvious move and it is a bug.

**The two projects do not share a gain law.** daily-groove's `gainFor` is
linear — `velocity / nominalVelocity`. This repo's `src/lib/velocity.ts` is
decibel-linear over a 40 dB range — `curve(v) / curve(vRef)`. The same manifest
feeds two different curves.

Measured, at the snare's layer boundary (v = 0.3465) with the pack's own
nominals under this repo's curve:

- from below, `vRef` 0.3785 → −1.3 dB on a sample recorded at −26.0 → **−27.3 dB**
- from above, `vRef` 0.6657 → −12.8 dB on a sample recorded at −22.6 → **−35.4 dB**

Raising velocity by 0.0001 makes the snare **8 dB quieter**. The same mismatch
makes the sibling's ghost range wrong here: `0.15–0.25` is 12 dB of ghost depth
under the linear law and 26–30 dB under this one.

## Decision

**Every layer's `nominalVelocity` is derived from the measured level of the
recording, and every boundary sits at the midpoint of its two adjacent
nominals:**

```
vRef_L   = vRef_top + (level_L − level_top) / 40
boundary = (vRef_L + vRef_L+1) / 2
```

With that rule the rendered gain is continuous across every boundary. Nothing is
copied from `pack.json` except the audio.

**It is asserted, not trusted.** `groove/kit.test.ts` sweeps velocity 0 → 1 in
steps of 0.001 and requires the rendered level to be monotonic with no step above
0.5 dB. The pack's own numbers fail it at the crossing.

## Consequences

**What this buys.** A velocity means one thing across the whole range, and a
test catches the failure rather than an ear discovering it later. The measured
worst case today is 0.070 dB, 14% of the threshold.

**What it costs.** Adding a voice is not a copy. It needs the source measured
before it can be calibrated, and the sweep test has to be extended to cover it.

**The method, corrected by V11.** This paragraph used to say *"mean level over
the first 20 ms per layer"*. **That is not the method that produced `kit.ts`.**
A 20 ms window misses the eight shipped layers by a constant 9.04 dB with
7.28 dB of residual scatter — no single offset fits, so it cannot be what was
run.

What does reproduce them, to ≤ 0.05 dB on seven of eight layers:

> **200 ms RMS, mono, averaged over a layer's takes, minus 1.94 dB.**

| Layer | 200 ms RMS − 1.94 | `kit.ts` |
| :-- | --: | --: |
| `kick_v80` | −20.79 | −20.77 |
| `snare_v44` | −25.95 | −25.97 |
| `hatClosed_v44` | −44.36 | −44.37 |

This mattered the moment it was written down wrongly: V11 added the first new
voice since, and a reader following the old sentence would have derived numbers
that do not sit on the same curve as the eight already shipped — reintroducing
exactly the layer-boundary cliff this ADR exists to prevent.

**What it rules out.** Importing `pack.json` wholesale, now or later. The two
manifests look interchangeable and are not.

**A related trap, recorded here because it has the same shape.** `leadInSeconds`
is a property of one recording and not of a library. The claves' is 8.3 ms,
measured; every one of the 40 kit files measured ≤ 0.36 ms, at the detector's
floor. A scheduler that takes a single lead-in constant plays the whole kit
8.3 ms early, so lead-in lives on the voice.

## Alternatives considered

- **Copying `pack.json`'s numbers** — lost on the 8 dB cliff above.
- **Changing this repo's gain law to match the sibling's** — the decibel-linear
  curve is deliberate and documented in `velocity.ts`: every +0.1 of velocity is
  the same perceived step, where the sampler-convention square law spends only
  12 dB on the whole upper half. Changing it to reuse a manifest would be the
  tail wagging the dog.
- **Normalising the samples so the layers share a level** — the level
  differences between layers *are* the data, which is why the pack was
  deliberately not normalised.
