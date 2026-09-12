---
name: prototype
description: Build a clickable HTML prototype of a vibed change — one self-contained file under its spec folder, dressed in the app's own tokens, with every screen and state reachable from a switcher bar. Reads `specs/N-title/spec.md` and refuses to run while its questions are open. Use whenever the user runs `/prototype`, or asks for a clickable mockup, a click-dummy, a walkthrough, or to see what a spec would look like before it is built.
argument-hint: [N]
---

# Prototype

A spec you can click. One HTML file, opened straight from disk, that shows what
the settled requirements actually feel like on a phone — long before any of it
is built.

**It exists to be wrong cheaply.** The spec says the tempo readout stays put all
session; the prototype is where you find out it pushes the start button below
the fold. Finding that here costs one file. Finding it in
`/implement-vibe-with-docs` costs a rebuild.

It is a step in no door. `/vibe-with-docs` doesn't wait for it and
`/implement-vibe-with-docs` never reads it. Run it when a `spec.md` is settled
and you want to look at it, or skip it entirely.

## 0. Never commit, never touch `src/`

No `git add`, no `git commit`, no branch. And nothing outside the prototype file
itself changes — not a component, not a token, not a test. A prototype that
edited the app would be the feature, badly.

## 1. Resolve the target

| Invocation | Reads | Writes |
| :-- | :-- | :-- |
| `/prototype 4` | `specs/4-<title>/spec.md` | `specs/4-<title>/prototype.html` |
| bare `/prototype` | — | list what is prototypable and ask which |

Accept loose input: `4`, `V4` and `specs/4-practice-timer` all resolve to the
same folder.

A prototype lives inside the folder it describes, and
and it stays there after the change ships — nothing deletes a spec folder. What
expires is not the file but its *truth*: the moment the real screen exists, the
drawing is a picture of something that no longer needs drawing. §7 says what has
to leave it before that happens.

Re-running over an existing prototype rewrites it. Say so first if the user's
own edits are in the file — check `git status` before overwriting.

## 2. The gate

**A change is prototypable once `spec.md` is settled**, and `tech-spec.md` is
irrelevant to that — a prototype is a question about the product, so a spec
still in its `spec` phase is prototypable, and often that is exactly when it is
worth drawing.

What must hold: `## What` and `## Done when` both say something, and nothing
under `## Open` is a question the drawing would have to answer. Per
`/vibe-with-docs` §5 that section carries the question currently being asked, so
an open bullet there is usually the live one — if it decides a screen, name it
and stop. A bullet parked on something the picture never shows — a storage key,
a test boundary — doesn't block.

The gate is not bureaucracy. Drawing a screen forces a hundred small decisions,
and against an unsettled spec you make every one of them yourself — then the
answers come back and the prototype is arguing with the requirements. Worse, the
picture is persuasive: a screen the user has clicked through quietly becomes the
requirement, and the question they were about to answer never gets asked.

**Most small changes don't want one at all.** A change you can describe in five
bullets is usually faster to build than to draw. Say so and point at
`/implement-vibe-with-docs N`, unless the change is visual enough that a picture
settles something words are circling.

## 3. Read the inputs

- **`spec.md`.** The requirements are the brief. Every screen and every state in
  the prototype should trace to a line in it — `## What` and `## Done when`.
  Read `## Decided` too, because a decision with its reason written down is one
  the drawing must not quietly re-take. Don't read `tech-spec.md` — it is the
  code, and drawing from it makes the picture a diagram of the build.
- **`docs/persona.md`.** That decides the frame width, the tap targets and what
  has to be visible without scrolling. Where the drawing has to invent something
  the requirements left silent *and* the invention is the user's business — what
  sits above the fold, whether a control is there at all, what the copy calls a
  mode — dispatch the `sam` agent and record its verdict in the invented-list,
  instead of settling it by taste.
- **`src/app/globals.css`.** The `@theme` block is the palette, the radii and
  the shadow. Copy the values; do not invent a second set.
- **The nearest existing components**, for shapes you are reusing. Read them to
  match the look. Never import them.

Don't read `docs/architecture.md`, the lint zones or `docs/music.md` for this.
None of them binds a file that no build touches, and a prototype written as if
they do turns into a draft implementation.

## 4. What the file is

One self-contained `.html`: inline `<style>`, inline `<script>`, no npm, no
build step, no CDN, no framework, no external request of any kind. It has to
open with `open <path>` from a clean checkout on a plane.

```
:root { tokens copied from globals.css }   <- one place, both palettes
.frame { max-width: 420px; margin: auto }  <- the phone, centred
<nav class="states">                       <- §5, the switcher
<section data-state="…"> … </section>      <- one per state, one visible
<script> switcher + the two or three fake interactions </script>
```

- **Both palettes.** Copy the `@media (prefers-color-scheme: dark)` overrides
  too. Half the point of matching the tokens is seeing the dark one.
- **Fonts fall back.** The app loads its faces through `next/font`; a file on
  disk can't. Use a generic stack and note in the report that the display face
  is standing in.
- **Fake data, plainly fake.** Hand-written values, a hand-written date. No
  import of anything the app generates or stores.
- **No audio.** A start button toggles a visible running state and nothing else.
  Sound is the one thing a prototype can't help with, and wiring up a real click
  buys a demo the spec didn't ask for — for a metronome that is the sharpest
  version of this rule, because the thing the app *is* cannot be drawn. Say so
  in the report rather than faking it.

## 5. Every state reachable in one click

This is what separates a prototype from a screenshot, and it is the part worth
spending the effort on.

A fixed bar at the top of the page, outside the frame, with one button per state
`## Done when` describes — *first run · idle · running · paused · settings
open*. Clicking one shows that state. Label the bar as scaffolding, in a colour
nothing in the app uses, so nobody mistakes it for a screen.

**Both routes into every state.** The bar jumps there; the screen's own controls
also get there — start moves to running, the settings button opens settings.
Only the flows the spec actually names need to work; a control that is out of
scope can be inert, as long as it looks inert.

Anything genuinely uncertain gets both versions as two states side by side, and
say in the report which two you want the user to compare. That is the fastest
question this skill can ask.

## 6. Fidelity: the look, never the code

Match the app closely enough that a judgement made here holds when it is built —
the tokens, the spacing, the radii, the phone width, the type scale.

Then stop. No React, no TypeScript, no component split, no state machine, no
accessibility work beyond real `<button>`s and readable contrast, no test. The
prototype stops being consulted the moment the real screen exists, and every
hour spent making it good code is an hour spent on a file nobody will open
again. If you catch yourself factoring out a component, you are building the
feature.

Vanilla JS, one script block, `data-` attributes and `classList`. Thirty lines
is a normal amount.

## 7. Record it beside the spec

Append to `spec.md`:

```markdown
## Prototype

* `prototype.html` — states: first run, idle, running, paused
* invented, not in the spec: <each thing the drawing needed and the spec doesn't say>
* to compare: <the fork you built twice, if any>
```

**The invented list is the output that matters most.** Everything the prototype
had to decide because the requirements were silent is a gap the spec didn't know
it had, and the list is what turns a picture back into a question. Keep it
literal — "where the beat counter sits", "what the button says while paused" —
not "some visual details".

**A gap recorded only in the `## Prototype` note is a gap nobody acts on** — the
note is a footnote on a picture, and the build reads `## Done when` and
`## Decided`. So anything the drawing invented that the user should actually
decide **also** goes under `## Open` in `spec.md` as a question — written the way `/vibe-with-docs` §4 writes one, with
its two to four options and which you would recommend — so the next
`/vibe-with-docs N` picks it up and the answer lands in `## Decided`, where §8
of the build can turn it into a record. Don't answer it here: this skill draws,
it does not settle.

Nothing else changes.

## 8. Checks

There are none to run. The file is outside `src/`, no build compiles it and no
test imports it — running `npm run lint` or `npm test` here proves nothing about
the prototype and only tells you whether the tree was already green.

What replaces them is looking at it. Open it, click every button in the
switcher, click through each state's own flow, and check the dark palette by
flipping the system appearance. Say in the report that you did, or say which
parts you couldn't check.

## 9. Report

The file path and the `open` command to run it. The states it holds. The
invented list from §7, in full — it is the reason to read the report. Anything
standing in for the real thing (fonts, data, silence where the click would be).
Then the next step: `/vibe-with-docs N` either way — to answer what the drawing
opened, or to move on to the tech spec.
