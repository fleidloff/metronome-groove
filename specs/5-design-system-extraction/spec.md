# V5. Design system extraction

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** ready to build — `/implement-vibe-with-docs 5`

## What

* Enforce the rule already in [architecture.md](../../docs/architecture.md):
  visual components live in `src/components/`, and a feature slice composes them.
* Extract every visual component the app already uses — *"button, slider, text,
  headline, the dots"* — out of `src/features/metronome/components/` and into
  the five role groups under `src/components/`.
* *"No design (tailwind, etc) is in `src/features` anymore."*
* *"The rules existed already, we are just enforcing and re-structuring"* — this
  ships no user-visible change.

## Done when

* **No `className` appears anywhere under `src/features/`**, and something in
  the suite fails the moment one is reintroduced.
* **The extracted primitives live under `src/components/`** in the role group
  the one-line test picks, named with no domain word, with
  `structure.test.ts` still green: the button, the range input, the tempo
  readout, the app-name line, the dot and the row that arranges it, and the
  page frame.
* **Nothing the player sees changes.** Same roles, same accessible names, same
  behaviour — `Metronome.test.tsx` still covers start/stop, the slider's range
  and clamping, the dots lighting and clearing, and teardown. *Needs a look as
  well as a run:* the page is meant to be pixel-identical, and no test asserts
  that.
* **The class facts are asserted in `src/components/`** and the feature asserts
  intent through the primitives' `data-*` attributes — the dominant button and
  the emphasised downbeat are each checked on both sides.
* **`docs/coding-guidelines.md` states the new rule**, tagged *lint-enforced*
  or *human-checked* after whichever guard the tech spec builds, and names
  `src/app/layout.tsx` as the document shell the rule does not reach.

## Open

* Nothing. The spec is settled; open questions now belong to
  [tech-spec.md](tech-spec.md).

## Decided

* **Which folder** — `src/components/`, not `src/model`. The opening line said
  "src/model"; [architecture.md](../../docs/architecture.md) and the same
  sentence both say `src/components/`, and the five role groups already exist
  there with `.gitkeep` files waiting.
* **Nothing the player sees may change** — this is a re-structuring. The
  rendered output, the accessible names and the behaviour are the fixed point
  the extraction is measured against.
* **Zero `className` under `src/features/`** — layout included, not just
  decoration. The page frame becomes a `layout/` primitive taking the closed
  `Space` scale from `tokens.ts`, and a feature file is left holding composition
  and state. Chosen over banning visual utilities alone because that version
  needs a prefix allowlist a reviewer has to maintain, and every new Tailwind
  utility becomes a judgement call. This version is one rule a linter can state,
  and it gives `tokens.ts` its first consumer.
* **The dots split into `display/Dot` and `layout/Row`** — two small
  primitives composed by a `BeatRow` that holds the domain and no `className`.
  Chosen over one `DotRow` for the smaller, more reusable pieces, and it accepts
  a contract between the two: `Row` renders the `<ol>` and `Dot` the `<li>`, so
  a `Dot` outside a `Row` is invalid markup. The tech spec has to say how that
  pairing is held — the tests select on `listitem`, so nothing catches it by
  accident.
* **Assertions split by subject** — `src/components/` tests assert the classes
  (the `hero` button really is full-width and huge; the emphasised dot really
  differs in more than colour), and the feature test still renders the composed
  page but asserts *intent* through a `data-*` attribute the primitive emits.
  This is `coding-guidelines.md`'s own standard — a test asserts its own
  module's subject — and it keeps Sam's condition checkable on both sides: the
  design system proves the variant is distinct, the feature proves it asked for
  it. The cost is honest: two assertions are rewritten rather than relocated,
  and a `data-*` attribute ships partly to be asserted on.
* **The rule binds `src/features/` and stops there** — stated as one path with
  no exception list. `src/app/layout.tsx` keeps its `<html>` and `<body>`
  classes and the guidelines name it as the document shell: next/font must put
  its CSS-variable classes on `<html>`, and `<html>`/`<body>` cannot be a
  component you compose, so any wider phrasing would carry a carve-out anyway.
* **The rule is new, even though the change is framed as enforcement** — the
  design-system rules exist (five role groups, generic naming, zone 1,
  `structure.test.ts`), but nothing in `docs/coding-guidelines.md` said styling
  may not live in a feature. Grep for tailwind/className/styling returns three
  hits, none of them this rule. So V5 writes the rule as well as enforcing it,
  and the guidelines change is part of the work rather than a footnote.

## Open

* **Does the rule bind `src/app/` as well?** — `layout.tsx` carries
  `h-full antialiased` on `<html>` and `flex min-h-full flex-col` on `<body>`.
  Options: (A) the rule binds `src/features/` only, and the document shell is
  named as what it is — *recommended*, next/font has to put its variables on
  `<html>` and a document shell is not a component; (B) it binds `src/app/`
  too, and the body shell becomes a layout primitive; (C) it binds everything
  outside `src/components/`, with `layout.tsx` as a written exception.

## The starting state

What exists today, so a later reader can see what moved.

| File | What it holds | Where it is heading |
| :-- | :-- | :-- |
| `features/metronome/components/Metronome.tsx` | Composer: state, transport wiring, page frame, `<h1>` | Stays a composer, loses its classes |
| `features/metronome/components/StartStopButton.tsx` | The button, 10 utility classes | `controls/` |
| `features/metronome/components/TempoControl.tsx` | The readout, the range input, a wrapper | `controls/` + `display/` |
| `features/metronome/components/BeatRow.tsx` | The four dots, and what a downbeat is | `display/`, minus the domain |

`src/components/` holds `tokens.ts` (a closed `Space` scale, unused so far),
`structure.test.ts`, and five empty role folders: `controls/`, `display/`,
`layout/`, `surfaces/`, `typography/`.
