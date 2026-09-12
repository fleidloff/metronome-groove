import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as snippets from './index'

const SNIPPETS_ROOT = import.meta.dirname
const SRC_ROOT = join(SNIPPETS_ROOT, '..', '..')
const AREAS = ['app', 'metronome'] as const

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return filesUnder(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })

const relative = (path: string) => path.slice(SRC_ROOT.length + 1)

/** Every string a user can be shown, including what the functions render. */
function everyRenderedString(): string[] {
  const out: string[] = []

  for (const area of AREAS) {
    for (const value of Object.values(
      snippets[area] as Record<string, unknown>,
    )) {
      if (typeof value === 'string') out.push(value)
      if (typeof value === 'function') {
        // Sample arguments: enough to render the template around them.
        for (const beat of [1, 2, 3, 4]) {
          out.push(String((value as (a: { beat: number }) => string)({ beat })))
        }
      }
    }
  }

  return out
}

/**
 * Everything a source file writes down as text that could actually be compared
 * against a snippet.
 *
 * **Comments are not stripped, and that is deliberate.** A snippet quoted in a
 * comment is flagged, which is stricter than the rule needs — but stripping
 * comments means parsing them out of string literals correctly, and a guard
 * that is wrong in the *lenient* direction is the one that lets a hard-coded
 * snippet through. Quote a snippet in a comment and this fails; rephrase the
 * comment.
 *
 * Not flagged, deliberately:
 *
 * - **module specifiers.** `'./Metronome'` names a file, not a word a user is
 *   shown, and renaming the app does not move the file.
 * - **test titles.** `it('schedules four beats at 120 bpm')` is prose about the
 *   test. Rewording a snippet cannot fail it, so flagging it would train
 *   everyone to route around this guard.
 *
 * Template literals keep their static parts with substitutions stripped, so
 * `${MIN_BPM} bpm` contributes " bpm". Skipping interpolated templates is how
 * the unit was smuggled into three assertions and survived this guard once.
 *
 * **Known limit.** A *fragment* of a snippet — `toHaveTextContent('Metro')` —
 * is invisible, because this looks for the whole value inside the written text.
 * A fragment breaks on a reword just the same. Catching it would mean flagging
 * every short string that happens to sit inside a snippet, which is a worse
 * trade; it is a reviewer's job.
 */
function assertableTextIn(source: string): string[] {
  const stripped = source
    .replace(/from\s*(['"`])[^'"`]*\1/g, '')
    .replace(/\b(?:import|require|vi\.mock)\(\s*(['"`])[^'"`]*\1/g, '')
    .replace(
      /\b(?:describe|it|test)(?:\.\w+)?\(\s*(['"`])(?:[^'"`\\]|\\.)*\1/g,
      '',
    )

  const quoted = [
    ...stripped.matchAll(/'((?:[^'\\\n]|\\.)*)'/g),
    ...stripped.matchAll(/"((?:[^"\\\n]|\\.)*)"/g),
  ].map((match) => match[1])

  // Regex matchers. `getByText(/Start/i)` is idiomatic Testing Library and was
  // entirely invisible here — the miss most likely to be made by accident.
  const patterns = [
    ...stripped.matchAll(/[([,:=]\s*\/((?:[^/\\\n]|\\.)+)\/[gimsuy]*/g),
  ].map((match) => match[1].replace(/[\\^$]/g, ''))

  const templates = [...stripped.matchAll(/`((?:[^`\\]|\\.)*)`/g)].flatMap(
    (match) => match[1].split(/\$\{[^}]*\}/),
  )

  return [...quoted, ...patterns, ...templates].filter(
    (text) => !isModulePath(text),
  )
}

/**
 * A path is not prose. `@/features/metronome/components/Metronome` contains the
 * app's name and renaming the app does not move the file, so matching inside it
 * would flag a boundary fixture that has nothing to do with wording.
 */
function isModulePath(text: string): boolean {
  // Only a real specifier shape. An earlier version excluded any whitespace-free
  // string containing a slash, which would have quietly dropped cover from a
  // snippet like '4/4' the day one is added.
  return /^(?:@\/|\.\.?\/|node:)/.test(text.trim())
}

describe('the snippets module is one file per area behind one index', () => {
  it('holds an en/ folder whose files are exactly the areas', () => {
    const names = readdirSync(join(SNIPPETS_ROOT, 'en'))
      .filter((name) => name.endsWith('.ts'))
      .map((name) => name.replace(/\.ts$/, ''))
      .sort()

    expect(names).toEqual([...AREAS].sort())
  })

  it('re-exports every area under its own name and nothing else', () => {
    expect(Object.keys(snippets).sort()).toEqual([...AREAS].sort())
  })

  it('exports a non-empty object per area', () => {
    for (const area of AREAS) {
      expect(
        Object.values(snippets[area] as Record<string, unknown>).length,
        area,
      ).toBeGreaterThan(0)
    }
  })
})

describe('the language folder is private to the index', () => {
  // Built by concatenation so this file does not trip its own scan.
  const PRIVATE = `snippets${'/'}en`

  it('is named by no import outside src/lib/snippets/', () => {
    const offenders = filesUnder(SRC_ROOT)
      .filter((file) => !file.startsWith(SNIPPETS_ROOT))
      .filter((file) =>
        [
          ...readFileSync(file, 'utf8').matchAll(/from\s+'([^']+)'/g),
        ].some((match) => match[1].includes(PRIVATE)),
      )
      .map(relative)

    expect(
      offenders,
      `${offenders.join(', ')} names the language folder directly. A second language replaces en/, so a consumer that names it pins the app to English — import '@/lib/snippets'.`,
    ).toEqual([])
  })
})

/**
 * The rule this file exists for: **changing a snippet must never fail a test.**
 *
 * A test that writes a sentence out is a second place that sentence lives, and
 * a reword then has to find it. Assert which snippet a thing shows by importing
 * it — never by copying what it says.
 */
describe('no test hard-codes what a snippet says', () => {
  const rendered = everyRenderedString()

  it('finds snippets to check, so this guard cannot pass vacuously', () => {
    expect(rendered.length).toBeGreaterThan(5)
    expect(rendered.every((value) => value.length > 0)).toBe(true)
  })

  it('is not written down anywhere outside src/lib/snippets/', () => {
    const offenders = filesUnder(SRC_ROOT)
      .filter((file) => !file.startsWith(SNIPPETS_ROOT))
      .flatMap((file) => {
        const written = assertableTextIn(readFileSync(file, 'utf8'))
        return rendered
          .filter((value) => written.some((text) => text.includes(value)))
          .map((value) => `${relative(file)} writes out "${value}"`)
      })

    expect(
      offenders,
      [
        offenders.join('\n'),
        '',
        'A snippet copied anywhere is a second place the wording lives, so',
        'rewording it would fail a test that has nothing to do with the change.',
        "Import the snippet and use it: getByRole('button', { name: metronome.start }).",
      ].join('\n'),
    ).toEqual([])
  })
})

describe('an interpolating snippet is a function of its arguments', () => {
  it('returns the same string for the same arguments', () => {
    expect(snippets.metronome.beatName({ beat: 2 })).toBe(
      snippets.metronome.beatName({ beat: 2 }),
    )
  })

  it('renders its argument into the string', () => {
    expect(snippets.metronome.beatName({ beat: 3 })).toContain('3')
    expect(snippets.metronome.downbeatName({ beat: 1 })).toContain('1')
  })

  it('distinguishes the downbeat from an even beat', () => {
    expect(snippets.metronome.downbeatName({ beat: 1 })).not.toBe(
      snippets.metronome.beatName({ beat: 1 }),
    )
  })
})
