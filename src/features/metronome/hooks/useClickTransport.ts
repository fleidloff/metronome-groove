'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { Transport } from '../components/Metronome'
import { createAudioClock } from '../lib/click/audioClock'
import { CLAVES_SAMPLE_URL } from '../lib/click/claves'
import {
  createClickScheduler,
  LOOKAHEAD_S,
  type Beat,
  type ClickScheduler,
} from '../lib/click/scheduler'
import { clampTempo } from '../lib/click/tempo'

const TICK_MS = (LOOKAHEAD_S * 1000) / 4

export type Audio = {
  context: Pick<AudioContext, 'state' | 'resume' | 'close'>
  clock: { readonly currentTime: number; stopSounding(): void }
  scheduler: ClickScheduler
}

/**
 * How the audio is built. Injected so a test can drive this hook without a real
 * device — which is the only way the start/stop/unmount races below can be
 * asserted at all.
 */
export type AudioFactory = (bpm: number) => Promise<Audio>

/**
 * The transport plus its third state. `suspend` puts the click between running
 * and stopped — silent, but remembered — so a tapped tempo can bring it back
 * on its own rather than asking the player to press start a second time.
 */
const buildRealAudio: AudioFactory = async (bpm) => {
  const context = new AudioContext()
  const response = await fetch(CLAVES_SAMPLE_URL)
  if (!response.ok) {
    await context.close()
    throw new Error(`Could not load the click: ${response.status}`)
  }

  const buffer = await context.decodeAudioData(await response.arrayBuffer())
  const clock = createAudioClock(context, buffer)

  return { context, clock, scheduler: createClickScheduler({ clock, bpm }) }
}

/** Surfaces a load or decode failure. Replaced in tests; a UI surface for it
 *  is not in V2, so the console is where it goes for now. */
const reportFailure = (reason: unknown) => {
  console.error('The metronome could not start.', reason)
}

/**
 * Owns the lifetime of the audio device and the interval that drives the
 * scheduler. Nothing is built until `start`, because a browser refuses an
 * AudioContext before a user gesture — and because that keeps this hook inert
 * under jsdom.
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
    loading: null as Promise<Audio> | null,
    timer: null as ReturnType<typeof setInterval> | null,
    frame: null as number | null,
    pending: [] as Beat[],
    listeners: new Set<(beat: number) => void>(),
    bpm: 120,
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
      live.loading = null

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
      if (live.loading) return live.loading

      const attempt = buildAudio(live.bpm).then(receive(mine))
      live.loading = attempt
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
          live.loading = null
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

      setTempo(next: number) {
        live.bpm = clampTempo(next)
        live.audio?.scheduler.setTempo(live.bpm)
      },

      onBeat(listener: (beat: number) => void) {
        live.listeners.add(listener)
        return () => live.listeners.delete(listener)
      },
    }
  }, [buildAudio, onFailure])
}
