import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Eyebrow } from './Eyebrow'

const TEXT = 'Overline'

describe('the eyebrow', () => {
  it('is a level one heading when no level is asked for', () => {
    render(<Eyebrow>{TEXT}</Eyebrow>)

    const heading = screen.getByRole('heading', { name: TEXT })

    expect(heading.tagName).toBe('H1')
  })

  it('picks the heading element from the level it is given', () => {
    for (const [level, tag] of [
      [1, 'H1'],
      [2, 'H2'],
      [3, 'H3'],
    ] as const) {
      const view = render(<Eyebrow level={level}>{TEXT}</Eyebrow>)

      expect(
        screen.getByRole('heading', { name: TEXT, level }).tagName,
        String(level),
      ).toBe(tag)
      view.unmount()
    }
  })

  it('is small, spaced-out upper case', () => {
    render(<Eyebrow>{TEXT}</Eyebrow>)

    expect(screen.getByRole('heading', { name: TEXT })).toHaveClass(
      'text-sm',
      'font-medium',
      'uppercase',
      'tracking-[0.3em]',
      'text-muted',
    )
  })
})
