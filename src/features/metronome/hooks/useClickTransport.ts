'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { Transport } from '../components/Metronome'
import {
  CLAVES_LEAD_IN_S,
  CLAVES_NOMINAL_VELOCITY,
  CLAVES_SAMPLE_URL,
} from '../lib/click/claves'
import { CLICK_SOURCE } from '../lib/click/source'
import { KIT, layerFor, sampleUrlFor, type KitVoiceName } from '../lib/groove/kit'
import { createCountInSource } from '../lib/countIn/source'
import { BOSSA_NOVA } from '../lib/groove/grooves/bossaNova'
import type { GrooveDefinition } from '../lib/groove/grooves/definition'
import { ROCK } from '../lib/groove/grooves/rock'
import { SHUFFLE } from '../lib/groove/grooves/shuffle'
import { STRAIGHT_FUNK } from '../lib/groove/grooves/straightFunk'
import { createGrooveSource } from '../lib/groove/source'
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
  /** Whether this device's bank can be grown to cover `id` at all. */
  serves(id: SourceId): boolean
  /**
   * Points this device at another source, decoding whatever that source needs
   * and this bank does not already hold, then replacing `scheduler` in place.
   *
   * Async because the answer is no longer always nothing: a groove declares its
   * voices, so the next one may want files this device never fetched.
   */
  retarget(id: SourceId): Promise<Scheduler>
}

/**
 * Which store a source draws from. The click's is closed — the claves alone —
 * so crossing that seam rebuilds. Every groove draws the claves plus the kit
 * voices it declares, and a groove device's bank grows, so one groove device
 * can be pointed at any other groove.
 */
const storeFor = (id: SourceId) => (id === 'click' ? 'claves' : 'kit')

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
  /** Latched at Start rather than read live, so the answer cannot change
   *  inside a run — it decides where the groove's timeline begins. */
  countIn: () => boolean,
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

const urlsFor = (voice: KitVoiceName): readonly string[] =>
  KIT[voice].layers.flatMap((layer) => layer.urls)

/**
 * Grows `bank` in place to cover the voices it is asked for, and returns the
 * loader that does it. The decoded buffers are keyed by url and outlive a
 * retarget, so a groove whose voices are already in memory costs no request.
 *
 * The lead-in comes from the kit and is zero: `CLAVES_LEAD_IN_S` is a property
 * of that one file, and a kit that inherited it would play 8.3 ms early.
 */
const growKitBank = (context: AudioContext, bank: VoiceBank) => {
  const decoded = new Map<string, AudioBuffer>()

  return async (voices: readonly KitVoiceName[]) => {
    const wanted = [...new Set(voices.flatMap(urlsFor))]
    const missing = wanted.filter((url) => !decoded.has(url))

    await Promise.all(
      missing.map(async (url) => {
        decoded.set(url, await decode(context, url))
      }),
    )

    for (const voice of voices) {
      bank[voice] ??= {
        leadInSeconds: KIT[voice].leadInSeconds,
        chokes: KIT_CHOKES[voice],
        takeFor: (velocity, step) => {
          const buffer = decoded.get(sampleUrlFor(voice, velocity, step))
          if (!buffer) return null

          return { buffer, nominalVelocity: layerFor(voice, velocity).nominalVelocity }
        },
      }
    }
  }
}

/**
 * Every groove, by the id that names it. Typed over `SourceId` minus the click,
 * so a fourth source is a compile error here rather than a groove that silently
 * falls back to another one.
 */
const GROOVES: Record<Exclude<SourceId, 'click'>, GrooveDefinition> = {
  'bossa-nova': BOSSA_NOVA,
  rock: ROCK,
  shuffle: SHUFFLE,
  'straight-funk': STRAIGHT_FUNK,
}

/** What a source costs to load. The click declares none, and a groove declares
 *  its own — which is what keeps `rim` off every wire in the app. */
const voicesFor = (id: SourceId): readonly KitVoiceName[] =>
  id === 'click' ? [] : GROOVES[id].voices

/**
 * The click declines variations the same way it declines humanize: it is not
 * given them at all, so `CLICK_SOURCE` never learns what a bar is.
 *
 * The count-in is the same shape of refusal, and it is the whole guarantee that
 * no count can precede the click: the wrapper is never reached rather than
 * branching inside itself. Exported because nothing the transport does is
 * observably different for a wrapped click — it would count four claves and
 * then play four claves — so identity is the only assertion there is.
 */
export const sourceFor = (
  id: SourceId,
  variations: () => boolean,
  countIn: () => boolean,
): Source =>
  id === 'click'
    ? CLICK_SOURCE
    : createCountInSource(
        createGrooveSource(GROOVES[id], { variations }),
        countIn,
      )

/**
 * The transport plus its third state. `suspend` puts the click between running
 * and stopped — silent, but remembered — so a tapped tempo can bring it back
 * on its own rather than asking the player to press start a second time.
 */
export const buildRealAudio: AudioFactory = async (bpm, id, variations, countIn) => {
  const context = new AudioContext()

  try {
    // A groove's device decodes the claves too: the count-in borrows the
    // click's voice, and a voice the groove never uses is the only thing that
    // states the seam. `claves` gets no entry in `KIT_CHOKES` — it silences
    // nothing and nothing silences it.
    const bank: VoiceBank = await buildClavesBank(context)
    const load = growKitBank(context, bank)
    await load(voicesFor(id))

    const clock = createAudioClock(context, bank)

    const schedulerFor = (forId: SourceId) =>
      createScheduler({
        clock,
        bpm,
        source: sourceFor(forId, variations, countIn),
      })

    const audio: Audio = {
      context,
      clock,
      scheduler: schedulerFor(id),
      serves: (next) => storeFor(next) === storeFor(id),
      async retarget(next) {
        await load(voicesFor(next))
        audio.scheduler = schedulerFor(next)
        return audio.scheduler
      },
    }

    return audio
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
    /** What the checkbox says. Read only by `begin`, which is what keeps a
     *  flip mid-bar out of the run it would have shifted. */
    countIn: false,
    /**
     * What this run was started with. Written by `begin` and by nothing else,
     * so the getter the source reads per step cannot change its answer inside
     * one run — the count bar decides where the groove's timeline begins.
     */
    countInArmed: false,
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
      // Before `live.audio`, so a start landing mid-retarget waits for the
      // voices that retarget is fetching rather than sounding without them.
      if (live.building) return live.building
      if (live.audio) return Promise.resolve(live.audio)

      const settle = () => {
        live.building = null
        announceLoading(false)
      }

      announceLoading(true)

      const attempt = buildAudio(
        live.bpm,
        live.sourceId,
        () => live.fills,
        () => live.countInArmed,
      ).then(
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
     *
     * `armCountIn` is an argument rather than a field read here, which is what
     * keeps the three entry paths honest: only a press of Start counts a bar
     * in, and the tap-tempo return and the mid-run switch are already in time.
     */
    const begin = (next: number, armCountIn: boolean) => {
      live.countInArmed = armCountIn && live.countIn
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
        begin(next, true)
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
        begin(next, false)
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

        /**
         * A switch inside one store keeps the device. Its bank already holds
         * the claves and whatever the last groove wanted, so the next groove
         * pays only for the voices it adds — closing the context here would
         * refetch everything the page is already holding. Only the seam to the
         * click, which has a bank of its own, rebuilds.
         */
        const device = live.audio?.serves(next) ? live.audio : null
        if (!device) discard()

        live.sourceId = next
        const mine = live.generation

        if (device) {
          announceLoading(true)

          const settleRetarget = () => {
            if (live.generation !== mine) return
            live.building = null
            announceLoading(false)
          }

          live.building = device.retarget(next).then(
            (scheduler) => {
              settleRetarget()
              scheduler.setTempo(live.bpm)
              scheduler.onBeat((beat) => live.pending.push(beat))
              return device
            },
            (reason: unknown) => {
              settleRetarget()
              throw reason
            },
          )
        }

        if (wasRunning) {
          begin(live.bpm, false)
          return
        }

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

      /**
       * One field, like `setFills` — but read by `begin` rather than by the
       * source, so a change lands on the next run rather than on the next
       * queued step.
       */
      setCountIn(on: boolean) {
        live.countIn = on
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
