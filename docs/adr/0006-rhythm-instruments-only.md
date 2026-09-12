# 0006. Rhythm instruments only, never anything melodic

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

V6 added the first groove and had to decide how big its kit was. The sibling
project renders straight funk with nine voices — drums, an electric bass and a
piano comp — and `docs/persona.md` appeared to permit the same here: *"Drums,
bass and comp, nothing above the comp — same rule as next door."*

Asked directly, the persona rejected the bass, and the argument was not about
this groove:

> A bass line has a key. Straight funk in, say, E minor means every time I pick
> up the guitar I'm playing in E minor, and on the sax I'm transposing into it
> before I've played a note. That is the app choosing my material for me.

It also cannot be escaped. Muting in this app is per beat and not per voice —
*"a grid of voices against beats is a drum machine and they did not ask for
one"* — so a melodic voice in a groove is compulsory for everyone who selects
that groove.

> **Amended 2026-09-12 · V15 · the escapability argument is spent, the decision
> is not.** V15 shipped per-voice mute, so the paragraph above is no longer true
> of the app: a voice can be switched off. What it was doing here was
> *supporting* — the sentence begins "It **also** cannot be escaped." The load
> is carried by the paragraph before it, and that is untouched: **a bass line
> has a key, and a groove that states one chooses the player's material for
> them.** A mute does not fix that. A player who has to mute the bass before
> every session is still being handed a groove written in a key they did not
> pick, and one who forgets is transposing before they have played a note.
>
> V15 also does not reopen what the persona ruled out. It is one row of voice
> toggles and never a grid of voices against steps — Sam: *"If this lands as
> voices-by-steps, it's the producer's feature and I close the tab."*

## Decision

**This app plays rhythm instruments only. No groove will ever carry a melodic
voice** — no bass, no comp, no pad, nothing that states a pitch.

This is not a scoping decision for V6. It is a standing constraint on every
groove the app will ever ship.

## Consequences

**What this buys.** A groove never chooses the player's key for them, so any
groove works with any material they bring. It also draws the line between this
app and its sibling in one sentence: daily-groove trains the ear and needs
harmony; metronome-groove trains the time and does not.

**What it costs.** The app can never be a backing track, and some grooves lose
something real — a bossa without a bass is a clave and a kit, which is less than
a bossa. That is accepted.

**What changes in the documents.** `docs/persona.md`'s ceiling moves down: the
clause naming bass and comp is wrong and is edited. The reasoning above it —
Sam brings the melody instrument — is untouched and is in fact the argument for
this record. `docs/music.md` §3 still documents the sibling pack's `bass` and
`comp` because it describes what the pack holds; §4 now says which voices this
app will never reach for.

**What it rules out.** The *"Sample pack: copy, decode, schedule"* candidate in
`specs/features.md` loses its harmonic half permanently rather than by deferral.

## Alternatives considered

- **Drums plus a bass** — a rhythm section rather than a drummer. Lost on the
  key argument above.
- **The full nine, as next door renders them** — the persona's answer was that
  it is the other app's job: *"If I want a band I'll open the other app."*
- **Deciding it per groove** — rejected because it is the kind of question that
  gets re-answered differently each time, and the answer is the same every time.
