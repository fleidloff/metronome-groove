import type { Velocity } from '@/lib/velocity'

import type { VoiceName } from '../transport/source'

/** The claves is the click's voice and belongs to no kit. */
export type KitVoiceName = Exclude<VoiceName, 'claves'>

export interface SampleLayer {
  /** The source pack's layer name, kept so a file on disk stays traceable. */
  readonly layer: string
  /** Measured level of the layer's takes, the basis of `nominalVelocity`. */
  readonly levelDbfs: number
  readonly nominalVelocity: Velocity
  /** Highest velocity this layer covers. The next layer starts just above it. */
  readonly upperVelocity: Velocity
  /** Round-robin takes, indexed on the absolute step. */
  readonly urls: readonly string[]
}

export interface KitVoice {
  /**
   * Silence before the attack. Zero for every kit voice, measured at ≤ 0.36 ms
   * across all 40 files — the detector's own floor. `CLAVES_LEAD_IN_S` is 8.3 ms
   * and belongs to that one file; a kit that inherited it would play early.
   */
  readonly leadInSeconds: number
  readonly layers: readonly SampleLayer[]
}

/**
 * Nominal velocities are re-derived from measured level, not copied from the
 * sibling pack. That pack's gain law is linear — `velocity / nominalVelocity` —
 * and this repo's is decibel-linear over 40 dB. Its numbers under this curve put
 * an 8 dB cliff at the snare's layer boundary, where raising velocity by 0.0001
 * makes the snare quieter.
 *
 *   vRef_L   = vRef_top + (level_L − level_top) / 40
 *   boundary = (vRef_L + vRef_L+1) / 2
 *
 * Equal nominal spacing makes the two layers render the same level at their
 * shared boundary; the midpoint is where each layer is least stretched.
 */
export const KIT: Readonly<Record<KitVoiceName, KitVoice>> = {
  kick: {
    leadInSeconds: 0,
    layers: [
      {
        layer: 'v80',
        levelDbfs: -20.77,
        nominalVelocity: 0.886,
        upperVelocity: 1,
        urls: [
          '/samples/kick_v80_rr1.flac',
          '/samples/kick_v80_rr2.flac',
          '/samples/kick_v80_rr3.flac',
        ],
      },
    ],
  },

  snare: {
    leadInSeconds: 0,
    layers: [
      {
        layer: 'v44',
        levelDbfs: -25.97,
        nominalVelocity: 0.743,
        upperVelocity: 0.815,
        urls: [
          '/samples/snare_v44_rr1.flac',
          '/samples/snare_v44_rr2.flac',
          '/samples/snare_v44_rr3.flac',
        ],
      },
      {
        layer: 'v127',
        levelDbfs: -20.23,
        nominalVelocity: 0.886,
        upperVelocity: 1,
        urls: [
          '/samples/snare_v127_rr1.flac',
          '/samples/snare_v127_rr2.flac',
          '/samples/snare_v127_rr3.flac',
        ],
      },
    ],
  },

  hatClosed: {
    leadInSeconds: 0,
    layers: [
      {
        layer: 'v44',
        levelDbfs: -44.37,
        nominalVelocity: 0.554,
        upperVelocity: 0.624,
        urls: [
          '/samples/hatClosed_v44_rr1.flac',
          '/samples/hatClosed_v44_rr2.flac',
          '/samples/hatClosed_v44_rr3.flac',
        ],
      },
      {
        layer: 'v71',
        levelDbfs: -38.8,
        nominalVelocity: 0.694,
        upperVelocity: 0.744,
        urls: [
          '/samples/hatClosed_v71_rr1.flac',
          '/samples/hatClosed_v71_rr2.flac',
          '/samples/hatClosed_v71_rr3.flac',
        ],
      },
      {
        layer: 'v98',
        levelDbfs: -34.77,
        nominalVelocity: 0.794,
        upperVelocity: 0.84,
        urls: [
          '/samples/hatClosed_v98_rr1.flac',
          '/samples/hatClosed_v98_rr2.flac',
          '/samples/hatClosed_v98_rr3.flac',
        ],
      },
      {
        layer: 'v127',
        levelDbfs: -31.1,
        nominalVelocity: 0.886,
        upperVelocity: 1,
        urls: [
          '/samples/hatClosed_v127_rr1.flac',
          '/samples/hatClosed_v127_rr2.flac',
          '/samples/hatClosed_v127_rr3.flac',
        ],
      },
    ],
  },

  hatOpen: {
    leadInSeconds: 0,
    layers: [
      {
        layer: 'v98',
        levelDbfs: -24.03,
        nominalVelocity: 0.886,
        upperVelocity: 1,
        urls: ['/samples/hatOpen_v98_rr1.flac'],
      },
    ],
  },
}

export const KIT_VOICES: readonly KitVoiceName[] = ['kick', 'snare', 'hatClosed', 'hatOpen']

/** Every file the kit needs, in a stable order. */
export const KIT_SAMPLE_URLS: readonly string[] = KIT_VOICES.flatMap((voice) =>
  KIT[voice].layers.flatMap((layer) => layer.urls),
)

export function layerFor(voice: KitVoiceName, velocity: Velocity): SampleLayer {
  const { layers } = KIT[voice]
  return layers.find((layer) => velocity <= layer.upperVelocity) ?? layers[layers.length - 1]
}

/**
 * The take that sounds. Indexing on the absolute step rather than the step
 * within the bar gives a three-take voice a period of lcm(3, 16) = 48 steps,
 * so a one-bar loop is not bit-identical every bar.
 */
export function sampleUrlFor(
  voice: KitVoiceName,
  velocity: Velocity,
  absoluteStep: number,
): string {
  const { urls } = layerFor(voice, velocity)
  return urls[((absoluteStep % urls.length) + urls.length) % urls.length]
}
