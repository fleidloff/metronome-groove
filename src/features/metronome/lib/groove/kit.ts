import type { Velocity } from '@/lib/velocity'

import type { VoiceName } from '../transport/source'

export type KitVoiceName = Exclude<VoiceName, 'claves'>

export interface SampleLayer {
  readonly layer: string
  readonly levelDbfs: number
  readonly nominalVelocity: Velocity
  readonly upperVelocity: Velocity
  readonly urls: readonly string[]
}

export interface KitVoice {
  readonly leadInSeconds: number
  readonly layers: readonly SampleLayer[]
}

/** ADR 0008 */
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

  rim: {
    leadInSeconds: 0,
    layers: [
      {
        layer: 'v74',
        levelDbfs: -28.85,
        nominalVelocity: 0.8,
        upperVelocity: 0.843,
        urls: [
          '/samples/rim_v74_rr1.flac',
          '/samples/rim_v74_rr2.flac',
          '/samples/rim_v74_rr3.flac',
        ],
      },
      {
        layer: 'v127',
        levelDbfs: -25.41,
        nominalVelocity: 0.886,
        upperVelocity: 1,
        urls: [
          '/samples/rim_v127_rr1.flac',
          '/samples/rim_v127_rr2.flac',
          '/samples/rim_v127_rr3.flac',
        ],
      },
    ],
  },
}

export const KIT_VOICES: readonly KitVoiceName[] = [
  'kick',
  'snare',
  'hatClosed',
  'hatOpen',
  'rim',
]

export const KIT_SAMPLE_URLS: readonly string[] = KIT_VOICES.flatMap((voice) =>
  KIT[voice].layers.flatMap((layer) => layer.urls),
)

export function layerFor(voice: KitVoiceName, velocity: Velocity): SampleLayer {
  const { layers } = KIT[voice]
  return layers.find((layer) => velocity <= layer.upperVelocity) ?? layers[layers.length - 1]
}

export function sampleUrlFor(
  voice: KitVoiceName,
  velocity: Velocity,
  absoluteStep: number,
): string {
  const { urls } = layerFor(voice, velocity)
  return urls[((absoluteStep % urls.length) + urls.length) % urls.length]
}
