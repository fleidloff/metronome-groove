import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Readout } from './Readout'

const UNIT = 'Hz'

describe('the readout', () => {
  it('is an output, which is a status the page can announce', () => {
    render(<Readout value={120} unit={UNIT} />)

    expect(screen.getByRole('status').tagName).toBe('OUTPUT')
  })

  it('reads its value and its unit as one line of text', () => {
    render(<Readout value={120} unit={UNIT} />)

    expect(screen.getByRole('status')).toHaveTextContent('120 Hz')
  })

  it('shows the value alone when there is no unit', () => {
    render(<Readout value={96} />)

    expect(screen.getByRole('status')).toHaveTextContent('96')
    expect(screen.getByRole('status')).not.toHaveTextContent(UNIT)
  })

  it('points at the control it reads, when it is given one', () => {
    render(<Readout htmlFor="speed" value={120} unit={UNIT} />)

    expect(screen.getByRole('status')).toHaveAttribute('for', 'speed')
  })

  it('sets the value on the type scale and the unit below it', () => {
    render(<Readout value={120} unit={UNIT} />)

    const readout = screen.getByRole('status')

    expect(readout).toHaveClass('flex', 'items-baseline', 'gap-3', 'tabular-nums')
    expect(screen.getByText('120')).toHaveClass(
      'text-8xl',
      'font-bold',
      'leading-none',
      'sm:text-9xl',
    )
    expect(screen.getByText(UNIT)).toHaveClass('text-3xl', 'text-muted')
  })
})
