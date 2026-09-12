# V16. An eight-bar cycle

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** spec

## What

* *"The fills are coming too often. Can we have the light fill only after 4th
  bar and the bigger fill only after 8 bars?"*
* The cycle becomes **eight bars**: ordinary ×3, light, ordinary ×3, fill.
* This is [features.md](../features.md)'s standing candidate *"fill-ins for
  grooves every x bars"*, and it revises the row above it — V8 shipped
  *"groove variations (after 2 and 4 bars)"* because that row asked for it.

## Done when

* (to be written)

## Decided

* **The two readings of the ask converge, so there is nothing to disambiguate.**
  "Light after the 4th bar, fill after 8" and "light every 4 bars, fill every 8"
  produce the same eight-bar cycle: bar 4 light, bar 8 fill, with bar 8 taking
  the fill where the two would collide.

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

## Open

* **Whether the light bar stays as it is** now that it carries a longer phrase
  — with the `musician`, and asked in the conversation.
