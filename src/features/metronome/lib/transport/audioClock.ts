import { gainFor, type Velocity } from '@/lib/velocity'
import type { Clock, Hit, Placement, VoiceName } from './source'

/**
 * How long a choked voice takes to reach silence. Short enough to read as the
 * hat closing rather than as a fade, long enough not to click.
 */
export const CHOKE_S = 0.01

/** One recording, and the velocity it was played at. */
export interface Take {
  readonly buffer: AudioBuffer
  readonly nominalVelocity: Velocity
}

export interface VoiceSound {
  /** Silence before the attack. The claves' is 8.3 ms; every kit voice's is
   *  zero. A property of the recording, which is why it lives beside it. */
  readonly leadInSeconds: number
  /**
   * Which recording sounds: the velocity layer, and the round-robin take at
   * this absolute step. Null when the voice has nothing loaded yet.
   */
  takeFor(velocity: Velocity, step: number): Take | null
  /**
   * Voices this one silences when it sounds. One hi-hat has one state, so a
   * closed hat cuts a ringing open hat instead of letting the two overlap.
   */
  readonly chokes?: readonly VoiceName[]
}

export type VoiceBank = Partial<Record<VoiceName, VoiceSound>>

interface Ringing {
  readonly source: AudioBufferSourceNode
  readonly amp: GainNode
  readonly gain: number
  readonly startedAt: number
}

/**
 * A Clock backed by a real AudioContext. The only place in the feature that
 * touches the audio device — a component may use it, never build it.
 */
export function createAudioClock(
  context: AudioContext,
  bank: VoiceBank,
): Clock & { stopSounding(): void } {
  const ringing = new Map<VoiceName, Set<Ringing>>()

  const soundingOf = (voice: VoiceName) => {
    const existing = ringing.get(voice)
    if (existing) return existing

    const fresh = new Set<Ringing>()
    ringing.set(voice, fresh)
    return fresh
  }

  /**
   * Ramps every still-ringing note of `voice` to zero at `at`, rather than
   * leaving it to decay. An open hat rings about a second and a bar at 100 bpm
   * is 2.4 s, so without this the open hat on step 14 sounds straight through
   * the next downbeat.
   */
  const choke = (voice: VoiceName, at: number) => {
    const sounding = ringing.get(voice)
    if (!sounding) return

    for (const note of sounding) {
      if (note.startedAt >= at) continue

      try {
        note.amp.gain.cancelScheduledValues(at)
        note.amp.gain.setValueAtTime(note.gain, at)
        note.amp.gain.linearRampToValueAtTime(0, at + CHOKE_S)
        note.source.stop(at + CHOKE_S)
      } catch {
        // Already stopped or already ended; there is nothing left to cut.
      }
    }
  }

  return {
    get currentTime() {
      return context.currentTime
    },

    schedule(at: number, hit: Hit, placement: Placement) {
      const voice = bank[hit.voice]
      if (!voice) return

      const take = voice.takeFor(hit.velocity, placement.step)
      if (!take) return

      const gain = gainFor(hit.velocity, take.nominalVelocity) * placement.gain
      if (gain <= 0) return

      const startAt = Math.max(at, context.currentTime)

      for (const choked of voice.chokes ?? []) choke(choked, startAt)

      const source = context.createBufferSource()
      source.buffer = take.buffer

      const amp = context.createGain()
      amp.gain.value = gain

      source.connect(amp).connect(context.destination)

      const note: Ringing = { source, amp, gain, startedAt: startAt }
      const sounding = soundingOf(hit.voice)
      source.onended = () => sounding.delete(note)
      sounding.add(note)
      source.start(startAt)
    },

    leadInFor(voice: VoiceName) {
      return bank[voice]?.leadInSeconds ?? 0
    },

    /**
     * The scheduler cannot un-queue: `Clock` has no cancel, so stopping only
     * stops queueing and one already-queued hit can still be pending.
     * Silencing it is the audio node's job, which is here.
     */
    stopSounding() {
      for (const sounding of ringing.values()) {
        for (const note of sounding) {
          try {
            note.source.stop()
          } catch {
            // Already ended; nothing to stop.
          }
        }
        sounding.clear()
      }
      ringing.clear()
    },
  }
}
