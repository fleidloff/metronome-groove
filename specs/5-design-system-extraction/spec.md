# V5. Design system extraction

Started 2026-09-12 · `/vibe-with-docs`
**Phase:** shipped 2026-09-12

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
* **The dots split into `display/Dot` and `layout/List`** — two small
  primitives composed by a `BeatRow` that holds the domain and no `className`.
  Chosen over one `DotRow` for the smaller, more reusable pieces, and it accepts
  a contract between the two: one renders the `<ol>` and `Dot` the `<li>`, so a
  `Dot` outside it is invalid markup. The tech spec settled how that pairing is
  held — the arranging primitive is called `List`, not `Row`, so the pairing
  reads in the two names.
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
* **`Space` widens to carry 10 and 12** — decided mid-build, when the contract
  met the real class lists. The scale as written could not express two gaps the
  app already renders: `gap-12` on the page frame and `sm:gap-10` on the dot
  row. `List` takes an explicit `gapWide`, so the responsive widening is the
  caller's decision rather than a bump baked into every future list. Chosen over
  dropping the bump, which would have moved the dots from 2.5rem to 1.5rem on a
  wide screen and needed a waiver against Done-when 3. `tokens.test.ts` changes
  with it — the union and its length are what that test asserts.
* **The build continues against the moved tree rather than re-speccing** —
  decided mid-build. The extraction's shape did not change: same folders, same
  four tracks, same five `## Done when` bullets, one `git revert` still rolls it
  back. `TapTempoButton` is not a ninth primitive; it is the concrete class list
  for the `normal` case `ButtonEmphasis` already declared and never had to
  define. Track C's brief widens to cover the two new files.
* **`gap-5` becomes `gap-4`, and this is the one rendering change V5 makes** —
  a waiver against Done-when 3, given deliberately. The two-button wrapper
  tightens by 0.25rem: 4px, on one element, between the play button and the tap
  button. Taken over adding `5` to `Space`, because `tokens.test.ts` uses 5 as
  its worked example of a value the closed scale rejects — *"5 is not on the
  scale, and that is the whole point"* — so admitting it would cost that test
  its point and the scale its opinion. Taken over `gap-6` as the smaller move of
  the two.
* **The rule is new, even though the change is framed as enforcement** — the
  design-system rules exist (five role groups, generic naming, zone 1,
  `structure.test.ts`), but nothing in `docs/coding-guidelines.md` said styling
  may not live in a feature. Grep for tailwind/className/styling returns three
  hits, none of them this rule. So V5 writes the rule as well as enforcing it,
  and the guidelines change is part of the work rather than a footnote.

## What the build found

**The tree moved between the spec and the build.** V5 was specced against
commit `272c770`; `26a42da add tap tempo` and `8a5a410 play / stop with bt
buttons` landed after it. The extraction is the same shape and the size test
still passes all four questions, but it is larger than *The starting state*
below describes:

* **A ninth `className`** — `TapTempoButton.tsx`, a second button with a
  different treatment: `rounded-card border border-muted/30 px-8 py-4 text-xl
  font-medium`. It is not a new primitive. It is what `ButtonEmphasis`'s
  `normal` case was always going to be, and the contract simply never had to
  define it until now.
* **A `gap-5` wrapper** in `Metronome.tsx`, holding the two buttons. `5` is the
  one number `tokens.test.ts` names as deliberately *off* the scale — *"5 is not
  on the scale, and that is the whole point."*
* **`Metronome.test.tsx` is 619 lines**, not the ~170 Track C was scoped
  against. Three of its lines touch `className`.
* `hooks/useRemoteControl.ts` is new and carries no styling, so it is not in
  scope.

## The starting state

What exists today, so a later reader can see what moved. **Written at spec time,
against `272c770`** — see *What the build found* above for what has changed
since.

| File | What it holds | Where it is heading |
| :-- | :-- | :-- |
| `features/metronome/components/Metronome.tsx` | Composer: state, transport wiring, page frame, `<h1>` | Stays a composer, loses its classes |
| `features/metronome/components/StartStopButton.tsx` | The button, 10 utility classes | `controls/` |
| `features/metronome/components/TempoControl.tsx` | The readout, the range input, a wrapper | `controls/` + `display/` |
| `features/metronome/components/BeatRow.tsx` | The four dots, and what a downbeat is | `display/`, minus the domain |

`src/components/` holds `tokens.ts` (a closed `Space` scale, unused so far),
`structure.test.ts`, and five empty role folders: `controls/`, `display/`,
`layout/`, `surfaces/`, `typography/`.
