import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { app, metronome } from '@/lib/snippets'
import { MAX_BPM, MIN_BPM } from '../lib/click/tempo'
import {
  BEATS_OF_SILENCE,
  OPENING_WINDOW_S,
} from '../lib/tap/tapTempo'
import { MIN_BPM as SLOWEST } from '../lib/click/tempo'

/**
 * Past any window an attempt can have. The opening window is a flat 2 s, but a
 * tapped window is two beats of what was tapped — 3 s at the slowest legal
 * tempo — so the widest is not the opening one.
 */
const PAST_ANY_WINDOW =
  Math.max(OPENING_WINDOW_S, BEATS_OF_SILENCE * (60 / SLOWEST)) * 1000 + 1
import { Metronome, type Transport } from './Metronome'

const DEFAULT_BPM = 120

function fakeTransport() {
  const listeners = new Set<(beat: number) => void>()
  const start = vi.fn()
  const stop = vi.fn()
  const setTempo = vi.fn()
  const suspend = vi.fn()
  const resume = vi.fn()
  const unsubscribe = vi.fn()

  const transport: Transport = {
    start,
    stop,
    setTempo,
    suspend,
    resume,
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

  return { transport, start, stop, setTempo, suspend, resume, unsubscribe, beat }
}

/** The test owns the clock: a tap reads the next time in this list, so the
 *  arithmetic never waits and never depends on how fast the suite runs. */
const clockOf = (times: readonly number[]) => {
  let index = 0
  return () => times[Math.min(index++, times.length - 1)]
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

const TEXT_SCALE = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl']

/** Where a control sits on the type scale, so "biggest thing on the page" is
 *  compared rather than believed. */
const textScale = (element: Element) =>
  Math.max(
    -1,
    ...element.className
      .split(/\s+/)
      .map((token) => TEXT_SCALE.indexOf(token.replace(/^text-/, ''))),
  )

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
      const secondary = screen.getByRole('button', { name: metronome.tap })

      expect(screen.getAllByRole('button')).toEqual([control, secondary])
      expect(control).toHaveClass('w-full')
      expect(control.className).toMatch(/\btext-(4|5|6|7|8|9)xl\b/)
      expect(secondary).not.toHaveClass('w-full')
      expect(textScale(control)).toBeGreaterThan(textScale(secondary))
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

  describe('tapping a tempo', () => {
    const TAPS_AT_150 = [10, 10.4, 10.8, 11.2, 11.6, 12]

    /** Taps, then lets the silence commit. */
    const tapThen = (control: HTMLElement, count: number) => {
      for (let tap = 0; tap < count; tap += 1) fireEvent.click(control)
      act(() => {
        vi.advanceTimersByTime(PAST_ANY_WINDOW)
      })
    }

    it('sets the tempo when the tapping stops, not at any tap count', () => {
      vi.useFakeTimers()
      try {
        const { transport } = fakeTransport()
        render(<Metronome transport={transport} now={clockOf(TAPS_AT_150)} />)
        const control = screen.getByRole('button', { name: metronome.tap })

        for (let tap = 0; tap < 4; tap += 1) fireEvent.click(control)
        // Four taps in, and nothing has been decided — the silence decides.
        expect(screen.getByRole('status')).toHaveTextContent(
          `${DEFAULT_BPM} ${metronome.tempoUnit}`,
        )

        act(() => {
          vi.advanceTimersByTime(PAST_ANY_WINDOW)
        })
        expect(screen.getByRole('status')).toHaveTextContent(
          `150 ${metronome.tempoUnit}`,
        )
      } finally {
        vi.useRealTimers()
      }
    })

    it('takes a tempo from two taps, and from six', () => {
      for (const count of [2, 6]) {
        vi.useFakeTimers()
        try {
          const { transport } = fakeTransport()
          const view = render(
            <Metronome transport={transport} now={clockOf(TAPS_AT_150)} />,
          )
          const control = screen.getByRole('button', { name: metronome.tap })

          tapThen(control, count)
          expect(screen.getByRole('status'), `${count} taps`).toHaveTextContent(
            `150 ${metronome.tempoUnit}`,
          )
          view.unmount()
        } finally {
          vi.useRealTimers()
        }
      }
    })

    it('moves the slider too — the tapped tempo and the slider are one value', () => {
      vi.useFakeTimers()
      try {
        const { transport } = fakeTransport()
        render(<Metronome transport={transport} now={clockOf(TAPS_AT_150)} />)

        const slider = screen.getByRole('slider', { name: metronome.tempo })
        expect(slider).toHaveValue(String(DEFAULT_BPM))

        tapThen(screen.getByRole('button', { name: metronome.tap }), 4)

        expect(slider).toHaveValue('150')
      } finally {
        vi.useRealTimers()
      }
    })

    it('restarts its window on every tap, so a slow tapper is never cut off', () => {
      vi.useFakeTimers()
      try {
        const { transport, resume } = fakeTransport()
        // A slow tune: 1.4 s apart, just inside 40 bpm. Each tap is inside its
        // own window, but the attempt spans far more than one window in total.
        const slow = [10, 11.4, 12.8, 14.2]
        render(<Metronome transport={transport} now={clockOf(slow)} />)
        const control = screen.getByRole('button', { name: metronome.tap })

        fireEvent.click(control)
        for (let tap = 1; tap < slow.length; tap += 1) {
          act(() => {
            // Just short of this attempt's window — 2 s while there is one tap,
            // then two beats of ~1.4 s once the tapping says what it is.
            vi.advanceTimersByTime(1300)
          })
          expect(resume, `before tap ${tap + 1}`).not.toHaveBeenCalled()
          fireEvent.click(control)
        }

        act(() => {
          vi.advanceTimersByTime(PAST_ANY_WINDOW)
        })
        expect(resume).toHaveBeenCalledTimes(1)
      } finally {
        vi.useRealTimers()
      }
    })

    it('waits two beats of what was tapped, not a flat two seconds', () => {
      vi.useFakeTimers()
      try {
        const { transport, resume } = fakeTransport()
        // 120 bpm: a half-second beat, so the window is 1.0 s — not 2.
        render(<Metronome transport={transport} now={clockOf([10, 10.5, 11])} />)
        const control = screen.getByRole('button', { name: metronome.tap })

        fireEvent.click(screen.getByRole('button', { name: metronome.start }))
        fireEvent.click(control)
        fireEvent.click(control)

        act(() => {
          vi.advanceTimersByTime(900)
        })
        expect(resume, 'before the two beats are up').not.toHaveBeenCalled()

        act(() => {
          vi.advanceTimersByTime(200)
        })
        expect(resume, 'after 1.1 s, which a flat 2 s would not have reached')
          .toHaveBeenCalledWith(120)
      } finally {
        vi.useRealTimers()
      }
    })

    it('waits longer for a slow tempo than a fast one', () => {
      const windowAfter = (times: readonly number[]) => {
        vi.useFakeTimers()
        try {
          const { transport, resume } = fakeTransport()
          const view = render(
            <Metronome transport={transport} now={clockOf(times)} />,
          )
          const control = screen.getByRole('button', { name: metronome.tap })
          fireEvent.click(screen.getByRole('button', { name: metronome.start }))
          for (let tap = 0; tap < times.length; tap += 1) fireEvent.click(control)

          let waited = 0
          while (resume.mock.calls.length === 0 && waited < 6000) {
            act(() => {
              vi.advanceTimersByTime(50)
            })
            waited += 50
          }
          view.unmount()
          return waited
        } finally {
          vi.useRealTimers()
        }
      }

      // 150 bpm against 60 bpm: the slower tapping must buy a longer window.
      const fast = windowAfter([10, 10.4, 10.8])
      const slow = windowAfter([10, 11, 12])

      expect(slow).toBeGreaterThan(fast)
    })

    it('silences a running click on the first tap and brings it back when tapping stops', () => {
      vi.useFakeTimers()
      try {
        const { transport, suspend, resume } = fakeTransport()
        render(<Metronome transport={transport} now={clockOf(TAPS_AT_150)} />)

        fireEvent.click(screen.getByRole('button', { name: metronome.start }))
        const control = screen.getByRole('button', { name: metronome.tap })

        fireEvent.click(control)
        expect(suspend).toHaveBeenCalledTimes(1)
        expect(resume).not.toHaveBeenCalled()

        tapThen(control, 3)
        expect(resume).toHaveBeenCalledWith(150)
      } finally {
        vi.useRealTimers()
      }
    })

    it('keeps one accessible name throughout, so it stays findable without looking', () => {
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} now={clockOf(TAPS_AT_150)} />)
      const control = screen.getByRole('button', { name: metronome.tap })

      fireEvent.click(control)
      fireEvent.click(control)

      expect(control).toHaveAccessibleName(metronome.tap)
      expect(control).toHaveTextContent(metronome.tap)
    })

    it('refuses a tempo outside the range, leaving the displayed one untouched', () => {
      vi.useFakeTimers()
      try {
        const { transport, resume } = fakeTransport()
        // 200 bpm: 0.3 s apart.
        render(
          <Metronome transport={transport} now={clockOf([10, 10.3, 10.6, 10.9])} />,
        )

        fireEvent.click(screen.getByRole('button', { name: metronome.start }))
        tapThen(screen.getByRole('button', { name: metronome.tap }), 4)

        expect(screen.getByRole('status')).toHaveTextContent(
          `${DEFAULT_BPM} ${metronome.tempoUnit}`,
        )
        // Refused, but never stranded silent.
        expect(resume).toHaveBeenCalledWith(DEFAULT_BPM)
      } finally {
        vi.useRealTimers()
      }
    })

    it('commits nothing from a single tap, and still brings the click back', () => {
      vi.useFakeTimers()
      try {
        const { transport, resume } = fakeTransport()
        render(<Metronome transport={transport} now={clockOf(TAPS_AT_150)} />)

        fireEvent.click(screen.getByRole('button', { name: metronome.start }))
        tapThen(screen.getByRole('button', { name: metronome.tap }), 1)

        expect(screen.getByRole('status')).toHaveTextContent(
          `${DEFAULT_BPM} ${metronome.tempoUnit}`,
        )
        expect(resume).toHaveBeenCalledWith(DEFAULT_BPM)
      } finally {
        vi.useRealTimers()
      }
    })

    it('sets the tempo but leaves the click stopped when it was never running', () => {
      vi.useFakeTimers()
      try {
        const { transport, start } = fakeTransport()
        render(<Metronome transport={transport} now={clockOf(TAPS_AT_150)} />)

        tapThen(screen.getByRole('button', { name: metronome.tap }), 4)

        expect(screen.getByRole('status')).toHaveTextContent(
          `150 ${metronome.tempoUnit}`,
        )
        expect(start).not.toHaveBeenCalled()
      } finally {
        vi.useRealTimers()
      }
    })

    it('never strands the click silent, even on taps that describe no tempo', () => {
      vi.useFakeTimers()
      try {
        const { transport, resume } = fakeTransport()
        // Two taps in one coarsened clock tick — a double-fired event, or a
        // held key on the focused button. This used to discard the attempt
        // and leave nothing to bring the click back.
        render(
          <Metronome transport={transport} now={clockOf([10, 10.5, 10.5, 11])} />,
        )

        fireEvent.click(screen.getByRole('button', { name: metronome.start }))
        tapThen(screen.getByRole('button', { name: metronome.tap }), 4)

        expect(resume).toHaveBeenCalledWith(DEFAULT_BPM)
      } finally {
        vi.useRealTimers()
      }
    })

    it('clears the pending commit when it unmounts mid-attempt', () => {
      vi.useFakeTimers()
      try {
        const { transport } = fakeTransport()
        const view = render(
          <Metronome transport={transport} now={clockOf(TAPS_AT_150)} />,
        )

        fireEvent.click(screen.getByRole('button', { name: metronome.tap }))
        expect(vi.getTimerCount()).toBe(1)

        view.unmount()
        expect(vi.getTimerCount()).toBe(0)
      } finally {
        vi.useRealTimers()
      }
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
