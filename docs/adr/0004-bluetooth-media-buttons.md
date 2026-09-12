# 0004. What a Bluetooth speaker's button can and cannot do

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

The metronome should be controllable from the speaker it is playing through,
because `docs/persona.md` says the phone is propped up across the room and the
player's hands are on an instrument. The original idea was larger than that:
press play twice to enter a tap-tempo mode, then tap the tempo on the same
button, and never touch the phone.

Two things stood between that and reality, and **neither could be settled by
reading documentation**. One is firmware behaviour, which varies by device. The
other is how a browser decides a web page is "playing media" — the condition for
receiving media keys at all. So V4 began with a probe rather than a build: a throwaway page at
`public/v4-probe.html`, run on a phone paired to a real speaker, and deleted
once it had answered. **This record is what it left behind.**

Everything below is measured. Where a number came from a vendor's help page
rather than the probe, it says so.

## Decision

**The speaker's button starts and stops the metronome. That is all it does.**

Three findings shape that, each with what follows from it.

### 1. A double press never reaches the browser

Standard AVRCP, and documented by every headset vendor: one press is
play/pause, two is **next track**, three is previous. The device firmware
decides this before anything reaches the phone.

So a design phrased as "we see two `play` actions" describes something that
cannot happen. The signal a double press produces is `nexttrack`.

### 2. A tempo cannot be tapped on that button

The same coalescing applies to every rapid press, and a musical tap interval
sits inside it:

| Tempo | Tap every |
| :-- | --: |
| 40 bpm | 1.50 s |
| 120 bpm | 0.50 s |
| 180 bpm | 0.33 s |

The probe confirmed on hardware what the vendor documentation predicted: **the
firmware interprets fast presses itself.** Tapping a tempo on a Bluetooth button
is not a thing better code can achieve.

**Tap tempo over Bluetooth is therefore removed, not deferred.** Tapping a
slower unit — once per bar — would clear the window arithmetically, and is
recorded here only so the next person knows it was considered and declined.

### 3. Media keys require *audible* media, and browsers disagree about what that means

A page receives media keys only while the browser considers it to be playing
media. A bare `AudioContext` — which is exactly what this app's click is — does
not qualify. The usual workaround is a silent looping `<audio>` element.

The probe tested that as a ladder, and the browsers split:

| What plays | Chrome | Firefox |
| :-- | :-- | :-- |
| `AudioContext` only | no | no |
| 8 s of digital zeros | **yes** | no |
| 60 Hz at −81 dBFS, inaudible | — | no |
| 220 Hz at −26 dBFS, plainly audible | — | **yes** |

**Firefox reads the samples.** It will not route media keys for media it judges
inaudible — there is a pref for the threshold,
`dom.media.silence_duration_for_audibility`. The only level it accepted was one
the player can hear.

One more constraint, from the first probe run: a media notification is only
shown for media **longer than five seconds**. The first attempt used a
one-second file and claimed nothing, which briefly looked like the silence being
rejected. The shipped file is eight seconds.

## Consequences

**The feature exists on Chrome and does not exist on Firefox.** Not a degraded
mode, not a fallback, no browser-detection switch and no message: on Firefox the
button simply does what it did before, and the app is otherwise identical. This
is enforced — `bindMediaKeys` swallows a refused registration, and a test asserts
nothing throws into a render.

**Buying Firefox support would cost an audible tone under the metronome**, for
as long as the page is open. `docs/persona.md` rules that out in as many words:
a sound the player did not ask for is a reason to close the tab. That is the
whole reason this is a decision rather than a bug.

**Two side effects are the price of owning a media session**, and both are
visible to the player: a notification appears saying the metronome is playing,
and the metronome becomes what the phone considers "the music", so starting
another audio app stops it.

**The action bound is `pause`, not `play`.** With `playbackState` left at
`playing`, the system believes the page is playing and sends `pause` on every
press — one signal every time, rather than an alternation to track.

**What this rules out.** Any Bluetooth interaction that needs more than one bit
per press. A second signal is available later — `nexttrack`, from a double
press — and V4 deliberately leaves it unbound.

**What it does not rule out.** The on-screen tap tempo, which V3 shipped and
which this changes not at all.

## Alternatives considered

- **Route the click itself through an `<audio>` element**, so the media is real
  and no silent file is needed. Rejected: an element cannot schedule to sample
  accuracy, so it would throw away V2's 8.3 ms lead-in compensation and exact
  scheduling to buy a metronome that drifts — which the persona says is worse
  than the click it replaced.
- **Tap once per bar instead of per beat.** Arithmetically sound: 1.33 s between
  taps even at 180 bpm, clear of any multi-press window. Declined because the
  decision was play/stop only, and because a second tapping model on a second
  device is a second thing to learn.
- **A near-silent element to satisfy Firefox.** Measured at −81 dBFS and
  refused; Firefox judges audibility from the samples, not from `volume` and
  `muted`.
- **Ship an audible tone on Firefox and let the player mute it.** Muting it
  would return the page to inaudible and lose the buttons again. The constraint
  is circular, which is what makes it a wall rather than a trade.
