import { BEATS_PER_BAR, isQuarter, stepSeconds } from '@/lib/steps'
import type { Clock, Hit, Source } from './source'
import { clampTempo } from './tempo'

export const LOOKAHEAD_S = 0.1

export interface Beat {
  readonly index: number
  /** When the beat is *heard*: the scheduled time plus the sample's lead-in. */
  readonly time: number
}

export type BeatListener = (beat: Beat) => void

export interface SchedulerOptions {
  clock: Clock
  bpm: number
  source: Source
  lookaheadS?: number
}

export interface Scheduler {
  readonly isRunning: boolean
  start(): void
  stop(): void
  setTempo(bpm: number): void
  /** The caller owns the interval this is called on; this module holds no timer. */
  tick(): void
  onBeat(listener: BeatListener): () => void
}

export function createScheduler({
  clock,
  bpm,
  source,
  lookaheadS = LOOKAHEAD_S,
}: SchedulerOptions): Scheduler {
  const listeners = new Set<BeatListener>()
  const stepsPerBeat = source.steps / BEATS_PER_BAR

  let seconds = stepSeconds(clampTempo(bpm), source.steps)
  let running = false
  let step = 0
  let queuedAny = false

  let anchorTime = 0
  let anchorStep = 0

  const sound = (at: number) => anchorTime + (at - anchorStep) * seconds

  const maxLeadIn = (hits: readonly Hit[]) =>
    hits.reduce((most, hit) => Math.max(most, clock.leadInFor(hit.voice)), 0)

  const announce = (beats: Beat[]) => {
    for (const beat of beats) {
      for (const listener of listeners) {
        try {
          listener(beat)
        } catch {
          // The audio clock neither waits on a subscriber nor fails with one.
        }
      }
    }
  }

  // A backgrounded tab throttles the interval driving `tick`, so steps fall due
  // in bulk; firing them all would burst.
  const dropOvertakenSteps = (now: number) => {
    if (!queuedAny) return

    const grace = seconds / 2
    const overtakenBy = now - grace - (sound(step) - maxLeadIn(source.hitsAt(step)))
    if (overtakenBy <= 0) return

    step += Math.ceil(overtakenBy / seconds)
  }

  const queueWindow = (): Beat[] => {
    const now = clock.currentTime
    const beats: Beat[] = []

    dropOvertakenSteps(now)

    while (sound(step) < now + lookaheadS) {
      const hits = source.hitsAt(step)
      const grid = sound(step)
      let heardAt = grid

      for (const hit of hits) {
        const leadIn = clock.leadInFor(hit.voice)
        const target = grid + (source.displace?.(hit, step, seconds) ?? 0) - leadIn
        const at = Math.max(target, now)

        clock.schedule(at, hit, {
          step: source.takeStep?.(step) ?? step,
          gain: source.trim?.(hit, step) ?? 1,
        })

        // Held back to `now`, so the dot waits for the sound, not for the grid.
        if (at > target) heardAt = Math.max(heardAt, at + leadIn)
      }

      if (isQuarter(step, source.steps)) {
        beats.push({
          index: (step / stepsPerBeat) % BEATS_PER_BAR,
          time: heardAt,
        })
      }

      step += 1
      queuedAny = true
    }

    return beats
  }

  return {
    get isRunning() {
      return running
    },

    start() {
      if (running) return
      running = true
      step = 0
      queuedAny = false
      anchorStep = 0
      // The voice needing the most silence starts exactly now; the rest wait.
      anchorTime = clock.currentTime + maxLeadIn(source.hitsAt(0))
      announce(queueWindow())
    },

    stop() {
      running = false
      step = 0
      queuedAny = false
    },

    setTempo(nextBpm: number) {
      const next = stepSeconds(clampTempo(nextBpm), source.steps)
      if (next === seconds) return
      if (running && queuedAny) {
        anchorTime = sound(step) - seconds + next
        anchorStep = step
      }
      seconds = next
    },

    tick() {
      if (!running) return
      announce(queueWindow())
    },

    onBeat(listener: BeatListener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
