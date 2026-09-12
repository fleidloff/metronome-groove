import { describe, expect, it } from 'vitest'
import { gainFor } from '@/lib/velocity'
import { CHOKE_S, createAudioClock, type Take, type VoiceBank } from './audioClock'

const NOMINAL = 0.886

function fakeContext(startTime = 0) {
  const started: { buffer: unknown; at: number }[] = []
  const gains: number[] = []
  const ramps: { to: number; at: number }[] = []
  const cancels: number[] = []
  const stops: number[] = []
  let now = startTime

  const context = {
    get currentTime() {
      return now
    },
    destination: {},
    createBufferSource() {
      const node = {
        buffer: null as unknown,
        onended: null as (() => void) | null,
        connect: (next: unknown) => next,
        start(at: number) {
          started.push({ buffer: node.buffer, at })
        },
        stop(at?: number) {
          stops.push(at ?? -1)
        },
      }
      return node
    },
    createGain() {
      const node = {
        gain: {
          set value(next: number) {
            gains.push(next)
          },
          cancelScheduledValues: (at: number) => cancels.push(at),
          setValueAtTime: () => undefined,
          linearRampToValueAtTime: (to: number, at: number) => ramps.push({ to, at }),
        },
        connect: (next: unknown) => next,
      }
      return node
    },
  } as unknown as AudioContext

  return { context, started, gains, ramps, cancels, stops, moveTo: (t: number) => (now = t) }
}

const take = (name: string): Take => ({
  buffer: name as unknown as AudioBuffer,
  nominalVelocity: NOMINAL,
})

const bank = (): VoiceBank => ({
  hatOpen: { leadInSeconds: 0, takeFor: () => take('hatOpen') },
  hatClosed: {
    leadInSeconds: 0,
    takeFor: (_velocity, step) => take(`hatClosed_rr${step % 3}`),
    chokes: ['hatOpen'],
  },
  claves: { leadInSeconds: 0.0083, takeFor: () => take('claves') },
})

describe('the audio clock', () => {
  it('reports each voice its own lead-in, and zero for one it does not hold', () => {
    const clock = createAudioClock(fakeContext().context, bank())

    expect(clock.leadInFor('claves')).toBe(0.0083)
    expect(clock.leadInFor('hatClosed')).toBe(0)
    expect(clock.leadInFor('kick')).toBe(0)
  })

  it('picks the take for the absolute step, so a one-bar loop does not repeat itself', () => {
    const fake = fakeContext()
    const clock = createAudioClock(fake.context, bank())

    for (const step of [14, 15, 16, 17]) {
      clock.schedule(step, { voice: 'hatClosed', velocity: 0.9 }, { step, gain: 1 })
    }

    expect(fake.started.map((entry) => entry.buffer)).toEqual([
      'hatClosed_rr2',
      'hatClosed_rr0',
      'hatClosed_rr1',
      'hatClosed_rr2',
    ])
  })

  it('chokes a ringing open hat when the closed hat sounds', () => {
    const fake = fakeContext()
    const clock = createAudioClock(fake.context, bank())

    clock.schedule(1, { voice: 'hatOpen', velocity: 0.88 }, { step: 14, gain: 1 })
    expect(fake.ramps).toEqual([])

    clock.schedule(2, { voice: 'hatClosed', velocity: 0.66 }, { step: 15, gain: 1 })

    expect(fake.cancels).toEqual([2])
    expect(fake.ramps).toEqual([{ to: 0, at: 2 + CHOKE_S }])
    expect(fake.stops).toEqual([2 + CHOKE_S])
  })

  it('never chokes a note that has not sounded yet', () => {
    const fake = fakeContext()
    const clock = createAudioClock(fake.context, bank())

    clock.schedule(5, { voice: 'hatOpen', velocity: 0.88 }, { step: 14, gain: 1 })
    clock.schedule(3, { voice: 'hatClosed', velocity: 0.66 }, { step: 15, gain: 1 })

    expect(fake.ramps).toEqual([])
    expect(fake.stops).toEqual([])
  })

  it('applies the placement gain on top of the velocity curve', () => {
    const fake = fakeContext()
    const clock = createAudioClock(fake.context, bank())

    clock.schedule(0, { voice: 'claves', velocity: 0.65 }, { step: 0, gain: 0.5 })

    expect(fake.gains).toHaveLength(1)
    expect(fake.gains[0]).toBeCloseTo(gainFor(0.65, NOMINAL) * 0.5, 10)
  })

  it('schedules nothing for a voice the bank does not hold, or a take it cannot supply', () => {
    const fake = fakeContext()
    const clock = createAudioClock(fake.context, {
      kick: { leadInSeconds: 0, takeFor: () => null },
    })

    clock.schedule(0, { voice: 'kick', velocity: 0.95 }, { step: 0, gain: 1 })
    clock.schedule(0, { voice: 'snare', velocity: 0.92 }, { step: 0, gain: 1 })

    expect(fake.started).toEqual([])
  })

  it('silences everything still ringing when the transport stops', () => {
    const fake = fakeContext()
    const clock = createAudioClock(fake.context, bank())

    clock.schedule(0, { voice: 'hatOpen', velocity: 0.88 }, { step: 14, gain: 1 })
    clock.schedule(0, { voice: 'claves', velocity: 0.65 }, { step: 0, gain: 1 })

    clock.stopSounding()

    expect(fake.stops).toEqual([-1, -1])
  })
})
