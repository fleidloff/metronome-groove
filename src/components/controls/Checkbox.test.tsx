import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'

const LABEL = 'Extras'

const noop = () => {}

describe('the checkbox', () => {
  it('takes its accessible name from the label it is given', () => {
    render(<Checkbox label={LABEL} checked={false} onChange={noop} />)

    expect(screen.getByRole('checkbox', { name: LABEL })).toBeVisible()
  })

  it('shows the label, so the word is on the page and not only in the tree', () => {
    render(<Checkbox label={LABEL} checked={false} onChange={noop} />)

    expect(screen.getByText(LABEL)).toBeVisible()
  })

  it('shows the state it was given rather than holding its own', () => {
    const view = render(<Checkbox label={LABEL} checked onChange={noop} />)
    expect(screen.getByRole('checkbox', { name: LABEL })).toBeChecked()

    view.rerender(<Checkbox label={LABEL} checked={false} onChange={noop} />)
    expect(screen.getByRole('checkbox', { name: LABEL })).not.toBeChecked()
  })

  it('reports the state it is being asked to move to', () => {
    const onChange = vi.fn()
    render(<Checkbox label={LABEL} checked={false} onChange={onChange} />)

    fireEvent.click(screen.getByRole('checkbox', { name: LABEL }))

    expect(onChange).toHaveBeenCalledWith(true)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('reports the other way round when it is already ticked', () => {
    const onChange = vi.fn()
    render(<Checkbox label={LABEL} checked onChange={onChange} />)

    fireEvent.click(screen.getByRole('checkbox', { name: LABEL }))

    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('stays where the prop put it when a click does not change the prop', () => {
    render(<Checkbox label={LABEL} checked={false} onChange={noop} />)

    const control = screen.getByRole('checkbox', { name: LABEL })
    fireEvent.click(control)

    expect(control).not.toBeChecked()
  })

  it('takes an id, so a caption can point at it', () => {
    render(<Checkbox id="extras" label={LABEL} checked={false} onChange={noop} />)

    expect(screen.getByRole('checkbox', { name: LABEL })).toHaveAttribute(
      'id',
      'extras',
    )
  })

  it('reads as something you press, and sits at the weight of a select', () => {
    render(<Checkbox label={LABEL} checked={false} onChange={noop} />)

    const control = screen.getByRole('checkbox', { name: LABEL })

    expect(control).toHaveClass('cursor-pointer', 'accent-accent')
    expect(control.closest('label')).toHaveClass(
      'cursor-pointer',
      'rounded-card',
      'text-xl',
    )
  })
})
