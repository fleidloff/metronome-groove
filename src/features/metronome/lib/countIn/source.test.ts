import { describe, expect, it } from 'vitest'
import { BEATS_PER_BAR, STEPS_PER_BAR, isQuarter, stepSeconds } from '@/lib/steps'
import { ACCENT_VELOCITY, CLICK_PATTERN, EVEN_VELOCITY } from '../click/pattern'
import { createGrooveSource } from '../groove/source'
import { STRAIGHT_FUNK } from '../groove/grooves/straightFunk'
import type { Hit, Humanize, Source } from '../transport/source'
import { createCountInSource } from './source'

const INNER_SIZES = [STEPS_PER_BAR, BEATS_PER_BAR]

const SECONDS_PER_STEP = stepSeconds(100, STEPS_PER_BAR)

/** Round-robin is 3 bars and the variation cycle 4, so 12 is where they realign. */
const CYCLE_BARS = 12

const SPY_HUMANIZE: Humanize = {
  timingFractionOfStep: 0.05,
  timingCeilingMs: 9,
  velocityJitter: 0.04,
  exactVoices: [],
}

const innerHitsAt = (step: number): readonly Hit[] => [
  { voice: 'kick', velocity: (step + 1) / 1000 },
]

const innerDisplace = (hit: Hit, step: number, seconds: number) =>
  seconds * (step + 1) + hit.velocity

const innerTrim = (hit: Hit, step: number) => 1 + (step + 1) / 100 + hit.velocity

/** Derived rather than listed: `docs/music.md` §5 Q5 leaves the meter open. */
const quartersOf = (steps: number) =>
  Array.from({ length: steps }, (_, step) => step).filter((step) => isQuarter(step, steps))

const upTo = (count: number) => Array.from({ length: count }, (_, n) => n)

interface Spy {
  readonly source: Source
  readonly hitsAsked: number[]
  readonly displaceAsked: number[]
  readonly trimAsked: number[]
}

interface SpyOptions {
  readonly steps?: number
  readonly humanize?: Humanize | null
}

const spyInner = ({ steps = STEPS_PER_BAR, humanize = SPY_HUMANIZE }: SpyOptions = {}): Spy => {
  const hitsAsked: number[] = []
  const displaceAsked: number[] = []
  const trimAsked: number[] = []

  return {
    hitsAsked,
    displaceAsked,
    trimAsked,
    source: {
      id: 'straight-funk',
      steps,
      humanize,
      hitsAt(step) {
        hitsAsked.push(step)
        return innerHitsAt(step)
      },
      displace(hit, step, seconds) {
        displaceAsked.push(step)
        return innerDisplace(hit, step, seconds)
      },
      trim(hit, step) {
        trimAsked.push(step)
        return innerTrim(hit, step)
      },
    },
  }
}

const bareInner = (steps = STEPS_PER_BAR): Source => ({
  id: 'straight-funk',
  steps,
  humanize: null,
  hitsAt: innerHitsAt,
})

const [PROBE] = innerHitsAt(0)

describe('the count bar, armed', () => {
  it.each(INNER_SIZES)(
    'sounds one claves per quarter and nothing between, over a %i-step inner',
    (steps) => {
      const inner = spyInner({ steps })
      const source = createCountInSource(inner.source, () => true)
      const quarters = quartersOf(steps)

      expect(quarters).toHaveLength(CLICK_PATTERN.length)

      for (let step = 0; step < steps; step += 1) {
        const beat = quarters.indexOf(step)

        expect(source.hitsAt(step)).toEqual(
          beat === -1 ? [] : [{ voice: 'claves', velocity: CLICK_PATTERN[beat] }],
        )
      }

      expect(inner.hitsAsked).toEqual([])
    },
  )

  it('accents beat one and leaves the other beats even', () => {
    const source = createCountInSource(spyInner().source, () => true)
    const [downbeat, ...rest] = quartersOf(STEPS_PER_BAR)

    expect(source.hitsAt(downbeat)).toEqual([{ voice: 'claves', velocity: ACCENT_VELOCITY }])

    for (const step of rest) {
      expect(source.hitsAt(step)).toEqual([{ voice: 'claves', velocity: EVEN_VELOCITY }])
    }
  })

  it.each(INNER_SIZES)(
    'hands the inner its own step 0 at the first sounding step, and every step after, over a %i-step inner',
    (steps) => {
      const inner = spyInner({ steps })
      const source = createCountInSource(inner.source, () => true)
      const run = steps * 3

      for (let n = 0; n < run; n += 1) {
        expect(source.hitsAt(steps + n)).toEqual(innerHitsAt(n))
      }

      expect(inner.hitsAsked).toEqual(upTo(run))
    },
  )

  it('is exact through the count bar and delegates with the same offset after it', () => {
    const inner = spyInner()
    const { steps } = inner.source
    const source = createCountInSource(inner.source, () => true)

    for (let step = 0; step < steps; step += 1) {
      expect(source.displace?.(PROBE, step, SECONDS_PER_STEP)).toBe(0)
      expect(source.trim?.(PROBE, step)).toBe(1)
    }

    expect(inner.displaceAsked).toEqual([])
    expect(inner.trimAsked).toEqual([])

    const run = steps * 3

    for (let n = 0; n < run; n += 1) {
      expect(source.displace?.(PROBE, steps + n, SECONDS_PER_STEP)).toBe(
        innerDisplace(PROBE, n, SECONDS_PER_STEP),
      )
      expect(source.trim?.(PROBE, steps + n)).toBe(innerTrim(PROBE, n))
    }

    expect(inner.displaceAsked).toEqual(upTo(run))
    expect(inner.trimAsked).toEqual(upTo(run))
  })

  it('is exact past the count bar too when the inner carries no displace or trim', () => {
    const inner = bareInner()
    const source = createCountInSource(inner, () => true)

    for (const step of [0, inner.steps, inner.steps * 3 + 5]) {
      expect(source.displace?.(PROBE, step, SECONDS_PER_STEP) ?? 0).toBe(0)
      expect(source.trim?.(PROBE, step) ?? 1).toBe(1)
    }
  })
})

describe('not armed', () => {
  it.each(INNER_SIZES)('is transparent in every member, over a %i-step inner', (steps) => {
    const inner = spyInner({ steps })
    const source = createCountInSource(inner.source, () => false)
    const run = steps * 3

    for (let step = 0; step < run; step += 1) {
      expect(source.hitsAt(step)).toEqual(innerHitsAt(step))
      expect(source.displace?.(PROBE, step, SECONDS_PER_STEP) ?? 0).toBe(
        innerDisplace(PROBE, step, SECONDS_PER_STEP),
      )
      expect(source.trim?.(PROBE, step) ?? 1).toBe(innerTrim(PROBE, step))
    }

    expect(inner.hitsAsked).toEqual(upTo(run))
    expect(inner.displaceAsked).toEqual(upTo(run))
    expect(inner.trimAsked).toEqual(upTo(run))
  })

  it('never sounds a claves, on any step', () => {
    const source = createCountInSource(spyInner().source, () => false)

    for (let step = 0; step < STEPS_PER_BAR * CYCLE_BARS; step += 1) {
      expect(source.hitsAt(step).every((hit) => hit.voice !== 'claves')).toBe(true)
    }
  })

  it('reads the flag per call, so one wrapper answers both ways', () => {
    let armed = false
    const source = createCountInSource(spyInner().source, () => armed)

    expect(source.hitsAt(0)).toEqual(innerHitsAt(0))

    armed = true

    expect(source.hitsAt(0)).toEqual([{ voice: 'claves', velocity: CLICK_PATTERN[0] }])
  })
})

describe('what the wrapper is not', () => {
  it.each([true, false])('reports the inner id, steps and humanize — armed: %s', (armed) => {
    for (const steps of INNER_SIZES) {
      const inner = spyInner({ steps })
      const source = createCountInSource(inner.source, () => armed)

      expect(source.id).toBe(inner.source.id)
      expect(source.steps).toBe(steps)
      expect(source.humanize).toBe(SPY_HUMANIZE)
    }

    const exact = spyInner({ humanize: null })

    expect(createCountInSource(exact.source, () => armed).humanize).toBeNull()
  })
})

describe('a groove wrapped and armed', () => {
  const RUN = STEPS_PER_BAR * CYCLE_BARS

  it('plays from its first sounding bar what an unwrapped groove plays from its own', () => {
    const bare = createGrooveSource(STRAIGHT_FUNK)
    const wrapped = createCountInSource(createGrooveSource(STRAIGHT_FUNK), () => true)

    expect(wrapped.steps).toBe(bare.steps)

    for (let n = 0; n < RUN; n += 1) {
      const hits = wrapped.hitsAt(bare.steps + n)

      expect(hits).toEqual(bare.hitsAt(n))

      for (const hit of hits) {
        expect(wrapped.displace?.(hit, bare.steps + n, SECONDS_PER_STEP)).toBe(
          bare.displace!(hit, n, SECONDS_PER_STEP),
        )
        expect(wrapped.trim?.(hit, bare.steps + n)).toBe(bare.trim!(hit, n))
      }
    }
  })

  it('is not the same groove read a bar late, which is what passing the raw step would give', () => {
    const bare = createGrooveSource(STRAIGHT_FUNK)
    const wrapped = createCountInSource(createGrooveSource(STRAIGHT_FUNK), () => true)

    const played = upTo(RUN).map((n) => wrapped.hitsAt(bare.steps + n))
    const readLate = upTo(RUN).map((n) => bare.hitsAt(bare.steps + n))

    expect(played).not.toEqual(readLate)
  })

  it('puts the claves in the count bar and nowhere after it', () => {
    const bare = createGrooveSource(STRAIGHT_FUNK)
    const wrapped = createCountInSource(createGrooveSource(STRAIGHT_FUNK), () => true)

    const counted = upTo(bare.steps).flatMap((step) => wrapped.hitsAt(step))

    expect(counted).toHaveLength(CLICK_PATTERN.length)
    expect(counted.every((hit) => hit.voice === 'claves')).toBe(true)

    for (let n = 0; n < RUN; n += 1) {
      expect(wrapped.hitsAt(bare.steps + n).every((hit) => hit.voice !== 'claves')).toBe(true)
    }
  })
})

describe('the step takes are indexed on', () => {
  const innerTakeStep = (step: number) => step * 100 + 7

  it.each(INNER_SIZES)(
    'hands the inner its own step 0 at the first sounding step, over a %i-step inner',
    (steps) => {
      const source = createCountInSource(spyInner({ steps }).source, () => true)

      for (let n = 0; n < steps * 3; n += 1) {
        expect(source.takeStep?.(steps + n)).toBe(n)
      }
    },
  )

  it('leaves the count bar on the raw step, where the one claves take is', () => {
    const inner = spyInner()
    const source = createCountInSource(inner.source, () => true)

    for (let step = 0; step < inner.source.steps; step += 1) {
      expect(source.takeStep?.(step)).toBe(step)
    }
  })

  it.each(INNER_SIZES)('is the raw step when not armed, over a %i-step inner', (steps) => {
    const source = createCountInSource(spyInner({ steps }).source, () => false)

    for (let step = 0; step < steps * 3; step += 1) {
      expect(source.takeStep?.(step)).toBe(step)
    }
  })

  it.each([true, false])('delegates to an inner that has one — armed: %s', (armed) => {
    const inner: Source = { ...bareInner(), takeStep: innerTakeStep }
    const source = createCountInSource(inner, () => armed)
    const offset = armed ? inner.steps : 0

    for (let n = 0; n < inner.steps * 3; n += 1) {
      expect(source.takeStep?.(offset + n)).toBe(innerTakeStep(n))
    }
  })
})

describe('a groove wrapped and armed, in the takes it draws', () => {
  it('draws from its first sounding bar what an unwrapped groove draws from its own', () => {
    const bare = createGrooveSource(STRAIGHT_FUNK)
    const wrapped = createCountInSource(createGrooveSource(STRAIGHT_FUNK), () => true)
    const run = STEPS_PER_BAR * CYCLE_BARS

    const played = upTo(run).map((n) => wrapped.takeStep?.(bare.steps + n) ?? bare.steps + n)
    const alone = upTo(run).map((n) => bare.takeStep?.(n) ?? n)

    expect(played).toEqual(alone)
  })
})
