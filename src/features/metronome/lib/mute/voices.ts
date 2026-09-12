import type { GrooveDefinition } from '../groove/grooves/definition'
import type { KitVoiceName } from '../groove/kit'
import type { Hit, VoiceName } from '../transport/source'

/** specs/15-per-voice-mute */

export type MutableVoice = 'kick' | 'snare' | 'hat'

/** The row's order, and the only order it is ever rendered in. */
export const MUTABLE_VOICES: readonly MutableVoice[] = ['kick', 'snare', 'hat']

/**
 * `claves` is in no entry, so the click and the count-in are outside muting by
 * construction rather than by a branch.
 */
export const KIT_VOICES_OF: Readonly<Record<MutableVoice, readonly KitVoiceName[]>> = {
  kick: ['kick'],
  snare: ['snare', 'rim'],
  hat: ['hatClosed', 'hatOpen'],
}

export type MuteSet = readonly MutableVoice[]

export const NO_MUTES: MuteSet = []

const covers = (mutable: MutableVoice, voice: VoiceName): boolean =>
  (KIT_VOICES_OF[mutable] as readonly VoiceName[]).includes(voice)

const mutableVoiceCovering = (voice: VoiceName): MutableVoice | undefined =>
  MUTABLE_VOICES.find((mutable) => covers(mutable, voice))

const playedVoices = (groove: GrooveDefinition): readonly VoiceName[] => [
  ...new Set(
    [...groove.ordinary.flat(), ...groove.light, ...groove.fill].map(
      ({ voice }) => voice,
    ),
  ),
]

/** Which toggles a groove shows — the mutable voices any of whose kit voices
 *  the definition declares. */
export function mutableVoicesOf(groove: GrooveDefinition): readonly MutableVoice[] {
  return MUTABLE_VOICES.filter((mutable) =>
    KIT_VOICES_OF[mutable].some((kitVoice) => groove.voices.includes(kitVoice)),
  )
}

export function isMuted(mutes: MuteSet, voice: VoiceName): boolean {
  return mutes.some((mutable) => covers(mutable, voice))
}

const soundsAnything = (groove: GrooveDefinition, mutes: MuteSet): boolean => {
  const offered = mutableVoicesOf(groove).filter((mutable) => !mutes.includes(mutable))

  return playedVoices(groove).some((voice) => {
    const mutable = mutableVoiceCovering(voice)
    return mutable === undefined || offered.includes(mutable)
  })
}

/** False when muting `voice` would leave the groove silent. Drives `disabled`. */
export function canMute(
  groove: GrooveDefinition,
  mutes: MuteSet,
  voice: MutableVoice,
): boolean {
  return soundsAnything(groove, [...mutes, voice])
}

/** The filter. Applied to a rendered step, never as a choice of bar. */
export function audibleHits(hits: readonly Hit[], mutes: MuteSet): readonly Hit[] {
  if (mutes.length === 0) return hits

  return hits.filter(({ voice }) => !isMuted(mutes, voice))
}
