import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transport } from '../components/Metronome'
import { useClickTransport, type Audio, type AudioFactory } from './useClickTransport'

/** A device that never sounds, with every handle the hook can leak. */
function fakeAudio() {
  const close = vi.fn().mockResolvedValue(undefined)
  const resume = vi.fn().mockResolvedValue(undefined)
  const stopSounding = vi.fn()
  const stop = vi.fn()
  const built: { count: number } = { count: 0 }

  let release: ((audio: Audio) => void) | null = null

  const audio: Audio = {
    context: { state: 'running', resume, close },
    clock: { currentTime: 0, stopSounding },
    scheduler: {
      isRunning: false,
      start: vi.fn(),
      stop,
      setTempo: vi.fn(),
      tick: vi.fn(),
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
})

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
