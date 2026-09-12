import { gainFor, type Velocity } from '@/lib/velocity'
import type { Clock, Hit, Placement, VoiceName } from './source'

/** A hard stop clicks, so a choke ramps over this instead. */
export const CHOKE_S = 0.01

export interface Take {
  readonly buffer: AudioBuffer
  readonly nominalVelocity: Velocity
}

export interface VoiceSound {
  /** Silence before the attack: the claves' is 8.3 ms, every kit voice's zero. */
  readonly leadInSeconds: number
  /** Null while the voice has nothing loaded yet. */
  takeFor(velocity: Velocity, step: number): Take | null
  readonly chokes?: readonly VoiceName[]
}

export type VoiceBank = Partial<Record<VoiceName, VoiceSound>>

interface Ringing {
  readonly source: AudioBufferSourceNode
  readonly amp: GainNode
  readonly gain: number
  readonly startedAt: number
}

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
        // `stop` throws on a node that has already ended.
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

    /** `Clock` has no cancel, so a hit already queued on the device outlives a
     *  stopped scheduler and has to be silenced here. */
    stopSounding() {
      for (const sounding of ringing.values()) {
        for (const note of sounding) {
          try {
            note.source.stop()
          } catch {
            // `stop` throws on a node that has already ended.
          }
        }
        sounding.clear()
      }
      ringing.clear()
    },
  }
}
