import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(process.cwd(), 'src/app')
const SURFACE = '@/features/metronome'

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return filesUnder(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })

const Q = `['"\`]`
export function specifiersIn(source: string): string[] {
  return [
    ...source.matchAll(new RegExp(`from\\s+${Q}([^'"\`]+)${Q}`, 'g')),
    ...source.matchAll(new RegExp(`vi\\.mock\\(\\s*${Q}([^'"\`]+)${Q}`, 'g')),
    ...source.matchAll(new RegExp(`import\\(\\s*${Q}([^'"\`]+)${Q}`, 'g')),
    ...source.matchAll(new RegExp(`require\\(\\s*${Q}([^'"\`]+)${Q}`, 'g')),
  ].map((match) => match[1])
}

describe('the specifier matcher', () => {
  it('finds every shape a route could reach a feature with', () => {
    const found = specifiersIn(`
      import { a } from '@/features/metronome'
      import { b } from "@/features/metronome/components/Metronome"
      vi.mock('@/features/metronome/lib/timing')
      vi.mock("@/features/other")
      const c = await import('@/features/metronome/state/store')
      const d = require('@/features/metronome/data/preset')
    `)

    expect(found).toEqual(
      expect.arrayContaining([
        '@/features/metronome',
        '@/features/metronome/components/Metronome',
        '@/features/metronome/lib/timing',
        '@/features/other',
        '@/features/metronome/state/store',
        '@/features/metronome/data/preset',
      ]),
    )
    expect(found).toHaveLength(6)
  })
})

describe('the route boundary', () => {
  const SELF = join(ROOT, 'route-boundary.test.ts')
  const routes = filesUnder(ROOT).filter((path) => path !== SELF)

  it('excludes only itself, and nothing else', () => {
    const excluded = filesUnder(ROOT).filter((path) => path === SELF)

    expect(excluded).toHaveLength(1)
  })

  it('finds route files to check', () => {
    expect(routes.length).toBeGreaterThan(0)
  })

  it('reaches a feature only through its index', () => {
    const offenders = routes.flatMap((path) =>
      specifiersIn(readFileSync(path, 'utf8'))
        .filter((specifier) => specifier.startsWith('@/features'))
        .filter((specifier) => specifier !== SURFACE)
        .map((specifier) => `${path}: ${specifier}`),
    )

    expect(offenders).toEqual([])
  })

  it('renders the metronome slice', () => {
    const page = readFileSync(join(ROOT, 'page.tsx'), 'utf8')

    expect(specifiersIn(page)).toContain(SURFACE)
  })
})
