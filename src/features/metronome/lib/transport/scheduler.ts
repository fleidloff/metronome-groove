import { BEATS_PER_BAR, isQuarter, stepSeconds } from '@/lib/steps'
import type { Clock, Hit, Source } from './source'
import { clampTempo } from './tempo'

/** How far ahead of the clock steps are queued. The driver has to tick well
 *  inside this — a quarter of it is the usual figure. */
export const LOOKAHEAD_S = 0.1

/** What a beat is to the UI: where it sits in the bar, and the clock time at
 *  which it is *heard* — which is the scheduled time plus the sample's silence.
 *  Only a step that lands on a quarter produces one, so a sixteen-step groove
 *  still lights four dots. */
export interface Beat {
  readonly index: number
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
  /** Queues every step now inside the lookahead window. The caller owns the
   *  interval it is called on; this module never holds a timer. */
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

  /**
   * The anchor a step's time is measured from, and the step it belongs to.
   * A tempo change moves both; nothing else does.
   */
  let anchorTime = 0
  let anchorStep = 0

  /**
   * Absolute, never incremental. `sound` is the anchor plus an exact multiple
   * of the step, so the hundred-thousandth step sits on the grid as squarely
   * as the first. Adding one step to the last time instead would accumulate
   * the rounding error of every step before it, which is the drift the user
   * ruled out: the beat has to keep coming back together.
   */
  const sound = (at: number) => anchorTime + (at - anchorStep) * seconds

  const maxLeadIn = (hits: readonly Hit[]) =>
    hits.reduce((most, hit) => Math.max(most, clock.leadInFor(hit.voice)), 0)

  const announce = (beats: Beat[]) => {
    for (const beat of beats) {
      for (const listener of listeners) {
        try {
          listener(beat)
        } catch {
          // The audio clock does not wait on a subscriber, and does not fail
          // with one.
        }
      }
    }
  }

  /**
   * A step the clock has already overtaken is dropped, not fired late.
   *
   * A backgrounded tab throttles the interval that drives `tick`, so seconds
   * can pass between calls. Without this, every step that fell due in the gap
   * clamps to `now` and they all sound at once — a burst on returning to the
   * tab, which is worse than the silence it is trying to make up for.
   *
   * Half a step is the grace: later than that and the step has been overtaken.
   * The skip is a whole number of steps, so the grid phase is preserved and
   * the bar carries on where it would have been rather than restarting.
   */
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

        // A hit held back to `now` is heard later than the grid says, and the
        // dot has to wait for the sound rather than for the grid.
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
      // The voice that needs the most silence is the one that starts exactly
      // now; every other voice on that step waits for it.
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
