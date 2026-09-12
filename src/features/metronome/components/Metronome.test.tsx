import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { app, metronome } from '@/lib/snippets'
import { MAX_BPM, MIN_BPM } from '../lib/click/tempo'
import { Metronome, type Transport } from './Metronome'

const DEFAULT_BPM = 120

function fakeTransport() {
  const listeners = new Set<(beat: number) => void>()
  const start = vi.fn()
  const stop = vi.fn()
  const setTempo = vi.fn()
  const unsubscribe = vi.fn()

  const transport: Transport = {
    start,
    stop,
    setTempo,
    onBeat(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        unsubscribe()
      }
    },
  }

  const beat = (index: number) =>
    act(() => {
      listeners.forEach((listener) => listener(index))
    })

  return { transport, start, stop, setTempo, unsubscribe, beat }
}

const COLOUR = /^(bg|text|ring|border|outline|shadow|opacity|fill|stroke|from|via|to|accent|decoration|divide|caret)-/

/** Sam's condition is that the downbeat is not distinct by colour alone, so
 *  strip every colour utility and require the remainder to still differ. */
const shapeOf = (element: Element) =>
  element.className
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !COLOUR.test(token.replace(/^[\w-]+:/, '')))

const sizeOf = (element: Element) =>
  shapeOf(element).find((token) => /^size-/.test(token))

describe(app.name, () => {
  it('names itself to the player', () => {
    render(<Metronome />)

    expect(screen.getByRole('heading', { name: app.name })).toBeVisible()
  })

  describe('start and stop', () => {
    it('toggles from one control and reports its state accessibly', () => {
      const { transport, start, stop } = fakeTransport()
      render(<Metronome transport={transport} />)

      const idle = screen.getByRole('button', { name: metronome.start })
      expect(idle).toHaveAttribute('aria-pressed', 'false')

      fireEvent.click(idle)
      expect(start).toHaveBeenCalledWith(DEFAULT_BPM)

      const running = screen.getByRole('button', { name: metronome.stop })
      expect(running).toHaveAttribute('aria-pressed', 'true')

      fireEvent.click(running)
      expect(stop).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: metronome.start })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

    it('is the dominant control on the page', () => {
      render(<Metronome />)

      const control = screen.getByRole('button', { name: metronome.start })

      expect(screen.getAllByRole('button')).toEqual([control])
      expect(control).toHaveClass('w-full')
      expect(control.className).toMatch(/\btext-(4|5|6|7|8|9)xl\b/)
    })
  })

  describe('the tempo slider', () => {
    it('is labelled and spans 40 to 180 bpm inclusive', () => {
      render(<Metronome />)

      const slider = screen.getByRole('slider', { name: metronome.tempo })

      expect(slider).toHaveAttribute('min', String(MIN_BPM))
      expect(slider).toHaveAttribute('max', String(MAX_BPM))

      fireEvent.change(slider, { target: { value: String(MIN_BPM) } })
      expect(screen.getByRole('status')).toHaveTextContent(`${MIN_BPM} ${metronome.tempoUnit}`)

      fireEvent.change(slider, { target: { value: String(MAX_BPM) } })
      expect(screen.getByRole('status')).toHaveTextContent(`${MAX_BPM} ${metronome.tempoUnit}`)
    })

    it('reads its value as text, not only as a slider position', () => {
      render(<Metronome />)

      expect(screen.getByRole('status')).toHaveTextContent(
        `${DEFAULT_BPM} ${metronome.tempoUnit}`,
      )
    })

    it('never reports a tempo outside the range', () => {
      const { transport, setTempo } = fakeTransport()
      render(<Metronome transport={transport} />)

      const slider = screen.getByRole('slider', { name: metronome.tempo })

      fireEvent.change(slider, { target: { value: '500' } })
      expect(setTempo).toHaveBeenLastCalledWith(MAX_BPM)

      fireEvent.change(slider, { target: { value: '1' } })
      expect(setTempo).toHaveBeenLastCalledWith(MIN_BPM)
    })
  })

  describe('the four dots', () => {
    it('lights the beat the transport reports and clears on stop', () => {
      const { transport, beat } = fakeTransport()
      render(<Metronome transport={transport} />)

      const dots = screen.getAllByRole('listitem')
      expect(dots).toHaveLength(4)
      expect(dots.filter((dot) => dot.hasAttribute('aria-current'))).toEqual([])

      fireEvent.click(screen.getByRole('button', { name: metronome.start }))

      beat(0)
      expect(dots[0]).toHaveAttribute('aria-current', 'step')

      beat(2)
      expect(dots[0]).not.toHaveAttribute('aria-current')
      expect(dots[2]).toHaveAttribute('aria-current', 'step')

      fireEvent.click(screen.getByRole('button', { name: metronome.stop }))
      expect(dots.filter((dot) => dot.hasAttribute('aria-current'))).toEqual([])
    })

    it('distinguishes the downbeat by more than colour', () => {
      render(<Metronome />)

      const [downbeat, even] = screen.getAllByRole('listitem')

      expect(downbeat).toHaveAccessibleName(metronome.downbeatName({ beat: 1 }))
      expect(even).toHaveAccessibleName(metronome.beatName({ beat: 2 }))
      expect(shapeOf(downbeat)).not.toEqual(shapeOf(even))
      expect(sizeOf(downbeat)).toBeDefined()
      expect(sizeOf(downbeat)).not.toBe(sizeOf(even))
    })
  })

  describe('teardown', () => {
    it('unsubscribes and stops when it unmounts while running', () => {
      const { transport, stop, unsubscribe } = fakeTransport()
      const { unmount } = render(<Metronome transport={transport} />)

      fireEvent.click(screen.getByRole('button', { name: metronome.start }))
      expect(unsubscribe).not.toHaveBeenCalled()

      unmount()

      expect(unsubscribe).toHaveBeenCalledTimes(1)
      expect(stop).toHaveBeenCalledTimes(1)
    })
  })
})
