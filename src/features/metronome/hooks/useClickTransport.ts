'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { Transport } from '../components/Metronome'
import {
  CLAVES_LEAD_IN_S,
  CLAVES_NOMINAL_VELOCITY,
  CLAVES_SAMPLE_URL,
} from '../lib/click/claves'
import { CLICK_SOURCE } from '../lib/click/source'
import {
  KIT,
  KIT_SAMPLE_URLS,
  KIT_VOICES,
  layerFor,
  sampleUrlFor,
  type KitVoiceName,
} from '../lib/groove/kit'
import { createStraightFunkSource } from '../lib/groove/source'
import { createAudioClock, type VoiceBank } from '../lib/transport/audioClock'
import {
  createScheduler,
  LOOKAHEAD_S,
  type Beat,
  type Scheduler,
} from '../lib/transport/scheduler'
import type { Source, SourceId, VoiceName } from '../lib/transport/source'
import { clampTempo } from '../lib/transport/tempo'

const TICK_MS = (LOOKAHEAD_S * 1000) / 4

export type Audio = {
  context: Pick<AudioContext, 'state' | 'resume' | 'close'>
  clock: { readonly currentTime: number; stopSounding(): void }
  scheduler: Scheduler
}

/**
 * How the audio is built. Injected so a test can drive this hook without a real
 * device — which is the only way the start/stop/unmount races below can be
 * asserted at all.
 */
export type AudioFactory = (
  bpm: number,
  source: SourceId,
  /** Read per step by the groove, so unticking the box lands on the next
   *  unqueued step rather than needing a device to be built again. */
  variations: () => boolean,
) => Promise<Audio>

/**
 * One hi-hat has one state. A closed hat that sounds while the open one is
 * still ringing cuts it, rather than letting the two overlap — without this the
 * open hat on step 14 rings through the next downbeat.
 */
const KIT_CHOKES: Partial<Record<KitVoiceName, readonly VoiceName[]>> = {
  hatClosed: ['hatOpen'],
}

const decode = async (context: AudioContext, url: string): Promise<AudioBuffer> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load ${url}: ${response.status}`)

  return context.decodeAudioData(await response.arrayBuffer())
}

const buildClavesBank = async (context: AudioContext): Promise<VoiceBank> => {
  const buffer = await decode(context, CLAVES_SAMPLE_URL)

  return {
    claves: {
      leadInSeconds: CLAVES_LEAD_IN_S,
      takeFor: () => ({ buffer, nominalVelocity: CLAVES_NOMINAL_VELOCITY }),
    },
  }
}

/**
 * The kit's four voices, every take of every layer decoded before a note is
 * scheduled. The lead-in comes from the kit and is zero: `CLAVES_LEAD_IN_S` is
 * a property of that one file, and a kit that inherited it would play 8.3 ms
 * early on every hit.
 */
const buildKitBank = async (context: AudioContext): Promise<VoiceBank> => {
  const decoded = new Map<string, AudioBuffer>()

  await Promise.all(
    KIT_SAMPLE_URLS.map(async (url) => {
      decoded.set(url, await decode(context, url))
    }),
  )

  const bank: VoiceBank = {}

  for (const voice of KIT_VOICES) {
    bank[voice] = {
      leadInSeconds: KIT[voice].leadInSeconds,
      chokes: KIT_CHOKES[voice],
      takeFor: (velocity, step) => {
        const buffer = decoded.get(sampleUrlFor(voice, velocity, step))
        if (!buffer) return null

        return { buffer, nominalVelocity: layerFor(voice, velocity).nominalVelocity }
      },
    }
  }

  return bank
}

/**
 * The click declines variations the same way it declines humanize: it is not
 * given them at all, so `CLICK_SOURCE` never learns what a bar is.
 */
const sourceFor = (id: SourceId, variations: () => boolean): Source =>
  id === 'click' ? CLICK_SOURCE : createStraightFunkSource({ variations })

/**
 * The transport plus its third state. `suspend` puts the click between running
 * and stopped — silent, but remembered — so a tapped tempo can bring it back
 * on its own rather than asking the player to press start a second time.
 */
const buildRealAudio: AudioFactory = async (bpm, id, variations) => {
  const context = new AudioContext()

  try {
    const bank = id === 'click' ? await buildClavesBank(context) : await buildKitBank(context)
    const clock = createAudioClock(context, bank)

    return {
      context,
      clock,
      scheduler: createScheduler({ clock, bpm, source: sourceFor(id, variations) }),
    }
  } catch (reason) {
    await context.close()
    throw reason
  }
}

/** Surfaces a load or decode failure. Replaced in tests; a UI surface for it
 *  is not in V2, so the console is where it goes for now. */
const reportFailure = (reason: unknown) => {
  console.error('The metronome could not start.', reason)
}

/**
 * Owns the lifetime of the audio device and the interval that drives the
 * scheduler. Nothing is built until `start` or a deliberate `select`, because a
 * browser refuses an AudioContext before a user gesture — and because that
 * keeps this hook inert under jsdom.
 */
export function useClickTransport(
  buildAudio: AudioFactory = buildRealAudio,
  onFailure: (reason: unknown) => void = reportFailure,
): Transport {
  /**
   * One mutable session behind one ref. Everything here is imperative and
   * outlives a render — the device, the interval, the frame loop, the queue —
   * so it is held as fields of a single object rather than as a row of refs
   * that an async function would have to reassign.
   */
  const session = useRef({
    audio: null as Audio | null,
    building: null as Promise<Audio> | null,
    timer: null as ReturnType<typeof setInterval> | null,
    frame: null as number | null,
    pending: [] as Beat[],
    listeners: new Set<(beat: number) => void>(),
    bpm: 120,
    /** Which source the device is built for. The click, until someone asks for
     *  something else — so a player who only ever uses it downloads one file. */
    sourceId: 'click' as SourceId,
    /**
     * Whether the groove plays its marked bars. Held here rather than closed
     * over at build time: the getter handed to the source reads this field, so
     * a change reaches the next step the scheduler queues with no rebuild and
     * no restart.
     */
    fills: true,
    /** Whether a device is being built right now. The start control reads it,
     *  so a press during the load says it is waiting instead of sounding a
     *  silent bar. */
    isLoading: false,
    loadingListeners: new Set<(loading: boolean) => void>(),
    /** Whether the player has asked for a click, which is not the same as the
     *  scheduler running: a start still loading its device counts. */
    running: false,
    /** Set by `suspend` only when it found a click to silence. It is the whole
     *  of `resume`'s permission to sound. */
    suspended: false,
    /** Bumped by stop, by suspend and by unmount. An async start that returns
     *  to find its generation stale undoes its own work rather than leaving
     *  things run. */
    generation: 0,
  })

  useEffect(() => {
    const live = session.current

    return () => {
      live.generation += 1
      if (live.timer !== null) clearInterval(live.timer)
      if (live.frame !== null) cancelAnimationFrame(live.frame)
      live.timer = null
      live.frame = null
      live.pending = []
      live.running = false
      live.suspended = false
      live.building = null
      live.isLoading = false
      live.audio?.scheduler.stop()
      live.audio?.clock.stopSounding()
      void live.audio?.context.close()
      live.audio = null
    }
  }, [])

  return useMemo<Transport>(() => {
    const live = session.current

    const stopDriving = () => {
      if (live.timer !== null) clearInterval(live.timer)
      if (live.frame !== null) cancelAnimationFrame(live.frame)
      live.timer = null
      live.frame = null
      live.pending = []
    }

    const announceLoading = (loading: boolean) => {
      if (live.isLoading === loading) return
      live.isLoading = loading
      for (const listener of live.loadingListeners) listener(loading)
    }

    /**
     * The clock-to-React bridge. A beat is *announced* when it is queued, up to
     * a lookahead early, so lighting a dot on announcement would put the UI
     * ahead of the sound by far more than the lead-in it was corrected for.
     * Each beat instead waits until the audio clock reaches the time it is
     * actually heard.
     *
     * On animation frames, so it self-corrects after a dropped frame and never
     * blocks the audio thread: if the display stutters, the click stays exact.
     */
    const drainOnFrame = () => {
      live.frame = requestAnimationFrame(drainOnFrame)

      const now = live.audio?.clock.currentTime
      if (now === undefined) return

      while (live.pending.length > 0 && live.pending[0].time <= now) {
        const beat = live.pending.shift()
        if (!beat) break
        for (const listener of live.listeners) listener(beat.index)
      }
    }

    /**
     * A device that arrives after the run it was built for is over is closed
     * on arrival, never stored. The load starts before the context exists, so
     * an unmount landing in that window would otherwise park a live
     * AudioContext in a hook nobody will call again — and browsers cap those
     * at about six per document.
     */
    const receive = (mine: number) => (built: Audio) => {
      if (live.generation !== mine) {
        built.scheduler.stop()
        built.clock.stopSounding()
        void built.context.close()
        throw new Error('stale')
      }

      live.audio = built
      built.scheduler.onBeat((beat) => live.pending.push(beat))
      return built
    }

    const ensureAudio = (mine: number): Promise<Audio> => {
      if (live.audio) return Promise.resolve(live.audio)
      // A second tap during the first load must not build a second device.
      if (live.building) return live.building

      const settle = () => {
        live.building = null
        announceLoading(false)
      }

      announceLoading(true)

      const attempt = buildAudio(live.bpm, live.sourceId, () => live.fills).then(
        (built) => {
          settle()
          return receive(mine)(built)
        },
        (reason: unknown) => {
          settle()
          throw reason
        },
      )

      live.building = attempt
      return attempt
    }

    /**
     * Everything a run needs, shared by `start` and `resume`. A resume is a
     * start the player did not have to press — the only difference is what
     * decides it may happen.
     */
    const begin = (next: number) => {
      live.bpm = clampTempo(next)
      live.running = true
      const mine = live.generation

      void ensureAudio(mine)
        .then(async (ready) => {
          if (live.generation !== mine) return
          if (ready.context.state === 'suspended') await ready.context.resume()
          if (live.generation !== mine) return

          ready.scheduler.setTempo(live.bpm)
          ready.scheduler.start()
          ready.scheduler.tick()

          if (live.timer === null) {
            live.timer = setInterval(() => ready.scheduler.tick(), TICK_MS)
          }
          if (live.frame === null) drainOnFrame()
        })
        .catch((reason: unknown) => {
          if (live.generation !== mine) return
          live.running = false
          stopDriving()

          // A device that could not be built must not fail silently: the
          // button says Start and nothing clicks, which reads as a broken
          // app rather than a broken file.
          onFailure(reason)
        })
    }

    /**
     * Silences the scheduler and cuts the drivers, and bumps the generation so
     * a start still in flight cannot queue a beat after it.
     */
    const silence = () => {
      live.generation += 1
      stopDriving()
      live.audio?.scheduler.stop()
      live.audio?.clock.stopSounding()
    }

    /** Lets the device go. A source change needs a different bank and a
     *  different scheduler, and a browser caps how many contexts a page may
     *  hold — so the old one is closed rather than parked. */
    const discard = () => {
      void live.audio?.context.close()
      live.audio = null
      live.building = null
      announceLoading(false)
    }

    return {
      start(next: number) {
        live.suspended = false
        begin(next)
      },

      stop() {
        live.running = false
        live.suspended = false
        silence()
      },

      suspend() {
        // Tapping a tempo with the click off must not arm a resume.
        if (!live.running) return
        live.running = false
        live.suspended = true
        silence()
      },

      resume(next: number) {
        if (!live.suspended) return
        live.suspended = false
        begin(next)
      },

      /**
       * Selecting is the declared intent, so the samples are fetched here —
       * not on page load and not at the first Play. Someone who only ever uses
       * the click never downloads the kit, and someone who picked the groove
       * has the gap before their hand returns to the instrument to spend on it.
       */
      select(next: SourceId) {
        if (next === live.sourceId) return

        const wasRunning = live.running
        live.running = false
        live.suspended = false
        silence()
        discard()
        live.sourceId = next

        if (wasRunning) {
          begin(live.bpm)
          return
        }

        const mine = live.generation
        void ensureAudio(mine).catch((reason: unknown) => {
          if (live.generation !== mine) return
          onFailure(reason)
        })
      },

      setTempo(next: number) {
        live.bpm = clampTempo(next)
        live.audio?.scheduler.setTempo(live.bpm)
      },

      /**
       * One field, and nothing else. Rebuilding the source here would cost a
       * teardown per click and lose the absolute step that take selection and
       * humanize both read.
       */
      setFills(on: boolean) {
        live.fills = on
      },

      onBeat(listener: (beat: number) => void) {
        live.listeners.add(listener)
        return () => live.listeners.delete(listener)
      },

      onLoadingChange(listener: (loading: boolean) => void) {
        live.loadingListeners.add(listener)
        listener(live.isLoading)
        return () => {
          live.loadingListeners.delete(listener)
        }
      },
    }
  }, [buildAudio, onFailure])
}
