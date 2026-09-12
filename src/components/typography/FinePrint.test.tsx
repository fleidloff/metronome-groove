import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FinePrint } from './FinePrint'

const TEXT = 'Small words'

describe('the fine print', () => {
  it('shows what it is given', () => {
    render(<FinePrint>{TEXT}</FinePrint>)

    expect(screen.getByText(TEXT)).toBeVisible()
  })

  it('is the smallest and quietest text there is', () => {
    render(<FinePrint>{TEXT}</FinePrint>)

    expect(screen.getByText(TEXT)).toHaveClass('text-xs', 'text-muted')
  })
})
