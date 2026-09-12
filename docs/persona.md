# Persona

One player. Every feature in this app is built for them, and a decision that
does not serve them needs a different justification. See
[architecture.md](architecture.md) for the shape of the code that serves them,
and [music.md](music.md) for what it has to sound like.

This is the same Sam as [`daily-groove`](../../daily-groove/docs/persona.md).
The two projects are two tools on one shelf: daily-groove trains the ear,
metronome-groove trains the time.

## The player

**Sam, 31 — the plateaued hobby musician.**

Plays guitar and alto saxophone well enough to enjoy both. Learned by ear and by
tab, never by theory. Has a full-time job that isn't music, and practises in the
gaps: twenty minutes before dinner, an hour on a Sunday. Has started and
abandoned three theory courses, because a course is homework and they already
have a job.

Owns a metronome and mostly doesn't use it. It is right about the time and
unpleasant about it — four beeps a bar, nothing else, and playing to it makes
them stiff in a way playing with someone never does. They know the click is
telling the truth. They have never wanted to listen to it for twenty minutes.

They have also never *looked* at it. It sits behind them on the amp with its
face to the wall. A metronome is a sound to them, and the display is packaging
— which is exactly how they learned everything else they can play.

Plays Wordle every morning.

## What they want

- To practise against something they'd voluntarily listen to. If it sounds like
  music, they'll leave it running.
- A sound in one tap. Open the page, hit play, hands back on the guitar.
- To pick the tempo by ear as often as by number — they heard a thing and want
  to sit in it, not calculate it.
- To work entirely by ear once it is playing. Where the bar starts, where the
  backbeat is, whether they have slipped — they expect to hear all of it. They
  are not going to check.
- To make the reference thinner when they're ready. Fewer beats, fewer
  instruments, still a groove.
- Something to play *against*, not to follow. A backbeat is a second musician;
  a beep is a stopwatch.

## What loses them

- A beep. The reason the metronome on the shelf is on the shelf.
- Setup before sound: an account, a paywall, a permission prompt, a tutorial, a
  kit to assemble before the first bar plays.
- A screen they have to watch. Their hands are on an instrument and their eyes
  are on the fretboard or shut. A bar they can only follow by looking is a bar
  they will lose.
- Being graded. A streak, a score, a "you rushed 4%" — that is homework, and
  homework is the thing they quit three times.
- A groove that breathes. If it drifts, it is worse than the click, and they
  will not be able to say why — only that it felt wrong.

## What this implies

- **Play is the biggest thing on the page.** One tap from open to sound, with a
  default setup already loaded because we remembered the last one.
- **It is an instrument, not a trainer.** No methods, no progression, no memory
  of how they did. The practice techniques exist — they build them by hand with
  the beat toggles, and the app never mentions them.
- **The groove is the point, so it has to be a real kit.** Samples, scheduled
  live. **The click is dead on the grid and a groove is not quite** — see
  [ADR 0007](adr/0007-a-groove-is-humanized-a-click-is-not.md). A groove's hits
  are displaced by a bounded, stateless offset, which is not the same thing as
  drifting: every hit is computed from its true grid position, so the groove
  comes back to the grid on every note rather than wandering off it. Sam's own
  condition, and the reason this is allowed at all: *"it's minimal and we can
  agree that the beat is not completely drifting apart but always coming back
  together."*
- **Thinning out is one row of toggles.** Beats mute for every voice at once,
  because what they are reducing is *reference*, not arranging a pattern. A grid
  of voices against beats is a drum machine and they did not ask for one.
- **Tap tempo is not a nice-to-have.** It is how an ear-trained player states a
  tempo.
- **The ear carries everything; the screen carries nothing.** Every reference
  Sam needs while playing has to be audible on its own — the downbeat, the
  backbeat, the subdivision, which beats they muted. Nothing may be knowable
  only by looking. Switch the display off mid-bar and the app still works.
- **How beats are displayed is a low-stakes decision.** Sam glances at it
  between takes, not during them. Big and legible at two metres stays the
  sensible default, but it is a default and not a requirement — no feature gets
  designed around the visual, and the visual gets effort only once everything
  audible is right.
- **No account, and nothing to lose.** The setup lives in the browser. Coming
  back tomorrow costs nothing and starts where they stopped.
- **The lead register stays empty, and so does every other pitched one.** Sam
  brings the melody instrument, and this app never states a pitch at all:
  rhythm instruments only, no bass and no comp —
  [ADR 0006](adr/0006-rhythm-instruments-only.md). That is a tighter rule than
  next door's, and it is Sam's own: *"A bass line has a key… That is the app
  choosing my material for me."*

## Not the persona

Naming who we are *not* building for is what keeps the scope honest:

- **The producer** — someone who wants to build a beat. They need a sequencer,
  per-voice mixing and an export. Every one of those is a control Sam has to
  read past to reach play.
- **The drummer in a practice room** — who wants a click in their monitor at a
  fixed tempo and nothing else. They are well served by the metronome Sam left
  on the shelf.
- **The band on stage** — setlists, cue points, a click track per song. That is
  a different product, and it needs reliability guarantees a browser tab cannot
  make.
- **The student with a syllabus** — who wants the app to tell them what to
  practise and whether it worked. That is the trainer we explicitly did not
  build.
