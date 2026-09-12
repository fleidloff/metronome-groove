import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transport } from '../components/Metronome'
import type { SourceId } from '../lib/transport/source'
import {
  useClickTransport,
  type Audio,
  type AudioFactory,
} from './useClickTransport'

/** A device that never sounds, with every handle the hook can leak. */
function fakeAudio() {
  const close = vi.fn().mockResolvedValue(undefined)
  const resume = vi.fn().mockResolvedValue(undefined)
  const stopSounding = vi.fn()
  const built: { count: number } = { count: 0 }

  let release: ((audio: Audio) => void) | null = null

  let running = false

  const start = vi.fn(() => {
    running = true
  })
  const stop = vi.fn(() => {
    running = false
  })
  const setTempo = vi.fn()
  const tick = vi.fn()

  const audio: Audio = {
    context: { state: 'running', resume, close },
    clock: { currentTime: 0, stopSounding },
    scheduler: {
      get isRunning() {
        return running
      },
      start,
      stop,
      setTempo,
      tick,
      onBeat: vi.fn(() => () => {}),
    },
  }

  const asked: SourceId[] = []

  const factory: AudioFactory = (_bpm, source) => {
    built.count += 1
    asked.push(source)
    return new Promise<Audio>((resolve) => {
      release = resolve
    })
  }

  return {
    factory,
    built,
    asked,
    close,
    stopSounding,
    stop,
    start,
    setTempo,
    tick,
    finishLoading: async () => {
      release?.(audio)
      await act(async () => {})
    },
  }
}

function mount(factory: AudioFactory, onFailure = vi.fn()) {
  const captured: { transport?: Transport; onFailure: typeof onFailure } = {
    onFailure,
  }

  function Probe() {
    captured.transport = useClickTransport(factory, onFailure)
    return null
  }

  const view = render(<Probe />)
  return { ...view, transport: () => captured.transport!, onFailure }
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllTimers()
  vi.useRealTimers()
})

/** Lets the transport's own promise chain settle. Nothing here ever sleeps. */
const settle = () => act(async () => {})

describe('the click transport', () => {
  it('builds nothing until start, so a render touches no audio device', () => {
    const device = fakeAudio()
    mount(device.factory)

    expect(device.built.count).toBe(0)
  })

  it('builds one device when start is tapped twice during the first load', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => {
      transport().start(120)
      transport().start(140)
    })
    await device.finishLoading()

    expect(device.built.count).toBe(1)
  })

  it('leaves nothing running when it unmounts mid-load', async () => {
    const device = fakeAudio()
    const { transport, unmount } = mount(device.factory)

    act(() => transport().start(120))
    unmount()
    await device.finishLoading()

    expect(vi.mocked(globalThis.requestAnimationFrame)).not.toHaveBeenCalled()
  })

  it('closes a device that arrives after it unmounted', async () => {
    const device = fakeAudio()
    const { transport, unmount } = mount(device.factory)

    // The context is built before the fetch resolves, so unmounting here means
    // a real device arrives with nobody left to own it.
    act(() => transport().start(120))
    unmount()
    await device.finishLoading()

    expect(device.close).toHaveBeenCalled()
  })

  it('closes a device that arrives after stop', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => {
      transport().start(120)
      transport().stop()
    })
    await device.finishLoading()

    expect(device.close).toHaveBeenCalled()
  })

  it('does not start when stop lands during the load', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => {
      transport().start(120)
      transport().stop()
    })
    await device.finishLoading()

    expect(vi.mocked(globalThis.requestAnimationFrame)).not.toHaveBeenCalled()
  })

  it('closes the device on unmount once it has one', async () => {
    const device = fakeAudio()
    const { transport, unmount } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()
    unmount()

    expect(device.close).toHaveBeenCalled()
  })

  it('silences a queued beat on stop, because the clock cannot un-schedule', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()
    act(() => transport().stop())

    expect(device.stop).toHaveBeenCalled()
    expect(device.stopSounding).toHaveBeenCalled()
  })

  it('reports a device that will not load rather than failing silently', async () => {
    const failed: AudioFactory = () => Promise.reject(new Error('no decoder'))
    const onFailure = vi.fn()
    const { transport } = mount(failed, onFailure)

    await act(async () => {
      transport().start(120)
    })

    expect(onFailure).toHaveBeenCalledOnce()
    expect(vi.mocked(globalThis.requestAnimationFrame)).not.toHaveBeenCalled()
  })

  it('hands a beat listener its own unsubscribe', () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    const heard: number[] = []
    const off = transport().onBeat((beat) => heard.push(beat))

    expect(typeof off).toBe('function')
    off()
  })
})

describe('the click transport suspended between taps', () => {
  it('silences a running click when it suspends', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()
    act(() => transport().suspend())

    expect(device.stop).toHaveBeenCalled()
    expect(device.stopSounding).toHaveBeenCalled()
    expect(vi.mocked(globalThis.cancelAnimationFrame)).toHaveBeenCalled()
  })

  it('queues nothing more while it is suspended', async () => {
    vi.useFakeTimers()
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()
    act(() => transport().suspend())
    device.tick.mockClear()
    act(() => vi.advanceTimersByTime(1000))

    expect(device.tick).not.toHaveBeenCalled()
  })

  it('returns on a fresh bar at the new tempo when it resumes', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()
    act(() => transport().suspend())
    act(() => transport().resume(90))
    await settle()

    expect(device.setTempo).toHaveBeenLastCalledWith(90)
    expect(device.start).toHaveBeenCalledTimes(2)
    // A fresh bar, not a continuation: the scheduler was stopped before the
    // second start, which is what resets the cursor onto the accent.
    expect(device.stop.mock.invocationCallOrder[0]).toBeLessThan(
      device.start.mock.invocationCallOrder[1],
    )
  })

  it('does not build a device when it suspends and resumes with the click off', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => {
      transport().suspend()
      transport().resume(140)
    })
    await settle()

    expect(device.built.count).toBe(0)
    expect(vi.mocked(globalThis.requestAnimationFrame)).not.toHaveBeenCalled()
  })

  it('does not turn the click back on when it was stopped before the suspend', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()
    act(() => transport().stop())
    act(() => transport().suspend())
    act(() => transport().resume(140))
    await settle()

    expect(device.start).toHaveBeenCalledTimes(1)
    expect(device.setTempo).not.toHaveBeenCalledWith(140)
  })

  it('leaves nothing running and closes the device when it unmounts suspended', async () => {
    vi.useFakeTimers()
    const device = fakeAudio()
    const { transport, unmount } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()
    act(() => transport().suspend())
    unmount()
    device.tick.mockClear()
    act(() => vi.advanceTimersByTime(1000))

    expect(device.tick).not.toHaveBeenCalled()
    expect(device.close).toHaveBeenCalled()
  })

  it('does not double-start when resume is called twice', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()
    act(() => transport().suspend())
    act(() => transport().resume(100))
    await settle()
    act(() => transport().resume(100))
    await settle()

    expect(device.start).toHaveBeenCalledTimes(2)
  })

  it('ignores a resume that follows no suspend', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()
    act(() => transport().resume(90))
    await settle()

    expect(device.start).toHaveBeenCalledTimes(1)
    expect(device.setTempo).not.toHaveBeenCalledWith(90)
  })
})

describe('the transport carrying the fills setting', () => {
  const GROOVE: SourceId = 'straight-funk'

  /** Keeps whatever getter the hook hands the source, so a test can read it
   *  the way the scheduler does — once per queued step. */
  function watched(device: ReturnType<typeof fakeAudio>) {
    const given: (() => boolean)[] = []
    const factory: AudioFactory = (bpm, source, variations) => {
      given.push(variations)
      return device.factory(bpm, source, variations)
    }
    return { factory, given }
  }

  it('hands the source a getter rather than a captured boolean', async () => {
    const device = fakeAudio()
    const { factory, given } = watched(device)
    const { transport } = mount(factory)

    act(() => transport().select?.(GROOVE))
    await device.finishLoading()

    // On unless someone says otherwise, and read afresh every call: this is
    // what makes a toggle land on the next unqueued step.
    expect(given[0]()).toBe(true)

    act(() => transport().setFills?.(false))
    expect(given[0]()).toBe(false)

    act(() => transport().setFills?.(true))
    expect(given[0]()).toBe(true)
  })

  it('builds no second device and stops no run to change it', async () => {
    const device = fakeAudio()
    const { factory } = watched(device)
    const { transport } = mount(factory)

    act(() => transport().select?.(GROOVE))
    await device.finishLoading()
    act(() => transport().start(120))
    await device.finishLoading()

    act(() => transport().setFills?.(false))

    expect(device.built.count).toBe(1)
    expect(device.stop).not.toHaveBeenCalled()
    expect(device.start).toHaveBeenCalledTimes(1)
  })

  it('carries the setting into a device built later', async () => {
    const device = fakeAudio()
    const { factory, given } = watched(device)
    const { transport } = mount(factory)

    // Set before anything is built, which is what a restored setup does.
    act(() => transport().setFills?.(false))
    act(() => transport().select?.(GROOVE))
    await device.finishLoading()

    expect(given[0]()).toBe(false)
  })
})

describe('the transport choosing what it plays', () => {
  const GROOVE: SourceId = 'straight-funk'

  it('builds the click when start is the first thing that happens', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()

    expect(device.asked).toEqual(['click'])
  })

  it('builds the groove the moment it is chosen, with no start in sight', () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().select?.(GROOVE))

    // The fetch belongs to the gesture that asked for it, so the 550 KB is
    // already moving before the hand goes back to the instrument.
    expect(device.asked).toEqual([GROOVE])
    expect(device.start).not.toHaveBeenCalled()
  })

  it('builds nothing when the source asked for is the one it already has', () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().select?.('click'))

    expect(device.built.count).toBe(0)
  })

  it('waits for the samples rather than sounding a silent bar', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().select?.(GROOVE))
    act(() => transport().start(120))

    expect(device.start).not.toHaveBeenCalled()
    expect(device.built.count).toBe(1)

    await device.finishLoading()
    expect(device.start).toHaveBeenCalledTimes(1)
  })

  it('reports the wait, from the choice until the device arrives', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    const seen: boolean[] = []
    act(() => {
      transport().onLoadingChange?.((loading) => seen.push(loading))
    })
    expect(seen).toEqual([false])

    act(() => transport().select?.(GROOVE))
    expect(seen).toEqual([false, true])

    await device.finishLoading()
    expect(seen).toEqual([false, true, false])
  })

  it('reports the wait for a start that has to build its own device', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    const seen: boolean[] = []
    act(() => {
      transport().onLoadingChange?.((loading) => seen.push(loading))
    })

    act(() => transport().start(120))
    expect(seen).toEqual([false, true])

    await device.finishLoading()
    expect(seen).toEqual([false, true, false])
  })

  it('stops reporting to a listener that unsubscribed', () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    const seen: boolean[] = []
    let off: (() => void) | undefined
    act(() => {
      off = transport().onLoadingChange?.((loading) => seen.push(loading))
    })
    off?.()

    act(() => transport().select?.(GROOVE))

    expect(seen).toEqual([false])
  })

  it('reports a groove that will not load rather than failing silently', async () => {
    const failed: AudioFactory = () => Promise.reject(new Error('no decoder'))
    const onFailure = vi.fn()
    const { transport } = mount(failed, onFailure)

    await act(async () => {
      transport().select?.(GROOVE)
    })

    expect(onFailure).toHaveBeenCalledOnce()
  })

  it('lets the old device go when the source changes', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()
    act(() => transport().select?.(GROOVE))

    expect(device.stop).toHaveBeenCalled()
    expect(device.stopSounding).toHaveBeenCalled()
    expect(device.close).toHaveBeenCalled()
  })

  it('carries a run across the change, so the groove starts once it has arrived', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().start(120))
    await device.finishLoading()
    device.start.mockClear()

    act(() => transport().select?.(GROOVE))
    expect(device.start).not.toHaveBeenCalled()

    await device.finishLoading()
    expect(device.start).toHaveBeenCalledTimes(1)
    expect(device.asked).toEqual(['click', GROOVE])
  })

  it('leaves a stopped click stopped when the groove is chosen', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().select?.(GROOVE))
    await device.finishLoading()

    expect(device.start).not.toHaveBeenCalled()
    expect(vi.mocked(globalThis.requestAnimationFrame)).not.toHaveBeenCalled()
  })
})
