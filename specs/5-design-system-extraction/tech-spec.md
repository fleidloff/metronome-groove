# V5. Design system extraction — tech spec

## Contracts

### The guard

One new named block in `eslint.config.mjs`, beside `metronome/import-boundaries`:

```js
{
  name: 'metronome/no-styling-in-features',
  files: ['src/features/**/*.tsx'],
  rules: {
    'no-restricted-syntax': ['error', {
      selector: "JSXAttribute[name.name='className']",
      message:
        'Styling lives in src/components/. Compose a design-system component, ' +
        'or add the variant there and select it with a prop.',
    }],
  },
}
```

It matches the **attribute**, not the text. `className={dotClass(a, b)}` is
caught; `element.className` in a test is not, which is why this is a lint rule
and not the disk-reading structural test the route boundary uses.

`eslint.config.test.ts` already asserts the resolver is load-bearing; this block
needs its own case there — a fixture with a `className` in a feature file must
error, and the same file under `src/components/` must not.

### The primitives

```ts
// src/components/controls/Button.tsx
export type ButtonEmphasis = 'hero' | 'normal'
export function Button(props: {
  emphasis?: ButtonEmphasis          // default 'normal'
  pressed?: boolean                  // -> aria-pressed
  onPress: () => void
  children: ReactNode
}): ReactElement
// <button type="button" data-emphasis={emphasis} aria-pressed={pressed}>

// src/components/controls/Slider.tsx
export function Slider(props: {
  id?: string
  label: string                      // -> aria-label
  min: number
  max: number
  step?: number                      // default 1
  value: number
  onChange: (value: number) => void  // already Number()-ed
}): ReactElement
// <input type="range">

// src/components/display/Readout.tsx
export function Readout(props: {
  htmlFor?: string
  value: string | number
  unit?: string
}): ReactElement
// <output> — implicit role="status", which the feature test selects on

// src/components/display/Dot.tsx
export function Dot(props: {
  label: string
  emphasised?: boolean               // -> data-emphasised
  active?: boolean                   // -> aria-current="step"
}): ReactElement
// <li> — pairs with List, which renders the <ol>

// src/components/layout/List.tsx
export function List(props: {
  label: string                      // -> aria-label
  gap?: Space
  children: ReactNode
}): ReactElement
// <ol>

// src/components/layout/Stack.tsx
export function Stack(props: {
  gap?: Space
  children: ReactNode
}): ReactElement

// src/components/layout/PageFrame.tsx
export function PageFrame(props: { children: ReactNode }): ReactElement
// <main> — the page's one frame, so it takes no gap

// src/components/typography/Eyebrow.tsx
export function Eyebrow(props: {
  level?: 1 | 2 | 3                  // default 1
  children: ReactNode
}): ReactElement
// <h1> | <h2> | <h3>
```

**Elements are fixed, and the names say which.** `List` renders the `<ol>` and
`Dot` the `<li>`, so the pairing lives in the two names rather than in a comment
— a `Dot` outside a `List` is wrong the way a `<li>` outside a list is wrong,
and a reader can see it. Nothing takes a polymorphic `as`: a second caller does
not exist yet, and the repo's door rule already says a widening is earned by
growth rather than granted up front. `Eyebrow` is the one exception, and it
takes `level` rather than an element, because a heading *level* genuinely varies
between pages where the element does not.

`tokens.ts` gains no new type. `Space` already exists, is closed, and is what
every layout primitive takes for its gap — V5 is the change that finally gives
it a consumer.

### What each file becomes

| Today | Becomes | Group |
| :-- | :-- | :-- |
| `StartStopButton.tsx` | `Button.tsx` | `controls/` |
| `TempoControl.tsx`, the `<input type="range">` | `Slider.tsx` | `controls/` |
| `TempoControl.tsx`, the `<output>` | `Readout.tsx` | `display/` |
| `TempoControl.tsx`, the wrapping `<div>` | `Stack.tsx` | `layout/` |
| `BeatRow.tsx`, one `<li>` | `Dot.tsx` | `display/` |
| `BeatRow.tsx`, the `<ol>` | `List.tsx` | `layout/` |
| `Metronome.tsx`, the `<main>` | `PageFrame.tsx` | `layout/` |
| `Metronome.tsx`, the `<h1>` | `Eyebrow.tsx` | `typography/` |

`StartStopButton.tsx`, `TempoControl.tsx` and `BeatRow.tsx` stay as files: they
keep the domain — the snippets, what a downbeat is, what clamping means — and
lose every class. `Metronome.tsx` stays the composer.

## Epics

One epic. The change ships as a unit — primitives with no caller ship nothing,
and a rewired feature with no primitives does not build.

### Track A — the design system's tests

* **Role:** `test-writer`
* **Owns:** `src/components/controls/*.test.tsx`,
  `src/components/display/*.test.tsx`, `src/components/layout/*.test.tsx`,
  `src/components/typography/*.test.tsx`
* **Needs to start:** the contracts above. Nothing else

1. **red** — `Button`: `emphasis="hero"` renders `w-full` and a `text-(4–9)xl`
   class, and sets `data-emphasis="hero"`; `pressed` reaches `aria-pressed`
2. **red** — `Dot`: `emphasised` differs from a plain dot in more than colour.
   Reuse the existing `shapeOf`/`sizeOf` helpers verbatim — this is the
   relocation of Sam's condition, and rewriting it would lose what it checks
3. **red** — `Slider`, `Readout`: label, range, the `Number()` on change, and
   `<output>`'s implicit `role="status"`
4. **red** — `List`, `Stack`, `PageFrame`: each maps its `Space` gap to the
   expected class, and `List` renders an `<ol>` carrying `aria-label`
5. **red** — `Eyebrow`: `level` picks the heading element; default is `<h1>`

### Track B — the primitives

* **Role:** `implementer`
* **Owns:** `src/components/controls/Button.tsx`, `controls/Slider.tsx`,
  `display/Readout.tsx`, `display/Dot.tsx`, `layout/List.tsx`,
  `layout/Stack.tsx`, `layout/PageFrame.tsx`, `typography/Eyebrow.tsx`
* **Needs to start:** Track A's tests

1. **green** — each primitive, carrying the class list lifted verbatim from the
   feature file it came from. Verbatim is the point: a class that changes here
   is a rendering change, and Done-when bullet 3 says there are none
2. **green** — `structure.test.ts` still passes: no barrels, no `../` climbs

### Track C — rewire the feature

* **Role:** `implementer`
* **Owns:** `src/features/metronome/components/*.tsx`,
  `src/features/metronome/components/Metronome.test.tsx`
* **Needs to start:** Track B on disk

1. **green** — `StartStopButton`, `TempoControl`, `BeatRow` and `Metronome`
   compose the primitives and hold no `className`. The domain stays: the
   snippets, `clampTempo`, and which beat is the downbeat
2. **green** — the two class assertions in `Metronome.test.tsx` become
   `data-*` assertions on the composed page; every other case is untouched

### Track D — the guard and the rule

* **Role:** `implementer`
* **Owns:** `eslint.config.mjs`, `eslint.config.test.ts`,
  `docs/coding-guidelines.md`
* **Needs to start:** the contracts above

1. **red** — a case in `eslint.config.test.ts`: a `className` in a feature
   fixture errors, the same markup under `src/components/` does not
2. **green** — the `metronome/no-styling-in-features` block
3. **green** — the rule in `docs/coding-guidelines.md` under *Feature slices*,
   tagged *lint-enforced*, naming `src/app/layout.tsx` as the document shell it
   does not reach

## Waves

* **Wave 1:** Track A — red, against frozen contracts
* **Wave 2:** Track B — green. Needs A's tests
* **Wave 3 (parallel):** Track C, Track D — disjoint files. D's lint block only
  goes green once C has stripped the last `className`, so neither verifies
  alone; the integration step verifies both
* **Integration:** the full checks below, then the look

## Checks

* `npm test`, `npm run lint`, `npm run build`
* A look at the running page against `main` — Done-when bullet 3 is the one
  nothing asserts.

## Risks

| Risk | What holds it |
| :-- | :-- |
| The extraction changes the rendering, and no test notices | Every existing `Metronome.test.tsx` case survives the move unrewritten, except the two class assertions the spec decided to split. A diff of the two class lists per element is the cheap check |
| `structure.test.ts` fails on a stray `index.ts` | It already asserts no barrels and no `../` climbs. The primitives import siblings relatively and cross groups through `@/components/…` |
| The lint block's `files` glob also catches `.ts` test helpers | Scoped to `**/*.tsx`, and the selector is a JSX attribute, so a `.ts` file cannot trip it |
| The guard passes because the resolver silently failed | `eslint.config.test.ts` gets a case for this block, the way it already has one for the zones |
