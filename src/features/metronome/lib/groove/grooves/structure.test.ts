import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `grooves/` holds one data file per groove and nothing else (ADR 0012). Until
 * V16 each groove reached sideways into `straightFunk.ts` for the shared
 * humanize record, and `docs/architecture.md` carried that as a named exception
 * with a trigger: *when a third groove wants it, the record moves to
 * `grooves/shared.ts`*. The trigger fired at V11 and was paid twice over before
 * the move happened.
 *
 * This is what stops it happening again. A sixth groove that reaches into a
 * fifth for a constant fails here rather than quietly re-drawing the arrow the
 * move removed.
 */
const DIR = join(process.cwd(), 'src/features/metronome/lib/groove/grooves')

const MACHINERY = ['definition.ts', 'shared.ts', 'registry.ts']

const definitionFiles = readdirSync(DIR)
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .filter((name) => !MACHINERY.includes(name))
  .sort()

const importsOf = (name: string) => [
  ...new Set(
    [...readFileSync(join(DIR, name), 'utf8').matchAll(/from '([^']+)'/gu)].map(([, path]) => path),
  ),
]

describe('a groove reaches sideways for nothing', () => {
  it('finds every groove file, so a broken glob cannot pass vacuously', () => {
    expect(definitionFiles.length).toBeGreaterThanOrEqual(5)
    expect(definitionFiles).toContain('straightFunk.ts')
  })

  it.each(definitionFiles)('%s imports no other groove', (name) => {
    const siblings = definitionFiles
      .filter((other) => other !== name)
      .map((other) => `./${other.replace(/\.ts$/u, '')}`)

    expect(importsOf(name).filter((path) => siblings.includes(path))).toEqual([])
  })

  it.each(definitionFiles)('%s draws only on the shape and the shared record', (name) => {
    expect(importsOf(name).sort()).toEqual(['./definition', './shared', '@/lib/steps'])
  })

  /**
   * The registry is the one file here that may import every groove, because
   * naming them all is its whole job. It lives beside the definitions rather
   * than inside the hook that used to hold it privately: V15's mute row needs a
   * groove by its `SourceId` and a component cannot reach into a hook for one.
   */
  it('lets the registry name every groove, which is the only file that may', () => {
    const registry = importsOf('registry.ts')

    for (const name of definitionFiles) {
      expect(registry, `registry does not name ${name}`).toContain(
        `./${name.replace(/\.ts$/u, '')}`,
      )
    }
  })

  it('keeps the shared record under a name that is no groove’s', () => {
    const shared = readFileSync(join(DIR, 'shared.ts'), 'utf8')

    expect(shared).toContain('export const KIT_HUMANIZE')
    expect(importsOf('shared.ts')).toEqual(['../../transport/source'])

    for (const name of definitionFiles) {
      expect(readFileSync(join(DIR, name), 'utf8')).not.toContain('STRAIGHT_FUNK_HUMANIZE')
    }
  })
})
