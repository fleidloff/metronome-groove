import { render } from '@testing-library/react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { BandedDiscGlyph } from './BandedDiscGlyph'

const svgOf = (container: HTMLElement) => container.querySelector('svg')

describe('the banded disc glyph', () => {
  it('draws itself inline, so it takes the colour and size around it', () => {
    const { container } = render(<BandedDiscGlyph />)

    const svg = svgOf(container)

    expect(svg).not.toBeNull()
    expect(svg?.tagName.toLowerCase()).toBe('svg')
  })

  it('is aria-hidden, so it never reaches the accessibility tree', () => {
    const { container } = render(<BandedDiscGlyph />)

    expect(svgOf(container)).toHaveAttribute('aria-hidden', 'true')
  })

  it('claims no role and no name of its own — the checkbox beside it is named', () => {
    const { container } = render(<BandedDiscGlyph />)

    const svg = svgOf(container)

    expect(svg).not.toHaveAttribute('role')
    expect(svg).not.toHaveAttribute('aria-label')
    expect(svg).not.toHaveAttribute('aria-labelledby')
  })

  it('takes no props', () => {
    expectTypeOf<Parameters<typeof BandedDiscGlyph>>().toEqualTypeOf<[]>()

    expect(BandedDiscGlyph).toHaveLength(0)
  })
})
