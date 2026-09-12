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

function everyRenderedString(): string[] {
  const out: string[] = []

  for (const area of AREAS) {
    for (const value of Object.values(
      snippets[area] as Record<string, unknown>,
    )) {
      if (typeof value === 'string') out.push(value)
      if (typeof value === 'function') {
        for (const beat of [1, 2, 3, 4]) {
          out.push(String((value as (a: { beat: number }) => string)({ beat })))
        }
      }
    }
  }

  return out
}

function assertableTextIn(source: string): string[] {
  const stripped = withoutComments(source)
    .replace(/from\s*(['"`])[^'"`]*\1/g, '')
    .replace(/\b(?:import|require|vi\.mock)\(\s*(['"`])[^'"`]*\1/g, '')
    .replace(
      /\b(?:describe|it|test)(?:\.\w+)?\(\s*(['"`])(?:[^'"`\\]|\\.)*\1/g,
      '',
    )
    .replace(
      /(?<![.\w])expect\(((?:[^()'"`]|\((?:[^()]|\([^()]*\))*\)|(['"`])(?:[^'"`\\]|\\.)*\2)*),\s*(['"`])(?:[^'"`\\]|\\.)*\3\s*\)/g,
      'expect($1)',
    )

  const quoted = [
    ...stripped.matchAll(/'((?:[^'\\\n]|\\.)*)'/g),
    ...stripped.matchAll(/"((?:[^"\\\n]|\\.)*)"/g),
  ].map((match) => match[1])

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

function isModulePath(text: string): boolean {
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
    expect(sees("const g = 'src/*'\nconst e = '*/ '\nconst a = 'Start'", 'Start')).toBe(true)
    expect(sees("const a = 'a//b'; const b = 'Start'", 'Start')).toBe(true)
  })

  it('does not see a test title or an assertion message', () => {
    expect(sees("it('Start works', () => {})", 'Start')).toBe(false)
    expect(sees("expect(x, 'Start is shown').toBe(1)", 'Start')).toBe(false)
  })

  it('is not fooled by a chained .expect(), whose second argument is not a message', () => {
    expect(sees("r.get('/x').expect(200, 'Start')", 'Start')).toBe(true)
  })

  it('still sees the subject of a messaged assertion', () => {
    expect(sees("expect(g('button', { name: 'Start' }), 'the label').toBe(1)", 'Start')).toBe(true)
    expect(sees("expect(g(/Start/i), 'why').toBe(1)", 'Start')).toBe(true)
  })

  it('still sees a snippet in a call that merely looks like an assertion', () => {
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
