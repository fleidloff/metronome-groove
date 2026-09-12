# 0015. Thinning is a filter over the rendered stream, never a selector

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

V15 added per-voice mute: a row of three toggles — kick, snare, hat — that
silence a groove's voices one at a time. It is the first feature that **removes
sound a groove states**, and it will not be the last. `specs/features.md` still
carries *"Beat mute toggles — the whole of reference-thinning, in one row"* as
a live candidate, and `docs/music.md` §1 describes gap click, displacement and
the rest as things a player builds by hand out of exactly this kind of control.

There were two ways to build it, and they are not variations on each other.

**As a selector**: a muted set picks a different figure — a pre-thinned bar, or
a definition rewritten without that voice. This is how a drum machine does it
and it is what the sibling project's phrase system does.

**As a filter**: the groove renders exactly as it always does, and the muted
voices are dropped from the rendered step on the way out.

The choice looks like an implementation detail. It is not, because
[ADR 0010](0010-a-marked-bar-modifies-the-figure.md)'s six invariants are
checked against a bar, and a selector changes which bar there is.

## Decision

**Thinning is a filter applied to the rendered hit stream. It never selects a
different bar, and it never edits a definition.**

Concretely, in `lib/groove/source.ts`:

```ts
hitsAt: (step) => audibleHits(hitsAt(groove, step, variations()), mutes())
```

Three properties follow, and each is the reason rather than a side effect:

1. **ADR 0010's invariant 3 survives trivially.** A marked bar's first half is
   compared against the ordinary bar of the same phase. Under a filter the same
   voices vanish from both, so they still match. Under a selector they are two
   separately-chosen figures and the comparison means nothing.
2. **The mute cannot change per bar.** The player's condition, in as many words:
   *"what I can't have is it changing per bar so I can't tell whether the mute
   took."* A filter meets that by construction — there is one set and it is
   applied to every step identically.
3. **Nothing moves in time.** `displace`, `trim` and `takeStep` never see the
   mute set. Muting changes *which* hits sound, never *when* they sound or which
   round-robin take is drawn, so a thinned groove is the same groove with holes
   rather than a different performance.

**The set is read per step, never captured**, the same rule `variations`
already follows. That is what lets a toggle land on the next unqueued step
without rebuilding the audio device or restarting the run.

**A voice outside the mapping cannot be thinned, and that is a feature.**
`claves` appears in no entry of `KIT_VOICES_OF`, so the click and the count-in
are outside muting by construction — there is no branch checking for them,
because there is nothing to check. Any future thinning control inherits this:
what it cannot name, it cannot silence.

## Consequences

**What this buys.** ADR 0010 keeps its whole meaning without an exemption: its
invariants bind the *written figure*, and a mute is not a change to the figure.
That amendment is recorded in 0010 itself. It also means a future thinning
feature — beat toggles being the named candidate — costs a second filter and
nothing else. Two filters compose; two selectors fight.

**What it costs.** A filter can produce a bar the groove's author never
designed: mute the kick in rock and step 0 carries a hat alone, which no
listening pass ever heard. That is accepted, because the player did it on
purpose and can undo it in one press — the failure is loud and self-inflicted,
which is the exact distinction ADR 0010 draws when it explains why a silent
one is unacceptable.

It also means the **last-audible rule has to read what the lines play, not what
the groove declares.** Bossa declares three kit voices and also plays `claves`,
which no toggle reaches — so muting all three leaves the clave rather than
silence, and bossa disables no toggle where every other groove disables its
last. The persona chose that deliberately: *"you'd be spending my one red line
to prevent a state that is musically fine."*

**What it rules out.** Pre-rendering a thinned groove. A per-voice level fader,
which is mixing rather than thinning — *"volume is mixing and mixing is setup
before sound."* And any control that removes sound by choosing a different
figure, however convenient that would be for a particular effect.

## Alternatives considered

- **A selector picking a pre-thinned figure** — lost on invariant 3, which it
  makes unverifiable, and on the per-bar-consistency condition the persona set.
- **Editing the `GrooveDefinition` when a voice is muted** — lost because the
  definitions are data shared by the whole app
  ([ADR 0012](0012-a-groove-is-data.md)), the `WeakMap` bar cache in `cycle.ts`
  is keyed on the definition object, and a mute is per-player state rather than
  a property of the groove.
- **Filtering inside `audioClock` instead of the source** — lost because the
  scheduler would still queue and count hits that never sound, so the beat
  display and the round-robin would drift from what is heard.
