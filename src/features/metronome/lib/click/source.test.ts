import { describe, expect, it } from 'vitest'
import { BEATS_PER_BAR } from '@/lib/steps'
import { ACCENT_VELOCITY, EVEN_VELOCITY } from './pattern'
import { CLICK_SOURCE } from './source'

describe('the click as a source', () => {
  it('is exact, and says so by carrying no humanize at all', () => {
    expect(CLICK_SOURCE.humanize).toBeNull()
    expect(CLICK_SOURCE.displace).toBeUndefined()
    expect(CLICK_SOURCE.trim).toBeUndefined()
  })

  it('walks the four quarters and accents only the downbeat', () => {
    expect(CLICK_SOURCE.steps).toBe(BEATS_PER_BAR)

    expect(CLICK_SOURCE.hitsAt(0)).toEqual([
      { voice: 'claves', velocity: ACCENT_VELOCITY },
    ])

    for (const step of [1, 2, 3]) {
      expect(CLICK_SOURCE.hitsAt(step)).toEqual([
        { voice: 'claves', velocity: EVEN_VELOCITY },
      ])
    }
  })

  it('wraps on the absolute step, forwards and backwards', () => {
    expect(CLICK_SOURCE.hitsAt(4)).toEqual(CLICK_SOURCE.hitsAt(0))
    expect(CLICK_SOURCE.hitsAt(4001)).toEqual(CLICK_SOURCE.hitsAt(1))
    expect(CLICK_SOURCE.hitsAt(-1)).toEqual(CLICK_SOURCE.hitsAt(3))
  })
})
