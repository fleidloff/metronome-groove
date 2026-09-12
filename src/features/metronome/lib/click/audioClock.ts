import { gainFor, type Velocity } from '@/lib/velocity'
import { CLAVES_NOMINAL_VELOCITY } from './claves'
import type { Clock } from './clock'

/**
 * A Clock backed by a real AudioContext. The only place in the feature that
 * touches the audio device — a component may use it, never build it.
 */
export function createAudioClock(
  context: AudioContext,
  buffer: AudioBuffer,
  nominalVelocity: Velocity = CLAVES_NOMINAL_VELOCITY,
): Clock & { stopSounding(): void } {
  const sounding = new Set<AudioBufferSourceNode>()

  return {
    get currentTime() {
      return context.currentTime
    },

    schedule(at: number, velocity: Velocity) {
      const gain = gainFor(velocity, nominalVelocity)
      if (gain <= 0) return

      const source = context.createBufferSource()
      source.buffer = buffer

      const amp = context.createGain()
      amp.gain.value = gain

      source.connect(amp).connect(context.destination)
      source.onended = () => sounding.delete(source)
      sounding.add(source)
      source.start(Math.max(at, context.currentTime))
    },

    /**
     * The scheduler cannot un-queue: `Clock` has no cancel, so stopping only
     * stops queueing and one already-queued beat can still be pending.                                      
     * Silencing it is the audio node's job, which is here.
     */
    stopSounding() {
      for (const source of sounding) {
        try {
          source.stop()
        } catch {
          // Already ended; nothing to stop.
        }
      }
      sounding.clear()
    },
  }
}
