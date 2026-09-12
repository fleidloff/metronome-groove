# 0002. Tailwind v4 as the styling layer

- **Status:** ✅ Accepted
- **Date:** 2026-09-12

## Context

No document in this repository decided how the app is styled, but one assumed an
answer: the `prototype` skill tells a reader to copy the `@theme` block out of
`src/app/globals.css`, which is Tailwind v4 syntax. An assumption sitting inside
an instruction is the kind that is discovered rather than chosen.

Separately, `docs/coding-guidelines.md` gives `src/components/tokens.ts` a
closed spacing scale that the layout primitives take instead of a raw length —
a vocabulary that has to coexist with whatever the styling layer is.

## Decision

Tailwind v4, with CSS-first theming: custom properties declared in `:root` and
in a `prefers-color-scheme: dark` block, exposed to Tailwind through
`@theme inline` in `src/app/globals.css`.

`tokens.ts` is **not** replaced by this. It stays the closed scale for spacing
decisions the design system refuses to let a caller improvise. Tailwind is how a
component is painted; `tokens.ts` is what a component is allowed to ask for.

## Consequences

**What this buys.** The `prototype` skill's instruction becomes true. A
prototype can copy one block and get both palettes, which is the thing that made
the instruction worth writing. And a token has exactly one declaration, checked
by `src/app/theme.test.ts`.

**What it costs.** Two vocabularies — Tailwind's utilities and `tokens.ts` —
with a boundary that is a judgement rather than a rule. The guideline that
decides it is that a design-system primitive takes `Space`, and everything else
is a class.

**What it rules out.** A `tailwind.config.ts`; v4 reads the theme from CSS.
Anything that expects a JS-side theme object will not find one.

**A live caveat.** `--font-sans` and `--font-mono` are referenced by `@theme`
but declared by `next/font` in `layout.tsx`, not in the stylesheet. That split
is real and `theme.test.ts` asserts both halves separately rather than papering
over it.

## Alternatives considered

- **Plain CSS Modules** — the most explicit option, and it would have made the
  design system's boundaries very visible. It lost because it would have made
  the `prototype` skill wrong and bought nothing the tokens do not already give.
- **Tailwind v3** — `tailwind.config.ts` instead of `@theme`. Starts a
  greenfield repository one major version behind, for no benefit here.
