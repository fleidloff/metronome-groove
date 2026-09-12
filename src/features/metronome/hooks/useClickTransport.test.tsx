import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STEPS_PER_BAR } from '@/lib/steps'
import type { Transport } from '../components/Metronome'
import { CLAVES_SAMPLE_URL } from '../lib/click/claves'
import { CLICK_SOURCE } from '../lib/click/source'
import { KIT, KIT_SAMPLE_URLS, type KitVoiceName } from '../lib/groove/kit'
import { readSetup, writeSetup, type Setup } from '../lib/setup/storedSetup'
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

  const retargeted: SourceId[] = []
  let builtFor: SourceId = 'click'

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
    serves: (id) => (id === 'click') === (builtFor === 'click'),
    retarget: (id) => {
      retargeted.push(id)
      return Promise.resolve(audio.scheduler)
    },
  }

  const asked: SourceId[] = []

  const factory: AudioFactory = (_bpm, source) => {
    built.count += 1
    builtFor = source
    asked.push(source)
    return new Promise<Audio>((resolve) => {
      release = resolve
    })
  }

  return {
    factory,
    built,
    asked,
    retargeted,
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
  const ROCK_ID: SourceId = 'rock'
  const BOSSA_ID: SourceId = 'bossa-nova'

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

  it('builds rock when rock is chosen, so the third entry reaches the transport', () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().select?.(ROCK_ID))

    expect(device.asked).toEqual([ROCK_ID])
  })

  it('builds bossa when bossa is chosen, so the fourth entry reaches the transport', () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().select?.(BOSSA_ID))

    expect(device.asked).toEqual([BOSSA_ID])
  })

  it('restores a stored bossa-nova, with no start in sight', async () => {
    const stored = new Map<string, string>()
    const storage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => {
        stored.set(key, value)
      },
    } as unknown as Storage

    const setup: Setup = {
      bpm: 120,
      source: BOSSA_ID,
      fills: true,
      countIn: false,
    }
    writeSetup(setup, storage)

    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().select?.(readSetup(storage).source))
    await device.finishLoading()

    expect(device.asked).toEqual([BOSSA_ID])
    expect(device.start).not.toHaveBeenCalled()
  })

  it('keeps the device when one groove is swapped for another', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().select?.(GROOVE))
    await device.finishLoading()

    act(() => transport().select?.(ROCK_ID))
    await settle()

    // Both grooves draw the same 22 files, so the device is pointed at the new
    // one rather than closed and built again.
    expect(device.built.count).toBe(1)
    expect(device.retargeted).toEqual([ROCK_ID])
    expect(device.close).not.toHaveBeenCalled()
  })

  it('carries a run across a groove-to-groove switch on the device it already has', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().select?.(GROOVE))
    await device.finishLoading()
    act(() => transport().start(120))
    await settle()
    device.start.mockClear()

    act(() => transport().select?.(ROCK_ID))
    await settle()

    expect(device.built.count).toBe(1)
    expect(device.start).toHaveBeenCalledTimes(1)
  })

  it('builds again when the switch crosses to the click, which has its own bank', async () => {
    const device = fakeAudio()
    const { transport } = mount(device.factory)

    act(() => transport().select?.(ROCK_ID))
    await device.finishLoading()

    act(() => transport().select?.('click'))
    await device.finishLoading()

    expect(device.asked).toEqual([ROCK_ID, 'click'])
    expect(device.retargeted).toEqual([])
    expect(device.close).toHaveBeenCalled()
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
  const urlsOf = (voice: KitVoiceName): readonly string[] =>
    KIT[voice].layers.flatMap((layer) => layer.urls)

  /** Every file a device built for these voices has to hold, the claves
   *  included: every bank carries them, because the count-in borrows them. */
  const bankOf = (...voices: KitVoiceName[]) => [
    CLAVES_SAMPLE_URL,
    ...voices.flatMap(urlsOf),
  ]

  const FUNK_BANK = bankOf('kick', 'snare', 'hatClosed', 'hatOpen')
  const BOSSA_BANK = bankOf('kick', 'snare', 'hatClosed')
  const ROCK_BANK = bankOf('kick', 'snare', 'hatClosed', 'hatOpen')

  const sorted = (urls: readonly string[]) => [...urls].sort()

  /**
   * A device that records the sample every scheduled hit reaches for, so what
   * is in a bank can be read from what sounded. Nothing here decodes audio: a
   * fetched url stands in for its own buffer.
   */
  function fakeDevice() {
    const started: { url: string; at: number }[] = []
    const fetched: string[] = []
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
    vi.stubGlobal('fetch', (url: string) => {
      fetched.push(url)
      return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(url) })
    })

    return { started, clock, fetched }
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

  /** Lets every decode in a real build settle — a macrotask, because the build
   *  awaits a bank of 22 fetches behind a Promise.all. */
  const loaded = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

  it('fetches nothing at all when one groove is swapped for the other', async () => {
    const device = fakeDevice()
    const { transport } = mount(buildRealAudio)

    act(() => transport().select?.('straight-funk'))
    await loaded()

    // The claves and funk's own four voices, once.
    const decoded = device.fetched.length
    expect(decoded).toBe(FUNK_BANK.length)

    act(() => transport().select?.('rock'))
    await loaded()

    // Both grooves declare the same four voices, so there is nothing left to
    // download: the device is pointed at the new groove.
    expect(device.fetched.length).toBe(decoded)
  })

  it('fetches nothing further when shuffle follows rock', async () => {
    const device = fakeDevice()
    const { transport } = mount(buildRealAudio)

    act(() => transport().select?.('rock'))
    await loaded()
    const held = [...device.fetched]
    expect(sorted(held)).toEqual(sorted(ROCK_BANK))

    act(() => transport().select?.('shuffle'))
    await loaded()

    // ADR 0013: a device is keyed by its bank, and the two grooves resolve to
    // the same one.
    expect(sorted(device.fetched)).toEqual(sorted(held))
  })

  it('fetches nothing further when second line follows rock', async () => {
    const device = fakeDevice()
    const { transport } = mount(buildRealAudio)

    act(() => transport().select?.('rock'))
    await loaded()
    const held = [...device.fetched]
    expect(sorted(held)).toEqual(sorted(ROCK_BANK))

    act(() => transport().select?.('second-line'))
    await loaded()

    expect(sorted(device.fetched)).toEqual(sorted(held))
  })

  it('fetches nothing further when rock follows shuffle', async () => {
    const device = fakeDevice()
    const { transport } = mount(buildRealAudio)

    act(() => transport().select?.('shuffle'))
    await loaded()
    const held = [...device.fetched]
    expect(sorted(held)).toEqual(sorted(ROCK_BANK))

    act(() => transport().select?.('rock'))
    await loaded()

    expect(sorted(device.fetched)).toEqual(sorted(held))
  })

  it('fetches the voices funk declares, and no rim file', async () => {
    const device = fakeDevice()
    const { transport } = mount(buildRealAudio)

    act(() => transport().select?.('straight-funk'))
    await loaded()

    // The positive set as well as the absence: a load that failed outright
    // would fetch no rim either, and prove nothing.
    expect(sorted(device.fetched)).toEqual(sorted(FUNK_BANK))
    expect(device.fetched.some((url) => url.includes('rim'))).toBe(false)
  })

  it('fetches the voices bossa declares, and no open hat', async () => {
    const device = fakeDevice()
    const { transport } = mount(buildRealAudio)

    act(() => transport().select?.('bossa-nova'))
    await loaded()

    expect(sorted(device.fetched)).toEqual(sorted(BOSSA_BANK))
    expect(device.fetched.some((url) => url.includes('hatOpen'))).toBe(false)
  })

  it('fetches nothing further when bossa follows funk', async () => {
    const device = fakeDevice()
    const { transport } = mount(buildRealAudio)

    act(() => transport().select?.('straight-funk'))
    await loaded()
    const decoded = device.fetched.length
    expect(decoded).toBe(FUNK_BANK.length)

    act(() => transport().select?.('bossa-nova'))
    await loaded()

    // Bossa's three voices are a subset of funk's four, and the buffers are
    // held by url rather than rebuilt from the current groove's list.
    expect(device.fetched.length).toBe(decoded)
  })

  it('fetches only the open hat when funk follows bossa', async () => {
    const device = fakeDevice()
    const { transport } = mount(buildRealAudio)

    act(() => transport().select?.('bossa-nova'))
    await loaded()
    const held = [...device.fetched]

    act(() => transport().select?.('straight-funk'))
    await loaded()

    const added = device.fetched.slice(held.length)
    expect(sorted(added)).toEqual(sorted(urlsOf('hatOpen')))
    expect(sorted(device.fetched)).toEqual(sorted(FUNK_BANK))
  })

  it('fetches no rim file on any path through every source', async () => {
    const device = fakeDevice()
    const { transport } = mount(buildRealAudio)

    for (const id of [
      'bossa-nova',
      'straight-funk',
      'rock',
      'shuffle',
      'second-line',
      'click',
      'bossa-nova',
    ] as const) {
      act(() => transport().select?.(id))
      await loaded()
    }

    // `rim` is calibrated and swept, and no groove lists it — so it is 192 KB
    // nobody downloads.
    expect(device.fetched.length).toBeGreaterThan(0)
    expect(device.fetched.some((url) => url.includes('rim'))).toBe(false)
  })

  it('fetches the click bank again when the switch crosses to the click', async () => {
    const device = fakeDevice()
    const { transport } = mount(buildRealAudio)

    act(() => transport().select?.('rock'))
    await loaded()
    const decoded = device.fetched.length

    act(() => transport().select?.('click'))
    await loaded()

    // A different bank, so this one is a rebuild rather than a swap.
    expect(device.fetched.length).toBeGreaterThan(decoded)
  })

  it('plays the groove it was pointed at, not the one it was built for', async () => {
    const device = fakeDevice()
    const audio = await buildRealAudio(
      120,
      'straight-funk',
      () => true,
      () => false,
    )
    const decoded = device.fetched.length

    await audio.retarget('rock')
    run(audio, device, 2)

    expect(device.fetched.length).toBe(decoded)

    // Rock states eighths and funk sixteenths, so where the hits land is what
    // says which groove is sounding. An eighth is 0.25 s at 120 bpm, and
    // humanize displaces by single-digit milliseconds.
    const EIGHTH_S = 0.25
    expect(device.started.length).toBeGreaterThan(0)
    for (const hit of device.started) {
      const offGrid = Math.abs(
        hit.at - Math.round(hit.at / EIGHTH_S) * EIGHTH_S,
      )
      expect(offGrid).toBeLessThan(0.01)
    }
  })

  it('sounds the bossa clave, on the voice the count-in lends it', async () => {
    const device = fakeDevice()
    const audio = await buildRealAudio(120, 'bossa-nova', () => true, () => false)

    // One bar at 120 bpm, with no count bar in front of it — so a claves that
    // sounds here is the clave itself.
    run(audio, device, 2)

    const urls = device.started.map((hit) => hit.url)
    expect(urls).toContain(CLAVES_SAMPLE_URL)
    expect(urls.some((url) => KIT_SAMPLE_URLS.includes(url))).toBe(true)
  })

  it('starts bossa on the 3-side after a count bar, not a bar later', async () => {
    const device = fakeDevice()
    const audio = await buildRealAudio(120, 'bossa-nova', () => true, () => true)

    // The count bar and bossa's first bar, at 120 bpm.
    run(audio, device, 3.9)

    const STEP_S = 0.125
    const clave = device.started
      .filter((hit) => hit.url === CLAVES_SAMPLE_URL)
      .map((hit) => Math.round(hit.at / STEP_S))
      .filter((step) => step >= STEPS_PER_BAR && step < 2 * STEPS_PER_BAR)
      .map((step) => step - STEPS_PER_BAR)

    // The 3-side states the clave on 0, 6 and 12. A wrapper that mapped only
    // takes would hand the groove the 2-side, which is 4 and 10.
    expect(clave).toEqual([0, 6, 12])
  })
})
