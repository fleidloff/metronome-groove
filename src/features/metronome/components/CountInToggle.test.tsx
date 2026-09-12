import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { metronome } from '@/lib/snippets'
import { CountInToggle } from './CountInToggle'

const noop = () => {}

describe('the count-in toggle', () => {
  it('is reachable by the word the app uses for it', () => {
    render(<CountInToggle checked={false} onChange={noop} />)

    expect(
      screen.getByRole('checkbox', { name: metronome.countIn }),
    ).toBeVisible()
  })

  it('shows the state it was given rather than holding its own', () => {
    const view = render(<CountInToggle checked onChange={noop} />)
    expect(
      screen.getByRole('checkbox', { name: metronome.countIn }),
    ).toBeChecked()

    view.rerender(<CountInToggle checked={false} onChange={noop} />)
    expect(
      screen.getByRole('checkbox', { name: metronome.countIn }),
    ).not.toBeChecked()
  })

  it('reports the state it is being asked to move to', () => {
    const onChange = vi.fn()
    render(<CountInToggle checked={false} onChange={onChange} />)

    fireEvent.click(screen.getByRole('checkbox', { name: metronome.countIn }))

    expect(onChange).toHaveBeenCalledWith(true)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('reports the other way round when it is already ticked', () => {
    const onChange = vi.fn()
    render(<CountInToggle checked onChange={onChange} />)

    fireEvent.click(screen.getByRole('checkbox', { name: metronome.countIn }))

    expect(onChange).toHaveBeenCalledWith(false)
  })
})
