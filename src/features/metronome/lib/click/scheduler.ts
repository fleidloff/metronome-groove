import type { Velocity } from '@/lib/velocity'
import { CLAVES_LEAD_IN_S } from './claves'
import type { Clock } from './clock'
import { CLICK_PATTERN } from './pattern'
import { clampTempo, secondsPerBeat } from './tempo'

/** How far ahead of the clock beats are queued. The driver has to tick well
 *  inside this — a quarter of it is the usual figure. */
export const LOOKAHEAD_S = 0.1

/** What a beat is to the UI: where it sits in the bar, and the clock time at
 *  which it is *heard* — which is the scheduled time plus the sample's silence. */
export interface Beat {
  readonly index: number
  readonly time: number
}

export type BeatListener = (beat: Beat) => void

export interface ClickSchedulerOptions {
  clock: Clock
  bpm: number
  pattern?: readonly Velocity[]
  leadInS?: number
  lookaheadS?: number
}

export interface ClickScheduler {
  readonly isRunning: boolean
  start(): void
  stop(): void
  setTempo(bpm: number): void
  /** Queues every beat now inside the lookahead window. The caller owns the
   *  interval it is called on; this module never holds a timer. */
  tick(): void
  onBeat(listener: BeatListener): () => void
}

export function createClickScheduler({
  clock,
  bpm,
  pattern = CLICK_PATTERN,
  leadInS = CLAVES_LEAD_IN_S,
  lookaheadS = LOOKAHEAD_S,
}: ClickSchedulerOptions): ClickScheduler {
  const listeners = new Set<BeatListener>()

  let beatSeconds = secondsPerBeat(clampTempo(bpm))
  let running = false
  let cursor = 0
  let nextBeat = 0
  let queuedAny = false

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
   * A beat the clock has already overtaken is dropped, not fired late.
   *
   * A backgrounded tab throttles the interval that drives `tick`, so seconds
   * can pass between calls. Without this, every beat that fell due in the gap
   * clamps to `now` and they all sound at once — a burst on returning to the
   * tab, which is worse than the silence it is trying to make up for.
   *
   * Half a beat is the grace: later than that and the beat has been overtaken.
   * The skip is a whole number of beats, so the grid phase is preserved and
   * `cursor` advances with it — the bar carries on where it would have been
   * rather than restarting.
   */
  const dropOvertakenBeats = (now: number) => {
    if (!queuedAny) return

    const grace = beatSeconds / 2
    const overtakenBy = now - grace - (nextBeat - leadInS)
    if (overtakenBy <= 0) return

    const skipped = Math.ceil(overtakenBy / beatSeconds)
    cursor += skipped
    nextBeat += skipped * beatSeconds
  }

  const queueWindow = (): Beat[] => {
    const now = clock.currentTime
    const beats: Beat[] = []

    dropOvertakenBeats(now)

    while (nextBeat < now + lookaheadS) {
      const target = nextBeat - leadInS
      const at = Math.max(target, now)
      const index = cursor % pattern.length

      clock.schedule(at, pattern[index])
      beats.push({ index, time: at > target ? at + leadInS : nextBeat })

      cursor += 1
      queuedAny = true
      nextBeat += beatSeconds
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
      cursor = 0
      queuedAny = false
      nextBeat = clock.currentTime + leadInS
      announce(queueWindow())
    },

    stop() {
      running = false
      cursor = 0
      queuedAny = false
    },

    setTempo(nextBpm: number) {
      const next = secondsPerBeat(clampTempo(nextBpm))
      if (next === beatSeconds) return
      if (running && queuedAny) nextBeat = nextBeat - beatSeconds + next
      beatSeconds = next
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
