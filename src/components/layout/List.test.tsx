import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Space } from '@/components/tokens'
import { List } from './List'

const LABEL = 'Steps'

/** The scale spelled out against the class each step must render. Tailwind
 *  reads literal strings out of the source, so an interpolated `gap-${gap}`
 *  produces no CSS at all — the rendered class is the thing worth asserting. */
const GAPS: ReadonlyArray<readonly [Space, string]> = [
  [0, 'gap-0'],
  [1, 'gap-1'],
  [2, 'gap-2'],
  [3, 'gap-3'],
  [4, 'gap-4'],
  [6, 'gap-6'],
  [8, 'gap-8'],
  [10, 'gap-10'],
  [12, 'gap-12'],
]

const WIDE: ReadonlyArray<readonly [Space, string]> = GAPS.map(
  ([space, gap]) => [space, `sm:${gap}`] as const,
)

describe('the list', () => {
  it('is an ordered list carrying the name it was given', () => {
    render(
      <List label={LABEL}>
        <li />
      </List>,
    )

    const list = screen.getByRole('list', { name: LABEL })

    expect(list.tagName).toBe('OL')
  })

  it('renders what it is given, in order', () => {
    render(
      <List label={LABEL}>
        <li />
        <li />
        <li />
      </List>,
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('maps every step of the scale to its literal gap class', () => {
    for (const [space, expected] of GAPS) {
      const view = render(
        <List label={LABEL} gap={space}>
          <li />
        </List>,
      )

      expect(screen.getByRole('list', { name: LABEL }), String(space)).toHaveClass(
        expected,
      )
      view.unmount()
    }
  })

  it('maps the wide gap to the same step at the sm breakpoint', () => {
    for (const [space, expected] of WIDE) {
      const view = render(
        <List label={LABEL} gapWide={space}>
          <li />
        </List>,
      )

      expect(screen.getByRole('list', { name: LABEL }), String(space)).toHaveClass(
        expected,
      )
      view.unmount()
    }
  })

  it('holds both gaps at once, the narrow one and the widening', () => {
    render(
      <List label={LABEL} gap={6} gapWide={10}>
        <li />
      </List>,
    )

    expect(screen.getByRole('list', { name: LABEL })).toHaveClass(
      'gap-6',
      'sm:gap-10',
    )
  })

  it('lays its items out in a centred row', () => {
    render(
      <List label={LABEL}>
        <li />
      </List>,
    )

    expect(screen.getByRole('list', { name: LABEL })).toHaveClass(
      'flex',
      'items-center',
      'justify-center',
    )
  })
})
