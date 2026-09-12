import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
      expect(control).toHaveAttribute('data-emphasis', 'hero')
      expect(secondary).not.toHaveAttribute('data-emphasis', 'hero')
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
      expect(downbeat).toHaveAttribute('data-emphasised', 'true')
      expect(even).not.toHaveAttribute('data-emphasised', 'true')
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

  describe('the speaker as a remote', () => {
    /** Stands in for navigator.mediaSession, which jsdom does not have. */
    const stubSession = () => {
      const handlers = new Map<string, () => void>()
      const session = {
        setActionHandler: (action: string, handler: (() => void) | null) => {
          if (handler === null) handlers.delete(action)
          else handlers.set(action, handler)
        },
        metadata: null,
        playbackState: 'none',
      }

      vi.stubGlobal('navigator', { ...globalThis.navigator, mediaSession: session })
      return {
        // Wrapped in act: the press sets state, and without flushing it the
        // next press would read a stale `running` and start twice.
        press: () => act(() => handlers.get('pause')?.()),
        bound: () => handlers.size,
      }
    }

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    /** The gesture that lets the page claim a media session at all. */
    const touchThePage = () =>
      fireEvent.click(screen.getByRole('button', { name: metronome.start }))

    it('does nothing until the page has been touched', () => {
      // A browser refuses to let an untouched page play, so the session is
      // never claimed and the button is not ours. Binding on mount produced a
      // NotAllowedError in Chrome and a feature that silently did not work.
      const device = stubSession()
      const { transport, start } = fakeTransport()
      render(<Metronome transport={transport} />)

      expect(device.bound()).toBe(0)
      device.press()

      expect(start).not.toHaveBeenCalled()
    })

    it('is armed by tapping a tempo, not only by Start', () => {
      const device = stubSession()
      const { transport, start } = fakeTransport()
      render(<Metronome transport={transport} now={clockOf([10, 10.4])} />)

      fireEvent.click(screen.getByRole('button', { name: metronome.tap }))
      expect(device.bound()).toBe(1)

      device.press()
      expect(start).toHaveBeenCalled()
    })

    it('is armed by the slider, which is a gesture like any other', () => {
      const device = stubSession()
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.change(screen.getByRole('slider', { name: metronome.tempo }), {
        target: { value: '140' },
      })

      expect(device.bound()).toBe(1)
    })

    it('starts and stops the click from the speaker button, once armed', () => {
      const device = stubSession()
      const { transport, start, stop } = fakeTransport()
      render(<Metronome transport={transport} />)

      touchThePage()
      expect(start).toHaveBeenCalledTimes(1)

      device.press()
      expect(stop).toHaveBeenCalledTimes(1)

      device.press()
      expect(start).toHaveBeenCalledTimes(2)
    })

    it('shows the button press as the same state the on-screen control shows', () => {
      const device = stubSession()
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      touchThePage()
      device.press()
      device.press()

      // Pressing the speaker must leave the page agreeing with itself, or the
      // control says Start while the click is running.
      expect(
        screen.getByRole('button', { name: metronome.stop }),
      ).toBeInTheDocument()
    })

    it('releases the button when the page goes away', () => {
      const device = stubSession()
      const { transport } = fakeTransport()
      const view = render(<Metronome transport={transport} />)

      touchThePage()
      expect(device.bound()).toBe(1)
      view.unmount()

      expect(device.bound()).toBe(0)
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
