# 0009. The setup lives in the browser, one versioned object, validated per value

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

`docs/persona.md` asks for two things that pull together: *"Coming back tomorrow
costs nothing and starts where they stopped"* and *"No account, and nothing to
lose. The setup lives in the browser."* V7 is the first change to store anything
at all, so it decides the shape every later remembered value inherits — beat
mutes and subdivisions are both on the candidate list.

## Decision

**One JSON object under one key, `metronome.setup`, carrying a `version`.**
Read once after mount, written on every change.

**Each value is validated on its own, and a bad one falls back silently.** A
tempo outside 40–180 becomes the default; an unknown source becomes the click; a
good value sitting beside a bad one survives.

**A wrong `version` is a different thing and discards everything.** A bad value
is a value we understand and reject. A version we do not recognise is a shape
whose meaning we cannot vouch for, so even a plausible field in it is not
trusted.

**Nothing is ever said to the player.** `docs/persona.md` lists *"Setup before
sound"* among the things that lose Sam, and a line about storage is setup before
sound — for an event they can do nothing about.

## Consequences

**Per value rather than all-or-nothing, because of one specific failure.** The
realistic way stored data goes bad is a release renaming or removing a groove.
Discarding the whole object then forgets the *tempo* too, which is the thing the
player actually cared about remembering. This is the reasoning to preserve if
the rule is ever revisited.

**The version earns its keep the first time the shape changes.** Without it, old
data is indistinguishable from corrupt data, and the per-value fallback would
silently reset everything rather than migrating deliberately.

**Storage never breaks the app.** Private mode, a full quota, a browser that
throws on the property access itself — every path returns the defaults or does
nothing. A metronome that will not open because of a storage quota is worse than
one that forgot the tempo.

**The read happens after mount, not during render, and that is not a detail.**
The route is statically prerendered, so the server's HTML carries the defaults
and cannot know what any one player stored. Seeding state from storage during
render hydrates a value the markup disagrees with; React recovers by throwing
the server tree away and re-rendering, which works but is an error path with a
flash. Reading a frame later is the same outcome without the error — at the cost
of one `eslint-disable` for `react-hooks/set-state-in-effect`, which is the one
shape that rule cannot express.

**The write is an effect keyed on the values, not a call in the handlers.** The
two things that set a tempo share no path: the slider goes through
`changeTempo`, and a committed tap calls `setBpm` directly. A write placed in a
handler forgets the other, and a third writer would be easy to add without
noticing. This was found during the build, after the tech spec claimed the
opposite.

**Restoring goes around every handler, and that is the general rule this change
paid for twice.** The write is an effect; telling the transport which groove to
load had to become one too, after a reload showed straight-funk in the box and
played the click. Anything the component must tell an external system belongs in
an effect keyed on the value — a handler only sees the writers that existed when
it was written.

**`SourceId` now derives from a runtime tuple**, `SOURCE_IDS`, because
validating a stored id needed the list as a *value* and `src/features/*/lib/`
cannot import the component that holds the labels. One declaration, not two.

## Alternatives considered

- **One key per value** (`metronome.bpm`, `metronome.source`) — the per-value
  fallback falls out of the layout for free, and a corrupt value genuinely
  cannot touch its neighbour. Rejected because there is nowhere to put a
  version, so a future shape change has no way to announce itself.
- **No version field** — everything above minus ceremony nobody had needed yet.
  Rejected for the same reason the version exists.
- **Write on unload** (`pagehide`, `visibilitychange`) — one tidy write at the
  end. Rejected because a phone reclaims a backgrounded tab without firing those
  reliably, which loses exactly the case this feature exists for.
- **Debounce the writes** — fewer writes during a slider drag. Rejected because
  the window where the screen and the storage disagree is precisely when a
  backgrounded tab gets killed.
