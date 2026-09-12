import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageFrame } from './PageFrame'

describe('the page frame', () => {
  it('is the page main region, and renders what it is given', () => {
    render(
      <PageFrame>
        <button type="button">Inner</button>
      </PageFrame>,
    )

    const frame = screen.getByRole('main')

    expect(frame.tagName).toBe('MAIN')
    expect(screen.getByRole('button', { name: 'Inner' })).toBeVisible()
  })

  it('is a centred column the height of the screen', () => {
    render(
      <PageFrame>
        <span />
      </PageFrame>,
    )

    expect(screen.getByRole('main')).toHaveClass(
      'mx-auto',
      'flex',
      'min-h-screen',
      'w-full',
      'max-w-2xl',
      'flex-col',
      'items-center',
      'justify-between',
    )
  })

  it('spaces the page out at the one gap it has, and pads its edges', () => {
    render(
      <PageFrame>
        <span />
      </PageFrame>,
    )

    expect(screen.getByRole('main')).toHaveClass('gap-12', 'px-6', 'py-12')
  })
})
