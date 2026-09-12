# V14. Swung 16ths — tech spec

Built on V12, which is assumed landed. The three bar tables are frozen in
[spec.md](spec.md) with the numbers; nothing here restates them.

**The smallest change this door has specced.** One definition file, four entry
lines, and no machinery — V12's warp reduces to a swung sixteenth pair at
`stride` 1 on its own, so V14 adds nothing to `swing.ts`.

## Precondition — the tree does not currently compile

`npx tsc --noEmit` fails, on two files and only two:

```
src/features/metronome/hooks/useClickTransport.ts
src/features/metronome/hooks/useClickTransport.test.tsx
```

Both are **syntactically corrupt**, not type-wrong: `useClickTransport.ts:34`
has `takeFor: (velocity, step) => {` inside the `Audio` type, braces do not
balance, and `BOSSA_NOVA` is imported on line 13 and never used anywhere in the
file. Whole chunks are missing. It is uncommitted work in the tree (V11's
landing), so `git diff` holds whatever is recoverable.

**This blocks V12 as much as V14** — both add a line to the groove registry that
lives in this file. Fixing it is not this change's work and not this door's; it
has to be green before `/implement-vibe-with-docs 14` runs.

**It also means one contract below is written blind.** The registry's exact
shape — V12's tech spec calls it `GROOVES`, typed
`Record<Exclude<SourceId, 'click'>, GrooveDefinition>` — cannot be read off the
file in its present state. The build reads the repaired file and follows
whatever bossa and rock do there.

## Contracts

### The groove

```ts
export const SWUNG_SIXTEENTHS: GrooveDefinition
```

In `src/features/metronome/lib/groove/grooves/swungSixteenths.ts`.

| Field | Value | Why |
| :-- | :-- | :-- |
| `id` | `'swung-16ths'` | Matches the label, which is the user's own word |
| `steps` | `STEPS_PER_BAR` | |
| `subdivision` | `16` | **Forced.** Swing at stride 1 moves only odd steps, so `8` would leave them rests — a swung-sixteenth groove with nothing on its swung sixteenths |
| `swing` | `1 / 3` | Written as the ratio, as V12 writes `2 / 3`. Never `0.333` |
| `seed` | `0x5f_73_77_67` | `_swg`. Only its being fixed is musical |
| `humanize` | `STRAIGHT_FUNK_HUMANIZE` | The shared record, still under funk's name |
| `voices` | `['kick', 'snare', 'hatClosed']` | Three, no `hatOpen`. A subset of the bank rock and funk already grow, so ADR 0013's switch fetches nothing |
| `ordinary` | `[ORDINARY]` | One bar, so `phaseFor` answers 0 forever |
| `light`, `fill` | spec.md's tables | |

**`exactVoices` stays `[]`** — funk's record unchanged. The backbeat is held
exact by *placement*, not by that field, and the musician's reading of the code
is why: `exactVoices` lives on `Humanize` and is read only by `timingOffset`,
while `source.ts` computes `displace = swingOffset(...) + timingOffset(...)`.
Swing never consults it.

**The light bar's kick is one line, `steps: [7, 13]`.** Splitting it into two
lines would move step 7's bytes, and `firstHalfOrdinary` compares by
`JSON.stringify`.

### The fifth entry

| File | The line |
| :-- | :-- |
| `lib/transport/source.ts` | `SOURCE_IDS` gains `'swung-16ths'`, **last** |
| `hooks/useClickTransport.ts` | the registry gains `'swung-16ths': SWUNG_SIXTEENTHS` |
| `components/SourceSelect.tsx` | a fifth option, **last** |
| `src/lib/snippets/{types,en/metronome}.ts` | `swungSixteenths: 'Swung 16ths'` |

**Last in both lists, because both are alphabetical after `click`.** The tree
reads `['click', 'bossa-nova', 'rock', 'straight-funk']` and `SourceSelect`'s
`OPTIONS` reads the same order — bossa was added by V11 and went *second*, not
last, so insertion order is not what governs. `'Swung 16ths'` sorts after
`'Straight funk'`, which is also where spec.md's reasoning put it: the pair a
listener compares is straight funk against this, the same grid straight and
swung.

`storedSetup` needs no change — it validates against `SOURCE_IDS`.

## Epics

**One epic, one track.** There is no honest split: the change is one new file
plus four one-line edits, and no two of them can name disjoint files without
inventing a boundary. An invented second track would cost a dispatch, a brief
and a merge to buy nothing.

### Track A — the groove and its entry

* **Role:** `implementer`
* **Owns:** `lib/groove/grooves/swungSixteenths.ts` + its test,
  `lib/transport/source.ts`, `hooks/useClickTransport.ts`,
  `components/SourceSelect.tsx`, `src/lib/snippets/{types,en/metronome}.ts`
* **Needs to start:** the contracts above, and a tree that compiles

1. **red/green** — the three bars, transcribed from `spec.md`'s tables. No
   number is recomputed here; the tables are the frozen version.
2. **red/green** — `sixInvariantViolations(SWUNG_SIXTEENTHS)` returns empty. No
   `ghostVelocity` is passed, because this groove has none.
3. **red/green** — **the swing is real and lands where the musician said.** At
   `stride` 1, every even step's displacement from swing is exactly 0 and every
   odd step's is `swing × stepSeconds / 2`. Assert step 1 at **7/24 of a beat**,
   in beats rather than seconds so a reader can check it.
4. **red/green** — **the backbeat never swings.** Both `snare` backbeat steps
   are even in all three bars, so `swingOffset` returns 0 for them. Assert the
   displacement, not the step numbers — the step numbers are the *reason* it
   holds, and a test that pins them would pass a groove that swung its backbeat
   some other way.
5. **red/green** — the fifth entry: `SOURCE_IDS`, the registry, the select, the
   snippet. Reading a stored `'swung-16ths'` returns it rather than the click.
6. **red/green** — this groove and funk resolve to the same bank, so selecting
   one after the other fetches nothing (ADR 0013's device key), even though this
   groove declares three voices and funk four.
7. **green** — `sixInvariantViolations` over every groove in the registry rather
   than over this one alone. It costs one loop and it is the cheapest proof that
   a new definition file left the others alone.

## Waves

* **Wave 1:** Track A.
* There is no wave 2. One track, and step 7 is its own integration.

## Checks

`npm test && npm run lint && npm run build`

## Risks

| Risk | What holds it |
| :-- | :-- |
| **The tree does not compile before this starts** | The precondition above. It is V11's, not V14's, and it blocks V12 too |
| The registry's shape is different from what V12's tech spec describes | Track A reads the repaired file and follows bossa and rock. The contract names the entry, not the syntax |
| `subdivision: 16` is written as `8` by analogy with rock, and the groove silently stops swinging | Step 3 asserts the displacement in beats. A groove that does not swing still plays, so nothing else would catch it |
| The hat at 9.62 dB makes twelve of sixteen notes inaudible on a phone speaker | `spec.md`'s listening item 2, with 0.72 as the fallback. Not a test — it needs an ear |
| The turnaround reads as an interruption rather than an ending | `spec.md`'s listening item 7. **There is no smaller fill available**: `fillSnareLadder` needs two second-half snare values, so the fallback is an `invariants.ts` change and an ADR 0010 amendment, and it is an escalation rather than a tweak |
| V12 has not landed and the build writes against the two-argument `swingOffset` | It would still be correct — the reduction is bit-identical at stride 1 — but it would be written against a signature V12 replaces. The order is the user's decision and it is recorded in `spec.md` |

## Open

* **Where does the backbeat test live?** Asked next.
