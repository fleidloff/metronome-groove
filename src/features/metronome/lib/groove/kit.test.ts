import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { gainFor } from '@/lib/velocity'

import {
  KIT,
  KIT_SAMPLE_URLS,
  KIT_VOICES,
  layerFor,
  sampleUrlFor,
  type KitVoiceName,
} from './kit'

const PUBLIC_DIR = join(process.cwd(), 'public')

const renderedDbfs = (levelDbfs: number, velocity: number, nominal: number): number => {
  const gain = gainFor(velocity, nominal)
  return gain <= 0 ? Number.NEGATIVE_INFINITY : levelDbfs + 20 * Math.log10(gain)
}

const sweep = (voice: KitVoiceName): number[] =>
  Array.from({ length: 1001 }, (_, i) => {
    const velocity = i / 1000
    const layer = layerFor(voice, velocity)
    return renderedDbfs(layer.levelDbfs, velocity, layer.nominalVelocity)
  })

describe('the kit manifest', () => {
  it('ships 28 distinct files', () => {
    expect(KIT_SAMPLE_URLS).toHaveLength(28)
    expect(new Set(KIT_SAMPLE_URLS).size).toBe(28)
  })

  it('points only at files that exist', () => {
    for (const url of KIT_SAMPLE_URLS) {
      expect(existsSync(join(PUBLIC_DIR, url)), url).toBe(true)
    }
  })

  it('gives hatClosed four layers, snare two, kick one and hatOpen one', () => {
    expect(KIT.hatClosed.layers.map((l) => l.urls.length)).toEqual([3, 3, 3, 3])
    expect(KIT.snare.layers.map((l) => l.urls.length)).toEqual([3, 3])
    expect(KIT.kick.layers.map((l) => l.urls.length)).toEqual([3])
    expect(KIT.hatOpen.layers.map((l) => l.urls.length)).toEqual([1])
  })

  it('gives rim two layers of three takes each', () => {
    expect(KIT.rim.layers.map((l) => l.layer)).toEqual(['v74', 'v127'])
    expect(KIT.rim.layers.map((l) => l.urls.length)).toEqual([3, 3])
  })

  it('keeps the clave inside v74 up to 0.843', () => {
    expect(KIT.rim.layers[0].upperVelocity).toBe(0.843)
    expect(layerFor('rim', 0.8).layer).toBe('v74')
    expect(layerFor('rim', 0.843).layer).toBe('v74')
    expect(layerFor('rim', 0.844).layer).toBe('v127')
  })

  it('carries the recalibrated nominals and boundaries', () => {
    const table = KIT_VOICES.flatMap((voice) =>
      KIT[voice].layers.map((l) => [voice, l.layer, l.nominalVelocity, l.upperVelocity]),
    )
    expect(table).toEqual([
      ['kick', 'v80', 0.886, 1],
      ['snare', 'v44', 0.743, 0.815],
      ['snare', 'v127', 0.886, 1],
      ['hatClosed', 'v44', 0.554, 0.624],
      ['hatClosed', 'v71', 0.694, 0.744],
      ['hatClosed', 'v98', 0.794, 0.84],
      ['hatClosed', 'v127', 0.886, 1],
      ['hatOpen', 'v98', 0.886, 1],
      ['rim', 'v74', 0.8, 0.843],
      ['rim', 'v127', 0.886, 1],
    ])
  })

  it('puts every boundary at the midpoint of its two adjacent nominals', () => {
    for (const voice of KIT_VOICES) {
      const { layers } = KIT[voice]
      layers.slice(0, -1).forEach((layer, i) => {
        const midpoint = (layer.nominalVelocity + layers[i + 1].nominalVelocity) / 2
        expect(layer.upperVelocity, `${voice} ${layer.layer}`).toBeCloseTo(midpoint, 3)
      })
      expect(layers[layers.length - 1].upperVelocity).toBe(1)
    }
  })

  it('gives every kit voice a lead-in of zero', () => {
    for (const voice of KIT_VOICES) {
      expect(KIT[voice].leadInSeconds, voice).toBe(0)
    }
  })
})

describe('the velocity sweep', () => {
  it('covers every kit voice, rim included', () => {
    expect(KIT_VOICES).toContain('rim')
  })

  it.each(KIT_VOICES)('renders %s monotonically with no step above 0.5 dB', (voice) => {
    const levels = sweep(voice)

    expect(levels[0]).toBe(Number.NEGATIVE_INFINITY)

    let largestStep = 0
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i], `velocity ${i / 1000}`).toBeGreaterThanOrEqual(levels[i - 1])
      if (Number.isFinite(levels[i - 1])) {
        largestStep = Math.max(largestStep, levels[i] - levels[i - 1])
      }
    }

    expect(largestStep).toBeLessThan(0.5)
  })

  it('crosses a layer boundary without a cliff', () => {
    const boundary = KIT.snare.layers[0].upperVelocity

    expect(layerFor('snare', boundary).layer).toBe('v44')
    expect(layerFor('snare', boundary + 0.001).layer).toBe('v127')

    const below = renderedDbfs(-25.97, boundary, 0.743)
    const above = renderedDbfs(-20.23, boundary + 0.001, 0.886)
    expect(above - below).toBeGreaterThan(0)
    expect(above - below).toBeLessThan(0.5)
  })
})

describe('round-robin selection', () => {
  it('indexes on the absolute step, so three takes repeat every 48 steps', () => {
    const bar = (offset: number) =>
      Array.from({ length: 16 }, (_, step) => sampleUrlFor('hatClosed', 0.9, offset + step))

    expect(bar(16)).not.toEqual(bar(0))
    expect(bar(32)).not.toEqual(bar(0))
    expect(bar(48)).toEqual(bar(0))
  })

  it('returns the one take when a layer has no alternates', () => {
    expect(sampleUrlFor('hatOpen', 0.88, 0)).toBe('/samples/hatOpen_v98_rr1.flac')
    expect(sampleUrlFor('hatOpen', 0.88, 7)).toBe('/samples/hatOpen_v98_rr1.flac')
  })
})
