import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Space } from './tokens'

describe('the spacing scale', () => {
  it('is closed — a caller cannot smuggle in an arbitrary length', () => {
    expectTypeOf<Space>().toEqualTypeOf<0 | 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12>()

    // @ts-expect-error 5 is not on the scale, and that is the whole point.
    const off: Space = 5
    expect(off).toBe(5)
  })

  it('admits the steps it declares', () => {
    const steps: Space[] = [0, 1, 2, 3, 4, 6, 8, 10, 12]

    expect(steps).toHaveLength(9)
  })
})
