import { render } from '@testing-library/react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { DiscGlyph } from './DiscGlyph'

const svgOf = (container: HTMLElement) => container.querySelector('svg')

describe('the disc glyph', () => {
  it('draws itself inline, so it takes the colour and size around it', () => {
    const { container } = render(<DiscGlyph />)

    const svg = svgOf(container)

    expect(svg).not.toBeNull()
    expect(svg?.tagName.toLowerCase()).toBe('svg')
  })

  it('is aria-hidden, so it never reaches the accessibility tree', () => {
    const { container } = render(<DiscGlyph />)

    expect(svgOf(container)).toHaveAttribute('aria-hidden', 'true')
  })

  it('claims no role and no name of its own — the checkbox beside it is named', () => {
    const { container } = render(<DiscGlyph />)

    const svg = svgOf(container)

    expect(svg).not.toHaveAttribute('role')
    expect(svg).not.toHaveAttribute('aria-label')
    expect(svg).not.toHaveAttribute('aria-labelledby')
  })

  it('takes no props', () => {
    expectTypeOf<Parameters<typeof DiscGlyph>>().toEqualTypeOf<[]>()

    expect(DiscGlyph).toHaveLength(0)
  })
})
