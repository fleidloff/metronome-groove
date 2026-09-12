import { DYNAMIC_RANGE_DB } from '@/lib/velocity'
import type { Humanize, VoiceName } from '../transport/source'

export function timingBound(humanize: Humanize, stepSeconds: number): number {
  return Math.min(humanize.timingFractionOfStep * stepSeconds, humanize.timingCeilingMs / 1000)
}

export function timingOffset(
  humanize: Humanize,
  seed: number,
  voice: VoiceName,
  step: number,
  stepSeconds: number,
): number {
  // ADR 0007 rule 2
  if (humanize.exactVoices.includes(voice)) return 0

  return signedUnit(seed, voice, step, 0) * timingBound(humanize, stepSeconds)
}

export function gainTrim(
  humanize: Humanize,
  seed: number,
  voice: VoiceName,
  step: number,
): number {
  const displacement = signedUnit(seed, voice, step, 1) * humanize.velocityJitter

  return 10 ** ((DYNAMIC_RANGE_DB * displacement) / 20)
}

export function roundRobinIndex(step: number, count: number): number {
  return ((step % count) + count) % count
}

function signedUnit(seed: number, voice: VoiceName, step: number, stream: number): number {
  return (hash(seed, voice, step, stream) / 0x100000000) * 2 - 1
}

function hash(seed: number, voice: VoiceName, step: number, stream: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b)

  for (let i = 0; i < voice.length; i += 1) {
    h = Math.imul(h ^ voice.charCodeAt(i), 0xc2b2ae35)
  }

  h = Math.imul(h ^ step, 0x27d4eb2f)
  h = Math.imul(h ^ stream, 0x165667b1)
  h ^= h >>> 15
  h = Math.imul(h, 0x2545f491)
  h ^= h >>> 13

  return h >>> 0
}
