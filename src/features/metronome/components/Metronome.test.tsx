import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app, metronome } from '@/lib/snippets'
import {
  DEFAULT_BPM as SETUP_DEFAULT_BPM,
  SETUP_KEY,
} from '../lib/setup/storedSetup'
import { MAX_BPM, MIN_BPM } from '../lib/transport/tempo'
import {
  BEATS_OF_SILENCE,
  OPENING_WINDOW_S,
} from '../lib/tap/tapTempo'
import { MIN_BPM as SLOWEST } from '../lib/transport/tempo'

/**
 * Past any window an attempt can have. The opening window is a flat 2 s, but a
 * tapped window is two beats of what was tapped — 3 s at the slowest legal
 * tempo — so the widest is not the opening one.
 */
const PAST_ANY_WINDOW =
  Math.max(OPENING_WINDOW_S, BEATS_OF_SILENCE * (60 / SLOWEST)) * 1000 + 1
import { Metronome, type Transport } from './Metronome'

/** Imported rather than restated — a second copy is how 120 survived here
 *  after the app moved to 100. */
const DEFAULT_BPM = SETUP_DEFAULT_BPM

function fakeTransport() {
  const listeners = new Set<(beat: number) => void>()
  const start = vi.fn()
  const stop = vi.fn()
  const setTempo = vi.fn()
  const suspend = vi.fn()
  const resume = vi.fn()
  const select = vi.fn()
  const setFills = vi.fn()
  const setCountIn = vi.fn()
  const unsubscribe = vi.fn()
  const loadingListeners = new Set<(loading: boolean) => void>()

  const transport: Transport = {
    start,
    stop,
    setTempo,
    suspend,
    resume,
    select,
    setFills,
    setCountIn,
    onBeat(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        unsubscribe()
      }
    },
    onLoadingChange(listener) {
      loadingListeners.add(listener)
      listener(false)
      return () => {
        loadingListeners.delete(listener)
      }
    },
  }

  const beat = (index: number) =>
    act(() => {
      listeners.forEach((listener) => listener(index))
    })

  const loading = (value: boolean) =>
    act(() => {
      loadingListeners.forEach((listener) => listener(value))
    })

  return {
    transport,
    start,
    stop,
    setTempo,
    suspend,
    resume,
    select,
    setFills,
    setCountIn,
    unsubscribe,
    beat,
    loading,
  }
}

/** The test owns the clock: a tap reads the next time in this list, so the
 *  arithmetic never waits and never depends on how fast the suite runs. */
const clockOf = (times: readonly number[]) => {
  let index = 0
  return () => times[Math.min(index++, times.length - 1)]
}

describe(app.name, () => {
  // The app persists its setup, so one test's tempo would otherwise open the
  // next one.
  beforeEach(() => {
    window.localStorage.clear()
  })

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
        // Every tap on the same instant, so there is genuinely no interval to
        // read. The old fixture was [10, 10.5, 10.5, 11], which stopped
        // describing "no tempo" once a zero interval became a dropped outlier
        // rather than a discarded attempt — it commits 120, and only matched
        // because the default happened to be 120 too.
        render(
          <Metronome transport={transport} now={clockOf([10, 10, 10, 10])} />,
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

        // Relative, because React's own scheduler holds timers under fake
        // timers too — an absolute count was asserting against its internals.
        const before = vi.getTimerCount()
        fireEvent.click(screen.getByRole('button', { name: metronome.tap }))
        expect(vi.getTimerCount()).toBe(before + 1)

        view.unmount()
        // Our commit timer is gone. Not zero: React keeps its own, and
        // unmounting the component is not its business.
        expect(vi.getTimerCount()).toBeLessThan(before + 1)
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

  describe('what it plays', () => {
    const GROOVE = 'straight-funk'
    const ROCK = 'rock'

    const picker = () => screen.getByRole('combobox', { name: metronome.sound })

    it('offers the click and both grooves, with the click already chosen', () => {
      render(<Metronome />)

      // The order is read top-down by someone choosing: the click because it
      // is the default, then rock because docs/music.md calls it the baseline.
      expect(
        screen.getAllByRole('option').map((option) => option.textContent),
      ).toEqual([metronome.click, metronome.rock, metronome.straightFunk])
      expect(picker()).toHaveValue('click')
    })

    it('asks for rock the moment it is chosen, like any other groove', () => {
      const { transport, select } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.change(picker(), { target: { value: ROCK } })

      expect(select).toHaveBeenCalledWith(ROCK)
      expect(picker()).toHaveValue(ROCK)
    })

    it('asks for nothing but the click until someone picks something else', () => {
      const { transport, select } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.click(screen.getByRole('button', { name: metronome.start }))

      // Choosing is what buys the download, so a player who only ever presses
      // Start never fetches a kit they did not ask for.
      expect(select).not.toHaveBeenCalled()
    })

    it('asks for the groove the moment it is chosen, which is what starts its fetch', () => {
      const { transport, select } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.change(picker(), { target: { value: GROOVE } })

      expect(select).toHaveBeenCalledWith(GROOVE)
      expect(picker()).toHaveValue(GROOVE)
    })

    it('is a gesture like any other, so it arms the speaker button', () => {
      const { transport } = fakeTransport()
      const handlers = new Map<string, () => void>()
      vi.stubGlobal('navigator', {
        ...globalThis.navigator,
        mediaSession: {
          setActionHandler: (action: string, handler: (() => void) | null) => {
            if (handler === null) handlers.delete(action)
            else handlers.set(action, handler)
          },
          metadata: null,
          playbackState: 'none',
        },
      })
      render(<Metronome transport={transport} />)

      fireEvent.change(picker(), { target: { value: GROOVE } })

      expect(handlers.size).toBe(1)
      vi.unstubAllGlobals()
    })

    it('keeps the four dots and the tempo control whatever is chosen', () => {
      const { transport, setTempo } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.change(picker(), { target: { value: GROOVE } })

      expect(screen.getAllByRole('listitem')).toHaveLength(4)

      fireEvent.change(screen.getByRole('slider', { name: metronome.tempo }), {
        target: { value: '96' },
      })
      expect(setTempo).toHaveBeenLastCalledWith(96)
      expect(screen.getByRole('status')).toHaveTextContent(
        `96 ${metronome.tempoUnit}`,
      )
    })

    it('still lights the dots the transport reports once the groove is chosen', () => {
      const { transport, beat } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.change(picker(), { target: { value: GROOVE } })
      fireEvent.click(screen.getByRole('button', { name: metronome.start }))

      beat(3)
      expect(screen.getAllByRole('listitem')[3]).toHaveAttribute(
        'aria-current',
        'step',
      )
    })
  })

  describe('pressing start while the samples are still arriving', () => {
    it('says it is waiting rather than claiming to be running', () => {
      const { transport, loading } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.change(screen.getByRole('combobox', { name: metronome.sound }), {
        target: { value: 'straight-funk' },
      })
      fireEvent.click(screen.getByRole('button', { name: metronome.start }))
      loading(true)

      const waiting = screen.getByRole('button', { name: metronome.loading })
      expect(waiting).toBeVisible()
      expect(screen.queryByRole('button', { name: metronome.stop })).toBeNull()

      loading(false)
      expect(screen.getByRole('button', { name: metronome.stop })).toBeVisible()
    })

    it('offers the press as usual while a chosen groove loads untouched', () => {
      const { transport, loading } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.change(screen.getByRole('combobox', { name: metronome.sound }), {
        target: { value: 'straight-funk' },
      })
      loading(true)

      // Nobody has asked for sound yet, so there is nothing to wait for and
      // the control keeps offering the press.
      expect(screen.getByRole('button', { name: metronome.start })).toBeVisible()
    })

    it('is still the one control, so the wait costs no second press', () => {
      const { transport, loading, stop } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.click(screen.getByRole('button', { name: metronome.start }))
      loading(true)

      fireEvent.click(screen.getByRole('button', { name: metronome.loading }))
      expect(stop).toHaveBeenCalledTimes(1)
    })
  })

  describe('the sample credit', () => {
    it('is on the page from the first render, with nothing to dismiss', () => {
      render(<Metronome />)

      expect(screen.getByText(app.sampleCredit)).toBeVisible()
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.getAllByRole('button')).toEqual([
        screen.getByRole('button', { name: metronome.start }),
        screen.getByRole('button', { name: metronome.tap }),
      ])
    })

    it('sits after start in the page and holds nothing above it', () => {
      render(<Metronome />)

      const play = screen.getByRole('button', { name: metronome.start })
      const credit = screen.getByText(app.sampleCredit)

      expect(
        play.compareDocumentPosition(credit) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(credit.contains(play)).toBe(false)
      // Last thing in the frame: there is nothing below it for it to displace,
      // and start is above it rather than under it.
      expect(credit.nextElementSibling).toBeNull()
    })
  })

  describe('remembering the setup', () => {
    const reopen = (transport: Transport) => {
      cleanup()
      return render(<Metronome transport={transport} />)
    }

    it('opens a first visit at 100 on the click', () => {
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      expect(screen.getByRole('status')).toHaveTextContent(
        `${SETUP_DEFAULT_BPM} ${metronome.tempoUnit}`,
      )
      expect(screen.getByRole('combobox', { name: metronome.sound })).toHaveValue(
        'click',
      )
    })

    it('comes back on the tempo the slider was left at', () => {
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.change(screen.getByRole('slider', { name: metronome.tempo }), {
        target: { value: '137' },
      })

      reopen(transport)
      expect(screen.getByRole('status')).toHaveTextContent(
        `137 ${metronome.tempoUnit}`,
      )
    })

    it('comes back on the groove that was picked', () => {
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.change(screen.getByRole('combobox', { name: metronome.sound }), {
        target: { value: 'straight-funk' },
      })

      reopen(transport)
      expect(
        screen.getByRole('combobox', { name: metronome.sound }),
      ).toHaveValue('straight-funk')
    })

    it('remembers a tapped tempo, which no handler writes', () => {
      // The tap commits through setBpm directly rather than through
      // changeTempo, so a write placed in the handlers would forget this one.
      vi.useFakeTimers()
      try {
        const { transport } = fakeTransport()
        render(
          <Metronome transport={transport} now={clockOf([10, 10.4, 10.8])} />,
        )
        const control = screen.getByRole('button', { name: metronome.tap })

        for (let tap = 0; tap < 3; tap += 1) fireEvent.click(control)
        act(() => {
          vi.advanceTimersByTime(PAST_ANY_WINDOW)
        })

        expect(JSON.parse(window.localStorage.getItem(SETUP_KEY) ?? '{}').bpm).toBe(
          150,
        )
      } finally {
        vi.useRealTimers()
      }
    })

    it('tells the transport once per change, from one place only', () => {
      // The lesson of this change is that the handler is not the seam. If
      // `changeSource` starts selecting again beside the effect, the transport
      // is told twice — harmless today because it dedupes, and exactly the
      // drift this test exists to notice.
      const { transport, select } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.change(screen.getByRole('combobox', { name: metronome.sound }), {
        target: { value: 'straight-funk' },
      })

      expect(select).toHaveBeenCalledTimes(1)
      expect(select).toHaveBeenCalledWith('straight-funk')
    })

    it('tells the transport about a restored groove, not just the select box', () => {
      // Restoring set the state and left the transport on its default, so the
      // box said straight-funk and pressing play gave you the click. Handlers
      // are not the seam: a restore goes around them.
      window.localStorage.setItem(
        SETUP_KEY,
        JSON.stringify({ version: 1, bpm: 120, source: 'straight-funk' }),
      )
      const { transport, select } = fakeTransport()
      render(<Metronome transport={transport} />)

      expect(select).toHaveBeenCalledWith('straight-funk')
    })

    it('tells the transport about a restored rock, which SOURCE_IDS is what validates', () => {
      // A stored id the validation list does not carry falls back to the
      // click, so this is the assertion that 'rock' survives a reload.
      window.localStorage.setItem(
        SETUP_KEY,
        JSON.stringify({ version: 1, bpm: 120, source: 'rock' }),
      )
      const { transport, select } = fakeTransport()
      render(<Metronome transport={transport} />)

      expect(select).toHaveBeenCalledWith('rock')
      expect(
        screen.getByRole('combobox', { name: metronome.sound }),
      ).toHaveValue('rock')
    })

    it('never writes its defaults over a stored setup while opening', () => {
      // The read lands a frame after mount, so without a guard the persist
      // effect fires first with the defaults and puts 100 on disk before 137
      // replaces it. The end state is right either way, which is why only
      // watching the writes catches it.
      window.localStorage.setItem(
        SETUP_KEY,
        JSON.stringify({ version: 1, bpm: 137, source: 'straight-funk' }),
      )
      const written: string[] = []
      const setItem = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation((_key, value) => void written.push(value))

      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)
      setItem.mockRestore()

      expect(written.map((entry) => JSON.parse(entry).bpm)).not.toContain(
        SETUP_DEFAULT_BPM,
      )
    })

    it('opens on the defaults rather than breaking when storage holds junk', () => {
      window.localStorage.setItem(SETUP_KEY, '{not json')
      const { transport } = fakeTransport()

      expect(() => render(<Metronome transport={transport} />)).not.toThrow()
      expect(screen.getByRole('status')).toHaveTextContent(
        `${SETUP_DEFAULT_BPM} ${metronome.tempoUnit}`,
      )
    })
  })

  describe('the fills toggle', () => {
    const GROOVE = 'straight-funk'
    const ROCK = 'rock'

    const picker = () => screen.getByRole('combobox', { name: metronome.sound })
    const box = () => screen.queryByRole('checkbox', { name: metronome.fills })
    const pick = (value: string) =>
      fireEvent.change(picker(), { target: { value } })

    it('is absent from the page while the click is selected', () => {
      render(<Metronome />)

      // Absent, not disabled: a control that does nothing is one more thing to
      // read past on the way to Play.
      expect(box()).toBeNull()
    })

    it('arrives ticked with the groove, so the best sound is not shipped off', () => {
      render(<Metronome />)

      pick(GROOVE)

      expect(box()).toBeChecked()
    })

    it('goes again when the click comes back', () => {
      render(<Metronome />)

      pick(GROOVE)
      pick('click')

      expect(box()).toBeNull()
    })

    it('is one box for every groove, so unticking it on rock holds on funk', () => {
      const { transport, setFills } = fakeTransport()
      render(<Metronome transport={transport} />)

      pick(ROCK)
      expect(box()).toBeChecked()
      fireEvent.click(box()!)
      expect(setFills).toHaveBeenLastCalledWith(false)

      pick(GROOVE)

      // One boolean, not one per groove: switching grooves is not a way to get
      // the fills back, and the transport is not told otherwise.
      expect(box()).not.toBeChecked()
      expect(setFills).toHaveBeenLastCalledWith(false)

      pick('click')
      expect(box()).toBeNull()
    })

    it('sits below Play and holds nothing, with the credit still last', () => {
      render(<Metronome />)
      pick(GROOVE)

      const play = screen.getByRole('button', { name: metronome.start })
      const toggle = box()
      const credit = screen.getByText(app.sampleCredit)

      // After Play in the page and not wrapping it, so appearing and going with
      // the source can never move the one control the page is for.
      expect(
        play.compareDocumentPosition(toggle!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(toggle!.contains(play)).toBe(false)

      // With the credit rather than in the groove select, which is the one place
      // on the page someone is actually reading.
      expect(
        picker().compareDocumentPosition(toggle!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(
        toggle!.compareDocumentPosition(credit) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(credit.nextElementSibling).toBeNull()
    })

    it('tells the transport without stopping the run it is in', () => {
      const { transport, setFills, start, stop, select } = fakeTransport()
      render(<Metronome transport={transport} />)

      pick(GROOVE)
      fireEvent.click(screen.getByRole('button', { name: metronome.start }))
      fireEvent.click(box()!)

      expect(setFills).toHaveBeenLastCalledWith(false)
      expect(box()).not.toBeChecked()
      // Nothing is rebuilt and nothing is restarted: the transport reads the
      // flag as each step is queued, so the change lands inside the lookahead.
      expect(stop).not.toHaveBeenCalled()
      expect(start).toHaveBeenCalledTimes(1)
      expect(select).toHaveBeenCalledTimes(1)
      expect(screen.getAllByRole('listitem')).toHaveLength(4)
    })

    it('tells it again when the box goes back on', () => {
      const { transport, setFills } = fakeTransport()
      render(<Metronome transport={transport} />)

      pick(GROOVE)
      fireEvent.click(box()!)
      fireEvent.click(box()!)

      expect(setFills).toHaveBeenLastCalledWith(true)
      expect(box()).toBeChecked()
    })

    it('is a gesture like any other, so it arms the speaker button', () => {
      const { transport } = fakeTransport()
      const handlers = new Map<string, () => void>()
      vi.stubGlobal('navigator', {
        ...globalThis.navigator,
        mediaSession: {
          setActionHandler: (action: string, handler: (() => void) | null) => {
            if (handler === null) handlers.delete(action)
            else handlers.set(action, handler)
          },
          metadata: null,
          playbackState: 'none',
        },
      })
      render(<Metronome transport={transport} />)

      pick(GROOVE)
      fireEvent.click(box()!)

      expect(handlers.size).toBe(1)
      vi.unstubAllGlobals()
    })

    it('is remembered in the one setup record, beside the tempo and the groove', () => {
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      pick(GROOVE)
      fireEvent.click(box()!)

      expect(JSON.parse(window.localStorage.getItem(SETUP_KEY) ?? '{}')).toMatchObject(
        { source: GROOVE, fills: false },
      )
      expect(window.localStorage.length).toBe(1)
    })

    it('opens unticked when that is what was stored', () => {
      window.localStorage.setItem(
        SETUP_KEY,
        JSON.stringify({ version: 1, bpm: 120, source: GROOVE, fills: false }),
      )
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      expect(box()).not.toBeChecked()
    })

    it('opens ticked from a record written before the field existed', () => {
      window.localStorage.setItem(
        SETUP_KEY,
        JSON.stringify({ version: 1, bpm: 120, source: GROOVE }),
      )
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      expect(box()).toBeChecked()
    })

    it('keeps the setting across a trip to the click and back', () => {
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      pick(GROOVE)
      fireEvent.click(box()!)
      pick('click')
      pick(GROOVE)

      expect(box()).not.toBeChecked()
    })
  })

  describe('the count-in toggle', () => {
    const GROOVE = 'straight-funk'
    const ROCK = 'rock'

    const picker = () => screen.getByRole('combobox', { name: metronome.sound })
    const box = () => screen.queryByRole('checkbox', { name: metronome.countIn })
    const pick = (value: string) =>
      fireEvent.change(picker(), { target: { value } })

    it('is absent from the page while the click is selected', () => {
      render(<Metronome />)

      // A count-in on the click would be four claves before four claves, so
      // there is nothing here to offer.
      expect(box()).toBeNull()
    })

    it('arrives with the groove, unticked', () => {
      render(<Metronome />)

      pick(GROOVE)

      expect(box()).toBeVisible()
      expect(box()).not.toBeChecked()
    })

    it('goes again when the click comes back', () => {
      render(<Metronome />)

      pick(GROOVE)
      pick('click')

      expect(box()).toBeNull()
    })

    it('arrives with rock exactly as it does with funk', () => {
      render(<Metronome />)

      // The guard is the click, not a particular groove: every groove has a
      // count-in and only the click has none.
      pick(ROCK)
      expect(box()).toBeVisible()

      pick(GROOVE)
      expect(box()).toBeVisible()

      pick('click')
      expect(box()).toBeNull()
    })

    it('sits below Play beside the fills box, and neither pushes Play down', () => {
      render(<Metronome />)
      pick(GROOVE)

      const play = screen.getByRole('button', { name: metronome.start })
      const fills = screen.getByRole('checkbox', { name: metronome.fills })
      const toggle = box()!
      const credit = screen.getByText(app.sampleCredit)

      expect(
        play.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(toggle.contains(play)).toBe(false)
      expect(
        fills.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(
        toggle.compareDocumentPosition(credit) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(credit.nextElementSibling).toBeNull()
    })

    it('tells the transport, which latches it at the next start', () => {
      const { transport, setCountIn, stop, start } = fakeTransport()
      render(<Metronome transport={transport} />)

      pick(GROOVE)
      fireEvent.click(box()!)

      expect(setCountIn).toHaveBeenLastCalledWith(true)
      expect(box()).toBeChecked()
      // Nothing is restarted to say it: the transport reads the field when a
      // press of Start arms the run.
      expect(stop).not.toHaveBeenCalled()
      expect(start).not.toHaveBeenCalled()
    })

    it('tells it again when the box goes back off', () => {
      const { transport, setCountIn } = fakeTransport()
      render(<Metronome transport={transport} />)

      pick(GROOVE)
      fireEvent.click(box()!)
      fireEvent.click(box()!)

      expect(setCountIn).toHaveBeenLastCalledWith(false)
      expect(box()).not.toBeChecked()
    })

    it('is a gesture like any other, so it arms the speaker button', () => {
      const { transport } = fakeTransport()
      const handlers = new Map<string, () => void>()
      vi.stubGlobal('navigator', {
        ...globalThis.navigator,
        mediaSession: {
          setActionHandler: (action: string, handler: (() => void) | null) => {
            if (handler === null) handlers.delete(action)
            else handlers.set(action, handler)
          },
          metadata: null,
          playbackState: 'none',
        },
      })
      render(<Metronome transport={transport} />)

      pick(GROOVE)
      fireEvent.click(box()!)

      expect(handlers.size).toBe(1)
      vi.unstubAllGlobals()
    })

    it('round-trips through the one setup record, beside the tempo, groove and fills', () => {
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      fireEvent.change(screen.getByRole('slider', { name: metronome.tempo }), {
        target: { value: '137' },
      })
      pick(GROOVE)
      fireEvent.click(screen.getByRole('checkbox', { name: metronome.fills }))
      fireEvent.click(box()!)

      expect(
        JSON.parse(window.localStorage.getItem(SETUP_KEY) ?? '{}'),
      ).toMatchObject({ bpm: 137, source: GROOVE, fills: false, countIn: true })
      expect(window.localStorage.length).toBe(1)

      cleanup()
      render(<Metronome transport={transport} />)

      expect(screen.getByRole('status')).toHaveTextContent(
        `137 ${metronome.tempoUnit}`,
      )
      expect(picker()).toHaveValue(GROOVE)
      expect(screen.getByRole('checkbox', { name: metronome.fills })).not.toBeChecked()
      expect(box()).toBeChecked()
    })

    it('opens unticked from a record written before the field existed', () => {
      // A V7- or V8-shaped record carries no `countIn` key, and the per-value
      // fallback is what lets it read back complete rather than costing
      // everyone the tempo a version bump would have discarded.
      window.localStorage.setItem(
        SETUP_KEY,
        JSON.stringify({ version: 1, bpm: 120, source: GROOVE, fills: false }),
      )
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      expect(box()).not.toBeChecked()
      expect(screen.getByRole('status')).toHaveTextContent(
        `120 ${metronome.tempoUnit}`,
      )
    })

    it('tells the transport about a restored box, not just the checkbox', () => {
      window.localStorage.setItem(
        SETUP_KEY,
        JSON.stringify({ version: 1, bpm: 120, source: GROOVE, countIn: true }),
      )
      const { transport, setCountIn } = fakeTransport()
      render(<Metronome transport={transport} />)

      // A restore goes around the handlers, exactly as it does for the groove.
      expect(setCountIn).toHaveBeenLastCalledWith(true)
    })

    it('keeps the setting across a trip to the click and back', () => {
      const { transport } = fakeTransport()
      render(<Metronome transport={transport} />)

      pick(GROOVE)
      fireEvent.click(box()!)
      pick('click')
      pick(GROOVE)

      expect(box()).toBeChecked()
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
