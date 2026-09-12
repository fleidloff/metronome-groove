import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Space } from '@/components/tokens'
import { Stack } from './Stack'

/** The scale spelled out against the class each step must render — an
 *  interpolated `gap-${gap}` is a class Tailwind never sees. */
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

const stackOf = (element: HTMLElement) => element.firstElementChild as HTMLElement

describe('the stack', () => {
  it('renders what it is given', () => {
    render(
      <Stack>
        <button type="button">Inner</button>
      </Stack>,
    )

    expect(screen.getByRole('button', { name: 'Inner' })).toBeVisible()
  })

  it('maps every step of the scale to its literal gap class', () => {
    for (const [space, expected] of GAPS) {
      const view = render(
        <Stack gap={space}>
          <span />
        </Stack>,
      )

      expect(stackOf(view.container), String(space)).toHaveClass(expected)
      view.unmount()
    }
  })

  it('stacks its children in a centred column', () => {
    const view = render(
      <Stack gap={6}>
        <span />
      </Stack>,
    )

    expect(stackOf(view.container)).toHaveClass(
      'flex',
      'w-full',
      'max-w-md',
      'flex-col',
      'items-center',
    )
  })
})
