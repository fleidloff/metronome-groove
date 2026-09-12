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
 * **Comments are stripped.** A comment cannot fail a test, so flagging one
 * enforces nothing and constrains prose instead. This was learned the hard
 * way: markdown backticks in JSDoc parse as template literals, so writing
 * `bpm` in a doc comment tripped this guard and two authors reworded their
 * documentation to get around it — which is the exact failure ADR 0003 warned
 * about, a guard that teaches people to route around it.
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
  const stripped = withoutComments(source)
    .replace(/from\s*(['"`])[^'"`]*\1/g, '')
    .replace(/\b(?:import|require|vi\.mock)\(\s*(['"`])[^'"`]*\1/g, '')
    .replace(
      /\b(?:describe|it|test)(?:\.\w+)?\(\s*(['"`])(?:[^'"`\\]|\\.)*\1/g,
      '',
    )
    // Vitest's assertion message — `expect(value, 'why this matters')`. Prose
    // about the test, in the same category as a title.
    //
    // **Anchored on `expect(`**, because an unanchored version matched any call
    // whose last argument was a string and which was immediately chained —
    // `s.replace(/x/, 'Start').trim()` sailed through it. Same mistake as the
    // comment strip: a lenient regex standing in for knowing what it is
    // looking at.
    // The subject is KEPT — only the message goes. Collapsing the whole call
    // to `expect(0)` threw the subject away with it, so
    // `expect(get({ name: 'Start' }), 'why').toBe(1)` hid a snippet in the
    // argument this guard exists to read.
    .replace(
      /(?<![.\w])expect\(((?:[^()'"`]|\((?:[^()]|\([^()]*\))*\)|(['"`])(?:[^'"`\\]|\\.)*\2)*),\s*(['"`])(?:[^'"`\\]|\\.)*\3\s*\)/g,
      'expect($1)',
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
 * Comments out — but **string literals first**, because a comment marker inside
 * a string is not a comment.
 *
 * Both holes were found by attacking this rather than by reading it: `'src/*'`
 * followed later by `'*\/ '` opened a block comment that swallowed everything
 * between, and `'a//b'` ate the rest of its line. Either could hide a
 * hard-coded snippet. So literals are lifted out, comments stripped from what
 * remains, and the literals put back.
 */
function withoutComments(source: string): string {
  const held: string[] = []

  const parked = source.replace(
    /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g,
    (literal) => {
      held.push(literal)
      return `\u0000${held.length - 1}\u0000`
    },
  )

  const stripped = parked
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, '')

  return stripped.replace(/\u0000(\d+)\u0000/g, (_, index) => held[Number(index)])
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

describe('the scanner itself', () => {
  const sees = (source: string, text: string) =>
    assertableTextIn(source).some((written) => written.includes(text))

  it('sees a plain literal, a template and a regex', () => {
    expect(sees("const a = 'Start'", 'Start')).toBe(true)
    expect(sees('const a = `x ${y} Start`', 'Start')).toBe(true)
    expect(sees('getByText(/Start/i)', 'Start')).toBe(true)
  })

  it('does not see a comment', () => {
    expect(sees('// the Start button', 'Start')).toBe(false)
    expect(sees('/* the Start button */', 'Start')).toBe(false)
    expect(sees('/** `Start`, in markdown */', 'Start')).toBe(false)
  })

  it('is not fooled by a comment marker inside a string', () => {
    // Both of these hid a hard-coded snippet before the literals were parked.
    expect(sees("const g = 'src/*'\nconst e = '*/ '\nconst a = 'Start'", 'Start')).toBe(true)
    expect(sees("const a = 'a//b'; const b = 'Start'", 'Start')).toBe(true)
  })

  it('does not see a test title or an assertion message', () => {
    expect(sees("it('Start works', () => {})", 'Start')).toBe(false)
    expect(sees("expect(x, 'Start is shown').toBe(1)", 'Start')).toBe(false)
  })

  it('is not fooled by a chained .expect(), whose second argument is not a message', () => {
    // supertest and Playwright both use `.expect(status, body)`. Nothing in
    // this repo does today; ruling it out costs one lookbehind.
    expect(sees("r.get('/x').expect(200, 'Start')", 'Start')).toBe(true)
  })

  it('still sees the subject of a messaged assertion', () => {
    // Dropping the message must not drop what is being asserted — this is the
    // most idiomatic way to hard-code a snippet in this repo's test style.
    expect(sees("expect(g('button', { name: 'Start' }), 'the label').toBe(1)", 'Start')).toBe(true)
    expect(sees("expect(g(/Start/i), 'why').toBe(1)", 'Start')).toBe(true)
  })

  it('still sees a snippet in a call that merely looks like an assertion', () => {
    // The over-reaching version of the message strip swallowed both of these.
    expect(sees("s.replace(/x/, 'Start').trim()", 'Start')).toBe(true)
    expect(sees("t('k', 'Start').length", 'Start')).toBe(true)
  })

  it('does not see a module path that happens to contain the word', () => {
    expect(sees("import { x } from '@/features/metronome'", 'Metronome')).toBe(false)
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
