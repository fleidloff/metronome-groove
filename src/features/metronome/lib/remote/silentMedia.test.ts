import { describe, expect, it } from 'vitest'
import { SILENT_WAV, SILENT_SECONDS, createSilentMedia } from './silentMedia'

/** Reads the RIFF header back, so the constants are checked against the bytes. */
function readWav(dataUri: string) {
  const base64 = dataUri.slice(dataUri.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const view = new DataView(bytes.buffer)

  const tag = (at: number) =>
    String.fromCharCode(...bytes.slice(at, at + 4))

  return {
    riff: tag(0),
    wave: tag(8),
    channels: view.getUint16(22, true),
    rate: view.getUint32(24, true),
    bits: view.getUint16(34, true),
    frames: view.getUint32(40, true) / 2,
    peak: (() => {
      let peak = 0
      const frames = view.getUint32(40, true) / 2
      for (let frame = 0; frame < frames; frame += 1) {
        peak = Math.max(peak, Math.abs(view.getInt16(44 + frame * 2, true)))
      }
      return peak
    })(),
  }
}

describe('the silent media', () => {
  const wav = readWav(SILENT_WAV)

  it('is a real WAV a browser will accept', () => {
    expect(SILENT_WAV.startsWith('data:audio/wav;base64,')).toBe(true)
    expect(wav.riff).toBe('RIFF')
    expect(wav.wave).toBe('WAVE')
    expect(wav.channels).toBe(1)
    expect(wav.bits).toBe(16)
  })

  it('is longer than five seconds, or no media notification appears', () => {
    expect(wav.frames / wav.rate).toBeCloseTo(SILENT_SECONDS, 3)
    expect(SILENT_SECONDS).toBeGreaterThan(5)
  })

  it('is digital silence, which the probe showed is enough on Chrome', () => {
    // Not near-silence: the probe established that Chrome accepts zeros, and
    // anything audible is what ruled Firefox out. Peak must be exactly 0.
    expect(wav.peak).toBe(0)
  })

  it('makes an element that loops and is not muted', () => {
    const element = createSilentMedia()
    expect(element).toBeDefined()
    if (!element) return

    expect(element.loop).toBe(true)
    expect(element.muted).toBe(false)
    expect(element.volume).toBe(1)
    expect(element.src).toBe(SILENT_WAV)
  })
})
