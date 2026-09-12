import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Select, type SelectOption } from './Select'

const LABEL = 'Kind'

type Kind = 'one' | 'two'

const OPTIONS: readonly SelectOption<Kind>[] = [
  { value: 'one', label: 'First' },
  { value: 'two', label: 'Second' },
]

const noop = () => {}

describe('the select', () => {
  it('takes its accessible name from the label it is given', () => {
    render(
      <Select label={LABEL} value="one" options={OPTIONS} onChange={noop} />,
    )

    expect(screen.getByRole('combobox', { name: LABEL })).toBeVisible()
  })

  it('offers one option per choice, in the order it was given them', () => {
    render(
      <Select label={LABEL} value="one" options={OPTIONS} onChange={noop} />,
    )

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'First',
      'Second',
    ])
  })

  it('shows the value it was given rather than holding its own', () => {
    render(
      <Select label={LABEL} value="two" options={OPTIONS} onChange={noop} />,
    )

    expect(screen.getByRole('combobox', { name: LABEL })).toHaveValue('two')
  })

  it('reports the value that was chosen', () => {
    const onChange = vi.fn()
    render(
      <Select label={LABEL} value="one" options={OPTIONS} onChange={onChange} />,
    )

    fireEvent.change(screen.getByRole('combobox', { name: LABEL }), {
      target: { value: 'two' },
    })

    expect(onChange).toHaveBeenCalledWith('two')
  })

  it('takes an id, so a label element can point at it', () => {
    render(
      <Select
        id="kind"
        label={LABEL}
        value="one"
        options={OPTIONS}
        onChange={noop}
      />,
    )

    expect(screen.getByRole('combobox', { name: LABEL })).toHaveAttribute('id', 'kind')
  })

  it('reads as something you press', () => {
    render(
      <Select label={LABEL} value="one" options={OPTIONS} onChange={noop} />,
    )

    expect(screen.getByRole('combobox', { name: LABEL })).toHaveClass(
      'cursor-pointer',
      'rounded-card',
    )
  })
})
