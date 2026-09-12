import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transport } from '../components/Metronome'
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

  const factory: AudioFactory = () => {
    built.count += 1
    return new Promise<Audio>((resolve) => {
      release = resolve
    })
  }

  return {
    factory,
    built,
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
