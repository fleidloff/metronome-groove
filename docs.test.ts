import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ADR_DIR = join(process.cwd(), 'docs', 'adr')
const TEMPLATE = '0000'

const adrFiles = readdirSync(ADR_DIR)
  .filter((name) => /^\d{4}-.+\.md$/.test(name) && !name.startsWith(TEMPLATE))
  .sort()

const index = readFileSync(join(ADR_DIR, 'adrs.md'), 'utf8')

describe('the ADR index lists every record', () => {
  it('finds records to check, so a broken glob cannot pass vacuously', () => {
    expect(adrFiles.length).toBeGreaterThan(10)
  })

  it.each(adrFiles)('links %s', (file) => {
    expect(index).toContain(`(${file})`)
  })

  it.each(adrFiles)('gives %s a status', (file) => {
    const row = index.split('\n').find((line) => line.includes(`(${file})`))

    expect(row).toMatch(/\|\s*(✅ Accepted|🤔 Proposed|⛔ Superseded by)/u)
  })

  it('numbers them without a gap or a repeat', () => {
    const numbers = adrFiles.map((file) => Number(file.slice(0, 4)))

    expect(numbers).toEqual(Array.from(numbers, (_, i) => i + 1))
  })
})
