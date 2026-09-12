# V16. An eight-bar cycle — tech spec

## Contracts

### The cycle, named rather than positional

```ts
export const BARS_PER_CYCLE = 8
export const LIGHT_BAR = 3
export const FILL_BAR = 7
```

All three in `lib/groove/cycle.ts`. `hitsAt` stops writing the cycle as a
literal and derives it:

```ts
const marked = Array.from({ length: BARS_PER_CYCLE }, (_, bar) =>
  bar === LIGHT_BAR ? bars.light : bar === FILL_BAR ? bars.fill : stated,
)
```

**`invariants.ts` imports the two indices rather than keeping its own copy.** It
currently declares `FILL_BAR = 3` and a `CYCLE_BARS` list naming bars 0, 1 and 3
— the same numbers `cycle.ts` encodes by position, in a second file. That
duplication is what this change removes, and it is the reason the answer was
"name the positions" rather than "smallest diff".

**The names in `CYCLE_BARS` are derived too.** They read `'bar 2, the light
one'` today and would be silently wrong at eight bars. They become
`` `bar ${LIGHT_BAR + 1}, the light one` `` and `` `bar ${FILL_BAR + 1}, the
fill` ``, so a violation message cannot drift from where the checker looked.

### What does not change

`phaseFor`, `barOf`, `barsFor`, the `WeakMap` cache, every groove definition,
every velocity, `Source`, the scheduler, the display. `GrooveDefinition` gains
nothing.

## Epics

One epic, one track. The two source files and the test files that name a bar
index are a single semantic edit; splitting them would put two tracks on sibling
files sharing one constant.

### Track A — the cycle

* **Role:** `implementer`
* **Owns:**
  * `src/features/metronome/lib/groove/cycle.ts` and `cycle.test.ts`
  * `src/features/metronome/lib/groove/invariants.ts`
  * `src/features/metronome/lib/groove/source.test.ts`
  * `src/features/metronome/lib/groove/grooves/straightFunk.test.ts`,
    `rock.test.ts`, `bossaNova.test.ts`, `shuffle.test.ts`,
    `secondLine.test.ts` — only where they name a cycle index
* **Needs to start:** the contracts above

1. **red** — `barIndexFor` over sixteen bars returns `0…7, 0…7`, and
   `BARS_PER_CYCLE` is 8. `cycle.test.ts`'s `describe('the four-bar cycle')`
   is renamed with it
2. **red/green** — the marked bars land at 3 and 7 and nowhere else: bars 0, 1,
   2, 4, 5 and 6 of the cycle are each byte-identical to the groove's ordinary
   bar of that phase, and bars 3 and 7 are not
3. **red/green** — **Fills off is bit-identical to today.** Assert it against
   the render rather than against the flag: for every step of two full cycles,
   `hitsAt(groove, step, false)` equals the ordinary bar of that step's phase,
   for all five grooves
4. **red/green** — `invariants.ts` reads `LIGHT_BAR` and `FILL_BAR` from
   `cycle.ts`, and `sixInvariantViolations` returns empty for all five grooves
5. **red/green** — **the clave still locks.** Both marked bars fall on phase 1
   of bossa's two-bar ordinary figure — `3 % 2` and `7 % 2` — exactly as `1 % 2`
   and `3 % 2` did. Assert the phase of each marked bar, not the arithmetic
6. **green** — `source.test.ts`'s `FILL_BAR_STARTS` moves from `[48, 112, 176]`
   to `[112, 240, 368]`, which is bars 7, 15 and 23 on a sixteen-step grid

## Waves

* **Wave 1:** Track A. There is no wave 2 — one track, verified by its own tests.

## Checks

`npm test && npm run lint && npm run build`

## Risks

| Risk | What holds it |
| :-- | :-- |
| **`source.test.ts` passes for the wrong reason.** It asserts that three fill bars draw distinct takes; wrong start steps still satisfy that, because ordinary bars draw distinct takes too | Step 6 names the values. Pair it with an assertion that each start is a fill bar — `barIndexFor(start, 16) === FILL_BAR` — so a wrong number fails rather than passes quietly |
| A test asserting `barAt(1) !== ORDINARY` now fails, and the fix is to change the index rather than to delete the case | Bars 1 and 2 are ordinary under the new cycle. The assertion moves to `barAt(LIGHT_BAR)`; the case it protects is still worth having |
| The light bar quietly gets strengthened while someone is in there | No groove definition file is in Track A's `Owns`. If one needs editing, the spec's light-bar decision was wrong and the change stops |
| Round-robin period changes without anyone noticing | It improves: takes repeat every 3 bars, so a bar repeats its take set every `lcm(3, 8) = 24` bars instead of 12. Worth an assertion only if a test already pins 12 |
| Another session is mid-build in `lib/groove/` | Five groove files landed there today. Check `git status` before starting, and do not restore any file from `HEAD` |
