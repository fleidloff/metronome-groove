import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Slider } from './Slider'

const LABEL = 'Speed'

const noop = () => {}

describe('the slider', () => {
  it('takes its accessible name from the label it is given', () => {
    render(
      <Slider label={LABEL} min={40} max={180} value={120} onChange={noop} />,
    )

    expect(screen.getByRole('slider', { name: LABEL })).toBeVisible()
  })

  it('carries the range and the step it was given', () => {
    render(
      <Slider
        label={LABEL}
        min={40}
        max={180}
        step={5}
        value={120}
        onChange={noop}
      />,
    )

    const slider = screen.getByRole('slider', { name: LABEL })

    expect(slider).toHaveAttribute('min', '40')
    expect(slider).toHaveAttribute('max', '180')
    expect(slider).toHaveAttribute('step', '5')
    expect(slider).toHaveValue('120')
  })

  it('steps by one unless told otherwise', () => {
    render(
      <Slider label={LABEL} min={40} max={180} value={120} onChange={noop} />,
    )

    expect(screen.getByRole('slider', { name: LABEL })).toHaveAttribute('step', '1')
  })

  it('reports a number, not the string the input holds', () => {
    const onChange = vi.fn()
    render(
      <Slider label={LABEL} min={40} max={180} value={120} onChange={onChange} />,
    )

    fireEvent.change(screen.getByRole('slider', { name: LABEL }), {
      target: { value: '96' },
    })

    expect(onChange).toHaveBeenCalledWith(96)
    expect(typeof onChange.mock.calls[0][0]).toBe('number')
  })

  it('takes an id, so a readout can point at it', () => {
    render(
      <Slider
        id="speed"
        label={LABEL}
        min={40}
        max={180}
        value={120}
        onChange={noop}
      />,
    )

    expect(screen.getByRole('slider', { name: LABEL })).toHaveAttribute('id', 'speed')
  })

  it('spans its column and reads as draggable', () => {
    render(
      <Slider label={LABEL} min={40} max={180} value={120} onChange={noop} />,
    )

    expect(screen.getByRole('slider', { name: LABEL })).toHaveClass(
      'w-full',
      'cursor-pointer',
    )
  })
})
