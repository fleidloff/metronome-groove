# V16. An eight-bar cycle

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 16`

## What

* *"The fills are coming too often. Can we have the light fill only after 4th
  bar and the bigger fill only after 8 bars?"*
* The cycle becomes **eight bars**: ordinary ×3, light, ordinary ×3, fill.
* This is [features.md](../features.md)'s standing candidate *"fill-ins for
  grooves every x bars"*, and it revises the row above it — V8 shipped
  *"groove variations (after 2 and 4 bars)"* because that row asked for it.

## Done when

* **With Fills on, every groove runs eight bars** — ordinary ×3, light, ordinary
  ×3, fill — derived from the absolute step and never stored, exactly as the
  four-bar cycle was. *Needs an ear:* whether a fill every ~19 seconds at
  100 bpm still reads as a groove that is alive.
* **With Fills off the render is bit-identical to today**, which is the
  guarantee V8 shipped and this change must not spend.
* **`sixInvariantViolations` passes for all five grooves**, with the checker
  reading the marked bars at their new indices rather than at 1 and 3.
* **Bossa's clave still locks** — both marked bars land on the same side of the
  two-bar clave every cycle, because 2 divides 8.
* **No groove definition file changes.** Funk, rock, bossa, shuffle and second
  line are untouched data; if one of them had to move, the light bar decision
  above was wrong.

## Decided

* **The two readings of the ask converge, so there is nothing to disambiguate.**
  "Light after the 4th bar, fill after 8" and "light every 4 bars, fill every 8"
  produce the same eight-bar cycle: bar 4 light, bar 8 fill, with bar 8 taking
  the fill where the two would collide.

* **The light bar stays exactly as it is** — not strengthened to fill the longer
  phrase. Sam was asked whether it should become more of a departure now that it
  has room, and pushed back hardest on this of the three:

  > *"Barely-there is the point, and making it bigger undoes the change I just
  > asked for. […] I now have **two places in eight bars where I'm holding the
  > time alone instead of one**, and the reason I asked for eight bars was to
  > have fewer of those, not to relocate them."*

  > *"The light bar's job is to be interesting, not to be a second fill. If it
  > has to move at all with the extra room, move it toward *more* sound, not
  > less — an extra hat, a ghost note, a ride instead of a hat. Anything that
  > removes the backbeat or the downbeat is a fill wearing a different name."*

  So no groove definition is touched and no listening pass per groove is owed.
  This keeps the change to one file.

* **The first eight bars being near-identical to Fills-off is accepted, with the
  light bar as the thing that prevents it.** Sam's caveat, and it is the light
  bar's actual job:

  > *"The light bar is the only thing standing between 'a longer phrase' and
  > 'the box does nothing for the first nineteen seconds.'"*

  On whether a fill every ~19 seconds still reads as on: *"Nineteen seconds is
  not 'nothing happened,' it's 'that happened once.' Ten seconds was the problem
  — I said so."*

* **The cycle length is not exposed as a control.** The persona is silent on it
  and Sam declined to ask for it — *"Don't read my answer as asking for that
  control — I didn't."* `features.md`'s row says *"every x bars"*, but an `x`
  the user sets is a knob read past on the way to play. The number is a
  constant.

## What this change runs into

Facts about the tree, read before any question was asked.

* **It is one constant and one array.** `cycle.ts` holds
  `BARS_PER_CYCLE = 4`, used in exactly one place, and `hitsAt` builds
  `marked = [stated, light, stated, fill]`. The eight-bar version is
  `BARS_PER_CYCLE = 8` and `[stated, stated, stated, light, stated, stated,
  stated, fill]`. No groove definition changes.

* **`invariants.ts` hard-codes the bar indices** — `CYCLE_BARS` names bars at
  0, 1 and 3, and `FILL_BAR = 3`. Those become 0, 3 and 7. The six invariants
  themselves are untouched; only where the checker looks moves.

* **The phase rule still holds, and it is worth stating rather than
  rediscovering.** `phaseFor` reads `ordinary.length` — 2 for bossa's clave —
  and `cycle.ts` relies on every phase length dividing `BARS_PER_CYCLE`. 2
  divides 8 as it divided 4, so the clave still locks: the marked bars land on
  the same side of the clave every time. A groove with a 3-bar or 4-bar ordinary
  figure would break this, and none exists.

* **Round-robin gets better, not worse.** Take period is `lcm(3, 16) = 48`
  steps = 3 bars. Against a 4-bar cycle that is 12 bars before a bar repeats its
  take set; against 8 it is `lcm(3, 8) = 24`. Twice the variety, free.

* **Five grooves inherit this at once** — funk, rock, bossa, shuffle and second
  line — because the cycle is machinery and not data. One `Fills` toggle still
  governs all of them (V10).

* **The display is unaffected.** V8 settled that the cycle shows on screen as
  one bar, because the display is four beat dots. Eight bars changes nothing
  there.

* **Nothing in `docs/music.md` marks the cycle length as fixed.** ADR 0010
  governs what a marked bar may *do*, not how often it may arrive.

## Size test

| | Question | Verdict |
| :-- | :-- | :-- |
| 1 | Five `## Done when` bullets or fewer? | ✅ exactly five |
| 2 | At most two or three concern folders? | ✅ **one** — `lib/groove/` |
| 3 | Leaves what `docs/music.md` marks as fixed alone? | ✅ it marks no cycle length |
| 4 | Would one `git revert` roll it back? | ✅ |

## Open

* Nothing. `spec.md` is settled; the conversation has moved to `tech-spec.md`.
