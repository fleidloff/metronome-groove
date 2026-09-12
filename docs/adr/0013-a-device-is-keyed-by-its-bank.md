# 0013. A device is keyed by its sample bank, not by its source

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

`select()` has always torn the audio device down and built a new one: a new
`AudioContext`, a new voice bank, a new scheduler. With one groove and one click
that was right — they use different samples, and a browser caps how many
contexts a page may hold, so parking the old one is worse than closing it.

V10 adds a second groove drawing the *same* 22 files from the same four voices.
Under the old rule, switching funk → rock would refetch and re-decode all of
them, on a change that needs no new bytes at all. `docs/persona.md` is explicit
about what that costs: setup before sound is what loses this player.

## Decision

**The device is keyed by the bank its source needs, not by the source.**

`bankFor(id)` answers `'claves'` for the click and `'kit'` for every groove.
`select()` keeps the device when the next source's bank matches the current
one's, and calls `retarget(id)` — a new scheduler on the existing clock and
bank, replacing `Audio.scheduler` in place. When the banks differ, it discards
and rebuilds as before.

## Consequences

- **A groove-to-groove switch fetches nothing.** Pinned by a test that counts
  real `fetch` calls across the switch and requires the number to be unchanged.
- **A click crossing still rebuilds**, because the banks genuinely differ. The
  rule is not "never rebuild"; it is "rebuild when the samples change".
- **`retarget` must re-apply what the old scheduler carried.** The new one is
  built with the bpm captured at device-build time and has no listeners, so
  `setTempo` and `onBeat` are re-applied at the swap. A future field added to
  the scheduler is a field that has to be re-applied here, and nothing about
  the type will say so.
- **The driving interval reads `ready.scheduler` per tick** rather than closing
  over it. That is what lets the swap land mid-run with no other change, and it
  is load-bearing rather than stylistic.
- **A switch made while the first device is still loading still refetches.**
  There is no device to retarget yet, so the in-flight one is discarded as
  stale. Pre-existing behaviour, left alone, and the narrow case where the
  promise above does not hold.
- **A future source needing new samples gets a new bank key and rebuilds.**
  Adding a voice to one groove and not another would mean two kit banks, and
  the honest fix then is a finer key, not a wider bank.

## Alternatives considered

- **Always rebuild** — one rule, no branch, and 22 files refetched on a switch
  that needs none.
- **Never rebuild, one bank holding everything** — every player downloads the
  kit to use the click, which is what
  [V6](../../specs/6-straight-funk-groove/) deliberately avoided.
- **Key on the source id with a hand-written table of which ids share files** —
  the same rule as `bankFor`, written twice and able to disagree with itself.
