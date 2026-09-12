import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(process.cwd(), 'src/components')
const GROUPS = ['controls', 'display', 'layout', 'surfaces', 'typography']

const entriesOf = (dir: string) => readdirSync(dir, { withFileTypes: true })

const filesUnder = (dir: string): string[] =>
  entriesOf(dir).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  })

describe('the design system', () => {
  it('holds exactly the five role groups', () => {
    const dirs = entriesOf(ROOT)
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()

    expect(dirs).toEqual(GROUPS)
  })

  it('keeps tokens.ts at the root, outside every group', () => {
    expect(statSync(join(ROOT, 'tokens.ts')).isFile()).toBe(true)

    for (const group of GROUPS) {
      const names = entriesOf(join(ROOT, group)).map((entry) => entry.name)
      expect(names).not.toContain('tokens.ts')
    }
  })

  it('has no barrel files', () => {
    const barrels = filesUnder(ROOT).filter((path) =>
      /\/index\.tsx?$/.test(path),
    )

    expect(barrels).toEqual([])
  })

  it('has no import that climbs out of its own folder', () => {
    const climbing = filesUnder(ROOT)
      .filter((path) => /\.tsx?$/.test(path))
      .filter((path) => /from\s+'\.\.\//.test(readFileSync(path, 'utf8')))

    expect(climbing).toEqual([])
  })
})
