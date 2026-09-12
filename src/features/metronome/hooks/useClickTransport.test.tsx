import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STEPS_PER_BAR } from '@/lib/steps'
import type { Transport } from '../components/Metronome'
import { CLAVES_SAMPLE_URL } from '../lib/click/claves'
import { CLICK_SOURCE } from '../lib/click/source'
import { KIT_SAMPLE_URLS } from '../lib/groove/kit'
import type { SourceId } from '../lib/transport/source'
import {
  buildRealAudio,
  sourceFor,
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
    const factory: AudioFactory = (bpm, source, variations, countIn) => {
      given.push(variations)
      return device.factory(bpm, source, variations, countIn)
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

describe('the transport arming the count-in', () => {
  const GROOVE: SourceId = 'straight-funk'

  /**
   * Keeps the getter the hook hands the source, so a test reads the latch the
   * way the wrapper does — per queued step, through the factory, rather than by
   * reaching into the session.
   */
  function watched(device: ReturnType<typeof fakeAudio>) {
    const given: (() => boolean)[] = []
    const factory: AudioFactory = (bpm, source, variations, countIn) => {
      given.push(countIn)
      return device.factory(bpm, source, variations, countIn)
    }
    return { factory, armed: () => given[given.length - 1]() }
  }

  it('arms the run when start is pressed with the box ticked', async () => {
    const device = fakeAudio()
    const { factory, armed } = watched(device)
    const { transport } = mount(factory)

    act(() => transport().setCountIn?.(true))
    act(() => transport().select?.(GROOVE))
    await device.finishLoading()
    act(() => transport().start(120))
    await settle()

    expect(armed()).toBe(true)
  })

  it('leaves the run unarmed when the box is unticked', async () => {
    const device = fakeAudio()
    const { factory, armed } = watched(device)
    const { transport } = mount(factory)

    act(() => transport().select?.(GROOVE))
    await device.finishLoading()
    act(() => transport().start(120))
    await settle()

    // Off on a first visit, and a start that was never told otherwise counts
    // nothing in.
    expect(armed()).toBe(false)
  })

  it('never arms the tap-tempo return, even with the box ticked', async () => {
    const device = fakeAudio()
    const { factory, armed } = watched(device)
    const { transport } = mount(factory)

    act(() => transport().setCountIn?.(true))
    act(() => transport().select?.(GROOVE))
    await device.finishLoading()
    act(() => transport().start(120))
    await settle()
    expect(armed()).toBe(true)

    act(() => transport().suspend())
    act(() => transport().resume(96))
    await settle()

    // Four claves before every tapped return is what would stop someone
    // tapping at all.
    expect(armed()).toBe(false)
  })

  it('never arms a source switch made mid-run, even with the box ticked', async () => {
    const device = fakeAudio()
    const { factory, armed } = watched(device)
    const { transport } = mount(factory)

    act(() => transport().setCountIn?.(true))
    act(() => transport().start(120))
    await device.finishLoading()
    act(() => transport().select?.(GROOVE))
    await device.finishLoading()
    await settle()

    // The bar is already running: a count here would put the click back in the
    // middle of the thing that was just switched away from.
    expect(armed()).toBe(false)
  })

  it('cannot be changed inside a run, and picks the new value up on the next start', async () => {
    const device = fakeAudio()
    const { factory, armed } = watched(device)
    const { transport } = mount(factory)

    act(() => transport().select?.(GROOVE))
    await device.finishLoading()
    act(() => transport().setCountIn?.(true))
    act(() => transport().start(120))
    await settle()
    expect(armed()).toBe(true)

    // Unlike fills, which lands on the next unqueued step: this one decides
    // where the groove's timeline begins, so a flip mid-bar would shift the
    // groove against itself.
    act(() => transport().setCountIn?.(false))
    expect(armed()).toBe(true)

    act(() => transport().stop())
    act(() => transport().start(120))
    await settle()
    expect(armed()).toBe(false)
  })

  it('takes the box back into account without a device being rebuilt', async () => {
    const device = fakeAudio()
    const { factory, armed } = watched(device)
    const { transport } = mount(factory)

    act(() => transport().select?.(GROOVE))
    await device.finishLoading()
    act(() => transport().start(120))
    await settle()
    act(() => transport().stop())

    act(() => transport().setCountIn?.(true))
    act(() => transport().start(120))
    await settle()

    expect(armed()).toBe(true)
    expect(device.built.count).toBe(1)
  })
})

describe('what the transport builds for real', () => {
  /**
   * A device that records the sample every scheduled hit reaches for, so what
   * is in a bank can be read from what sounded. Nothing here decodes audio: a
   * fetched url stands in for its own buffer.
   */
  function fakeDevice() {
    const started: { url: string; at: number }[] = []
    const clock = { now: 0 }

    const gain = () => ({
      value: 0,
      cancelScheduledValues: () => {},
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
    })

    class FakeContext {
      state = 'running'
      destination = {}
      get currentTime() {
        return clock.now
      }
      resume = () => Promise.resolve()
      close = () => Promise.resolve()
      decodeAudioData = (data: unknown) => Promise.resolve(data as AudioBuffer)
      createGain = () => ({ gain: gain(), connect: (to: unknown) => to })
      createBufferSource = () => {
        const source = {
          buffer: null as string | null,
          onended: null as (() => void) | null,
          connect: (to: unknown) => to,
          start: (at: number) => started.push({ url: source.buffer ?? '', at }),
          stop: () => {},
        }
        return source
      }
    }

    vi.stubGlobal('AudioContext', FakeContext)
    vi.stubGlobal('fetch', (url: string) =>
      Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(url) }),
    )

    return { started, clock }
  }

  /** Ticks a whole number of bars at 120 bpm, a step at a time, so no step is
   *  ever dropped as overtaken. */
  const run = (audio: Audio, device: { clock: { now: number } }, seconds: number) => {
    audio.scheduler.start()
    for (let at = 0; at <= seconds; at += 0.05) {
      device.clock.now = at
      audio.scheduler.tick()
    }
  }

  it('never wraps the click, so no path can put a count-in in front of it', () => {
    // Behaviour cannot settle this: a wrapped click would count four claves
    // and then play four claves, which sounds the same. The guarantee is that
    // the wrapper is never reached, so that is what is asserted.
    expect(sourceFor('click', () => true, () => true)).toBe(CLICK_SOURCE)
    expect(sourceFor('straight-funk', () => true, () => true)).not.toBe(
      CLICK_SOURCE,
    )
  })

  it('gives the groove a bank holding the claves as well as the kit', async () => {
    const device = fakeDevice()
    const audio = await buildRealAudio(
      120,
      'straight-funk',
      () => true,
      () => true,
    )

    // One count bar and one bar of the groove, at 120 bpm.
    run(audio, device, 4)

    const count = device.started.slice(0, 4)
    const groove = device.started.slice(4)

    // Four claves: the bank has them, or the count bar is silent.
    expect(count.map((hit) => hit.url)).toEqual(Array(4).fill(CLAVES_SAMPLE_URL))
    // Then the kit, and no claves again.
    expect(groove.length).toBeGreaterThan(0)
    expect(groove.every((hit) => KIT_SAMPLE_URLS.includes(hit.url))).toBe(true)
  })

  it('draws the same takes with the count-in as without it', async () => {
    // The wrapper's `takeStep` and the scheduler's forwarding of it are each
    // pinned on their own. This is the composition: two real runs of the real
    // device, compared by the file that actually sounded. Without `takeStep`
    // the groove's first bar would draw takes for steps 16-31 and the two
    // sequences would diverge at the first voice with more than one take.
    const armedDevice = fakeDevice()
    const armed = await buildRealAudio(120, 'straight-funk', () => true, () => true)
    run(armed, armedDevice, 8)

    const bareDevice = fakeDevice()
    const bare = await buildRealAudio(120, 'straight-funk', () => true, () => false)
    run(bare, bareDevice, 6)

    const afterTheCount = armedDevice.started.slice(4).map((hit) => hit.url)
    const fromSilence = bareDevice.started.map((hit) => hit.url)
    const shared = Math.min(afterTheCount.length, fromSilence.length)

    expect(shared).toBeGreaterThan(STEPS_PER_BAR)
    expect(afterTheCount.slice(0, shared)).toEqual(fromSilence.slice(0, shared))
  })

  it('sounds none of the groove when the run is stopped inside the count bar', async () => {
    const device = fakeDevice()
    const audio = await buildRealAudio(120, 'straight-funk', () => true, () => true)

    // The count bar is four beats at 120 bpm, so two seconds. Stop at 0.6.
    audio.scheduler.start()
    for (let at = 0; at <= 0.6; at += 0.05) {
      device.clock.now = at
      audio.scheduler.tick()
    }
    audio.scheduler.stop()
    audio.clock.stopSounding()

    // Keep the clock running well past where the groove would have arrived.
    for (let at = 0.6; at <= 6; at += 0.05) {
      device.clock.now = at
      audio.scheduler.tick()
    }

    expect(device.started.length).toBeGreaterThan(0)
    expect(device.started.every((hit) => hit.url === CLAVES_SAMPLE_URL)).toBe(true)
  })

  it('gives the click a bank of its own, with no kit in it', async () => {
    const device = fakeDevice()
    const audio = await buildRealAudio(120, 'click', () => true, () => true)

    run(audio, device, 2)

    expect(device.started.length).toBeGreaterThan(0)
    expect(device.started.every((hit) => hit.url === CLAVES_SAMPLE_URL)).toBe(true)
  })
})
