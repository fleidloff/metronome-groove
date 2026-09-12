import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'
import { asRule, buildZones } from './eslint.zones.mjs'

const eslint = new ESLint({ cwd: process.cwd() })
const ZONE_RULE = 'import/no-restricted-paths'
const STYLING_RULE = 'no-restricted-syntax'

async function messagesFor(filePath: string, code: string, ruleId: string) {
  const [result] = await eslint.lintText(code, { filePath })
  return result.messages.filter((message) => message.ruleId === ruleId)
}

async function errorsFor(filePath: string, code: string) {
  return messagesFor(filePath, code, ZONE_RULE)
}

/**
 * Zones with a real file on both sides of the arrow. These are run through
 * ESLint's Node API on synthetic source with a virtual filePath, because a
 * fixture that breaks a zone would fail `npm run lint` for everyone — so this
 * is the only way a zone is ever *seen* to reject anything.
 */
const LIVE = [
  {
    zone: 1,
    rule: 'the design system may not know about features',
    filePath: 'src/components/controls/Button.tsx',
    bad: "import { Metronome } from '@/features/metronome'\nexport const a = Metronome\n",
    good: "import type { Space } from '@/components/tokens'\nexport const a: Space = 1\n",
  },
  {
    zone: 2,
    rule: 'a feature is reached only through its index',
    filePath: 'src/app/page.tsx',
    bad: "import { Metronome } from '@/features/metronome/components/Metronome'\nexport const a = Metronome\n",
    good: "import { Metronome } from '@/features/metronome'\nexport const a = Metronome\n",
  },
  {
    zone: 6,
    rule: 'no lib/ module imports UI, a hook or the store',
    filePath: 'src/features/metronome/lib/timing.ts',
    bad: "import type { Space } from '@/components/tokens'\nexport const a: Space = 1\n",
    good: 'export const beatsPerBar = 4\n',
  },
  {
    zone: 4,
    rule: 'src/lib/ is a leaf',
    filePath: 'src/lib/time.ts',
    bad: "import { Metronome } from '@/features/metronome'\nexport const a = Metronome\n",
    // A leaf imports nothing from the app — not a feature, and not the design
    // system either, which is why this good case imports nothing at all.
    good: 'export const beatsPerBar = 4\n',
  },
]

describe('the live import boundary zones', () => {
  it('are configured at all', async () => {
    const config = await eslint.calculateConfigForFile('src/app/page.tsx')

    expect(config.rules?.[ZONE_RULE]).toBeDefined()
  })

  for (const { zone, rule, filePath, bad, good } of LIVE) {
    describe(`zone ${zone} — ${rule}`, () => {
      it('fires on a bad import', async () => {
        expect(await errorsFor(filePath, bad)).not.toEqual([])
      })

      it('stays quiet on a good import', async () => {
        expect(await errorsFor(filePath, good)).toEqual([])
      })
    })
  }
})

/**
 * Zone 3 is the only zone that cannot be *fired* today, and saying why is the
 * point: its target is the sibling features, and there is one feature, so the
 * generated zone does not exist at all.
 *
 * It is asserted at the generator instead: given a tree that *has* grown, does
 * the builder produce the zone? That is the half a future slice inherits with
 * no config edit, and the half nobody would notice was missing.
 *
 * These cases also pin the shape of every zone, which firing alone does not —
 * a zone 6 pointed at the wrong folder still fires, just at the wrong thing.
 */
describe('the zones a grown tree would generate', () => {
  const grown = buildZones(['metronome', 'practice'])
  const zonesNumbered = (n: number) => grown.filter((zone) => zone.zone === n)

  it('gives zone 3 a target only once a sibling exists', () => {
    expect(buildZones(['metronome']).filter((z) => z.zone === 3)).toEqual([])

    const [first] = zonesNumbered(3)
    expect(first.from).toBe('src/features/metronome')
    expect(first.target).toEqual(['src/features/practice'])
    expect(first).not.toHaveProperty('except')
  })

  it('gives every feature a zone 2 that excepts only index.ts', () => {
    expect(zonesNumbered(2)).toHaveLength(2)

    for (const zone of zonesNumbered(2)) {
      expect(zone.except).toEqual(['index.ts'])
      expect(zone.target).toContain('src/app')
      expect(zone.target).toContain('src/components')
      expect(zone.target).toContain('src/lib')
    }
  })

  it('gives every feature a zone 6 over its own lib/', () => {
    expect(zonesNumbered(6).map((zone) => zone.target)).toEqual([
      'src/features/metronome/lib',
      'src/features/practice/lib',
    ])
  })

  it('skips zone 5, which held a generator boundary this project does not have', () => {
    expect(zonesNumbered(5)).toEqual([])
  })

  it('carries a message on every zone, naming the rule and the reason', () => {
    for (const zone of grown) {
      expect(zone.message).toMatch(/Zone \d/)
      expect(zone.message.length).toBeGreaterThan(40)
    }
  })

  it('hands ESLint no key it does not understand', () => {
    for (const zone of asRule(grown)) {
      expect(Object.keys(zone).sort()).toEqual(
        expect.arrayContaining(['from', 'message', 'target']),
      )
      expect(zone).not.toHaveProperty('zone')
    }
  })
})

/**
 * The styling guard, driven the same way and for the same reason: a fixture
 * with a `className` in a feature file cannot be committed, so this is the only
 * place the block is ever seen to reject one.
 */
describe('metronome/no-styling-in-features', () => {
  const markup = (attribute: string) =>
    `export function Widget() {\n  return <div ${attribute}>tick</div>\n}\n`

  const literal = markup('className="flex gap-4"')
  const computed = markup('className={dotClass(true, false)}')
  const plain = markup('data-emphasis="hero"')

  const inFeature = 'src/features/metronome/components/Widget.tsx'
  const inDesignSystem = 'src/components/layout/Widget.tsx'

  it('fires on a className in a feature file', async () => {
    expect(await messagesFor(inFeature, literal, STYLING_RULE)).not.toEqual([])
  })

  it('fires on a computed className, which reads no differently to the attribute', async () => {
    expect(await messagesFor(inFeature, computed, STYLING_RULE)).not.toEqual([])
  })

  it('stays quiet on a feature file that composes without styling', async () => {
    expect(await messagesFor(inFeature, plain, STYLING_RULE)).toEqual([])
  })

  it('leaves the same markup in the design system alone', async () => {
    expect(await messagesFor(inDesignSystem, literal, STYLING_RULE)).toEqual([])
  })

  it('tells the reader what to do instead', async () => {
    const [message] = await messagesFor(inFeature, literal, STYLING_RULE)

    expect(message.message).toContain('src/components/')
    expect(message.message).toMatch(/Compose/)
  })
})
