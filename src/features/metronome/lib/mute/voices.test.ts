import { describe, expect, it } from 'vitest'
import type { Hit, SourceId, VoiceName } from '../transport/source'
import { BARS_PER_CYCLE, hitsAt } from '../groove/cycle'
import { BOSSA_NOVA } from '../groove/grooves/bossaNova'
import { type GrooveDefinition, VOICE_ORDER } from '../groove/grooves/definition'
import { ROCK } from '../groove/grooves/rock'
import { SECOND_LINE } from '../groove/grooves/secondLine'
import { SHUFFLE } from '../groove/grooves/shuffle'
import { STRAIGHT_FUNK } from '../groove/grooves/straightFunk'
import type { KitVoiceName } from '../groove/kit'
import {
  MUTABLE_VOICES,
  NO_MUTES,
  audibleHits,
  canMute,
  isMuted,
  mutableVoicesOf,
} from './voices'

const EVERY_GROOVE: Record<Exclude<SourceId, 'click'>, GrooveDefinition> = {
  'bossa-nova': BOSSA_NOVA,
  rock: ROCK,
  shuffle: SHUFFLE,
  'straight-funk': STRAIGHT_FUNK,
  'second-line': SECOND_LINE,
}

const EVERY_GROOVE_BY_NAME = Object.entries(EVERY_GROOVE)

const grooveStating = (voices: readonly KitVoiceName[]): GrooveDefinition => ({
  ...ROCK,
  voices,
})

const everyRenderedStep = (
  groove: GrooveDefinition,
): { step: number; variations: boolean; hits: readonly Hit[] }[] => {
  const out = []
  for (const variations of [false, true]) {
    for (let step = 0; step < BARS_PER_CYCLE * groove.steps; step += 1) {
      out.push({ step, variations, hits: hitsAt(groove, step, variations) })
    }
  }
  return out
}

const KIT_VOICES: readonly VoiceName[] = VOICE_ORDER.filter((v) => v !== 'claves')

describe('mutableVoicesOf', () => {
  it.each(EVERY_GROOVE_BY_NAME)(
    '%s states a kick, a snare and a hat, so it offers every mutable voice',
    (_name, groove) => {
      expect(groove.voices).toEqual(
        expect.arrayContaining(['kick', 'snare', 'hatClosed']),
      )
      expect(mutableVoicesOf(groove)).toEqual(MUTABLE_VOICES)
    },
  )

  it('offers no hat to a groove that states neither hat', () => {
    expect(mutableVoicesOf(grooveStating(['kick', 'snare']))).toEqual(['kick', 'snare'])
  })

  it('offers the snare to a groove that states only the rim', () => {
    expect(mutableVoicesOf(grooveStating(['kick', 'rim']))).toEqual(['kick', 'snare'])
  })

  it('offers the hat to a groove that states only the open hat', () => {
    expect(mutableVoicesOf(grooveStating(['hatOpen']))).toEqual(['hat'])
  })

  it('returns MUTABLE_VOICES order whatever order the definition states', () => {
    expect(mutableVoicesOf(grooveStating(['hatOpen', 'rim', 'kick']))).toEqual(
      MUTABLE_VOICES,
    )
  })

  it('offers nothing to a groove that states no mutable voice', () => {
    expect(mutableVoicesOf(grooveStating([]))).toEqual([])
  })
})

describe('isMuted', () => {
  it('counts the rim as the snare', () => {
    expect(isMuted(['snare'], 'rim')).toBe(true)
    expect(isMuted(['snare'], 'snare')).toBe(true)
  })

  it('counts both hats as the hat', () => {
    expect(isMuted(['hat'], 'hatClosed')).toBe(true)
    expect(isMuted(['hat'], 'hatOpen')).toBe(true)
  })

  it('leaves a voice no mutable voice covers alone', () => {
    expect(isMuted(['kick'], 'snare')).toBe(false)
    expect(isMuted(['kick'], 'rim')).toBe(false)
    expect(isMuted(['snare'], 'hatClosed')).toBe(false)
    expect(isMuted(['hat'], 'kick')).toBe(false)
  })

  it('leaves claves audible under a set naming every mutable voice', () => {
    expect(isMuted(MUTABLE_VOICES, 'claves')).toBe(false)
  })

  it('mutes every kit voice under a set naming every mutable voice', () => {
    for (const voice of KIT_VOICES) {
      expect(isMuted(MUTABLE_VOICES, voice), voice).toBe(true)
    }
  })

  it('mutes nothing under NO_MUTES', () => {
    for (const voice of VOICE_ORDER) {
      expect(isMuted(NO_MUTES, voice), voice).toBe(false)
    }
  })
})

describe('canMute', () => {
  it('allows the first mute of any voice', () => {
    for (const voice of MUTABLE_VOICES) {
      expect(canMute(ROCK, NO_MUTES, voice), voice).toBe(true)
    }
  })

  it('allows a second mute, which still leaves one voice audible', () => {
    expect(canMute(ROCK, ['kick'], 'snare')).toBe(true)
    expect(canMute(ROCK, ['hat'], 'kick')).toBe(true)
  })

  it('refuses the last audible voice, whichever two are already muted', () => {
    for (const voice of MUTABLE_VOICES) {
      const others = MUTABLE_VOICES.filter((other) => other !== voice)
      expect(canMute(ROCK, others, voice), voice).toBe(false)
    }
  })

  it('allows a voice that is already muted, which silences nothing further', () => {
    expect(canMute(ROCK, ['kick'], 'kick')).toBe(true)
    expect(canMute(ROCK, ['kick', 'snare'], 'kick')).toBe(true)
  })

  it('refuses the only voice a groove states', () => {
    expect(canMute(grooveStating(['kick']), NO_MUTES, 'kick')).toBe(false)
  })
})

describe('audibleHits', () => {
  it.each(EVERY_GROOVE_BY_NAME)(
    'returns every rendered step of %s unchanged under NO_MUTES',
    (_name, groove) => {
      for (const { step, variations, hits } of everyRenderedStep(groove)) {
        expect(audibleHits(hits, NO_MUTES), `${step}/${variations}`).toEqual(hits)
      }
    },
  )

  it.each(EVERY_GROOVE_BY_NAME)(
    'drops both hats from every rendered step of %s when the hat is muted',
    (_name, groove) => {
      for (const { step, variations, hits } of everyRenderedStep(groove)) {
        expect(audibleHits(hits, ['hat']), `${step}/${variations}`).toEqual(
          hits.filter(({ voice }) => voice !== 'hatClosed' && voice !== 'hatOpen'),
        )
      }
    },
  )

  it.each(EVERY_GROOVE_BY_NAME)(
    'drops snare and rim from every rendered step of %s when the snare is muted',
    (_name, groove) => {
      for (const { step, variations, hits } of everyRenderedStep(groove)) {
        expect(audibleHits(hits, ['snare']), `${step}/${variations}`).toEqual(
          hits.filter(({ voice }) => voice !== 'snare' && voice !== 'rim'),
        )
      }
    },
  )

  it('takes the two fill snares of bossa and leaves the clave sounding', () => {
    const muted = everyRenderedStep(BOSSA_NOVA).map(({ hits }) =>
      audibleHits(hits, ['snare']),
    )

    expect(muted.flat().some(({ voice }) => voice === 'snare')).toBe(false)
    expect(muted.flat().filter(({ voice }) => voice === 'claves')).toEqual(
      everyRenderedStep(BOSSA_NOVA)
        .flatMap(({ hits }) => hits)
        .filter(({ voice }) => voice === 'claves'),
    )
  })

  it('leaves bossa the clave alone when every mutable voice is muted', () => {
    for (const { step, variations, hits } of everyRenderedStep(BOSSA_NOVA)) {
      expect(audibleHits(hits, MUTABLE_VOICES), `${step}/${variations}`).toEqual(
        hits.filter(({ voice }) => voice === 'claves'),
      )
    }
  })

  it('empties every rendered step of a groove with no clave when all are muted', () => {
    for (const { step, variations, hits } of everyRenderedStep(ROCK)) {
      expect(audibleHits(hits, MUTABLE_VOICES), `${step}/${variations}`).toEqual([])
    }
  })

  it('keeps the order of what remains', () => {
    const stack: readonly Hit[] = [
      { voice: 'hatOpen', velocity: 0.8 },
      { voice: 'kick', velocity: 0.95 },
      { voice: 'claves', velocity: 0.5 },
      { voice: 'hatClosed', velocity: 0.66 },
      { voice: 'snare', velocity: 0.7 },
    ]

    expect(audibleHits(stack, ['hat'])).toEqual([stack[1], stack[2], stack[4]])
  })

  it('drops nothing from a step whose voices no set names', () => {
    const stack: readonly Hit[] = [{ voice: 'claves', velocity: 0.5 }]

    expect(audibleHits(stack, ['kick', 'snare'])).toEqual(stack)
  })

  it('drops every kit voice when every mutable voice is muted', () => {
    const stack: readonly Hit[] = KIT_VOICES.map((voice) => ({ voice, velocity: 0.8 }))

    expect(audibleHits(stack, MUTABLE_VOICES)).toEqual([])
  })
})


/**
 * `spec.md` § Decided, "Bossa may be muted all the way down to its bare clave".
 * Written after Track A's implementer reported that mutating `canMute` to read
 * `groove.voices` instead of the played lines killed nothing — the decision was
 * implemented and unasserted, which is the one state worse than not building it.
 */
describe('the last toggle, which bossa alone does not disable', () => {
  const KIT_ONLY = [
    ['straight-funk', STRAIGHT_FUNK],
    ['rock', ROCK],
    ['shuffle', SHUFFLE],
    ['second-line', SECOND_LINE],
  ] as const

  it.each(MUTABLE_VOICES)('lets bossa mute %s with the other two already gone', (voice) => {
    const others = MUTABLE_VOICES.filter((other) => other !== voice)

    expect(canMute(BOSSA_NOVA, others, voice)).toBe(true)
  })

  it('leaves bossa sounding its clave after every toggle is muted', () => {
    const played = [...BOSSA_NOVA.ordinary.flat(), ...BOSSA_NOVA.light, ...BOSSA_NOVA.fill]
    const survives = played
      .map(({ voice }) => voice)
      .filter((voice) => !isMuted(MUTABLE_VOICES, voice))

    expect([...new Set(survives)]).toEqual(['claves'])
  })

  it.each(KIT_ONLY)('refuses %s its last toggle, because nothing else would sound', (_id, groove) => {
    for (const voice of MUTABLE_VOICES) {
      const others = MUTABLE_VOICES.filter((other) => other !== voice)

      expect(canMute(groove, others, voice), `${_id} allowed ${voice}`).toBe(false)
    }
  })

  it('is the clave that makes the difference, not the groove', () => {
    const claveless: GrooveDefinition = {
      ...BOSSA_NOVA,
      ordinary: BOSSA_NOVA.ordinary.map((lines) =>
        lines.filter((line) => line.voice !== 'claves'),
      ),
      light: BOSSA_NOVA.light.filter((line) => line.voice !== 'claves'),
      fill: BOSSA_NOVA.fill.filter((line) => line.voice !== 'claves'),
    }

    expect(canMute(BOSSA_NOVA, ['kick', 'snare'], 'hat')).toBe(true)
    expect(canMute(claveless, ['kick', 'snare'], 'hat')).toBe(false)
  })
})
