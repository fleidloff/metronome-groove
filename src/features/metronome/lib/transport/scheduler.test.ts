import { describe, expect, it, vi } from 'vitest'
import { BEATS_PER_BAR, STEPS_PER_BAR, stepSeconds } from '@/lib/steps'
import type { Velocity } from '@/lib/velocity'
import type { Clock, Hit, Humanize, Placement, Source, VoiceName } from './source'
import type { Beat, Scheduler } from './scheduler'
import { createScheduler } from './scheduler'
import { MIN_BPM } from './tempo'
import { createGrooveSource } from '../groove/source'
import { hitsAt } from '../groove/cycle'
import { KIT_HUMANIZE } from '../groove/grooves/shared'
import { STRAIGHT_FUNK } from '../groove/grooves/straightFunk'

const CLAVES_LEAD_IN_S = 0.0083
const ACCENT_VELOCITY: Velocity = 0.65
const EVEN_VELOCITY: Velocity = 0.5

/** 44.1 kHz: one sample is the finest difference the device can render. */
const SAMPLE_PERIOD_S = 1 / 44100

const HUMANIZE: Humanize = {
  timingFractionOfStep: 0.03,
  timingCeilingMs: 4,
  velocityJitter: 0.04,
  exactVoices: [],
}

const humanizeBoundS = (humanize: Humanize | null, seconds: number) =>
  humanize === null
    ? 0
    : Math.min(
        humanize.timingFractionOfStep * seconds,
        humanize.timingCeilingMs / 1000,
      )

type LeadIns = Partial<Record<VoiceName, number>>

const CLAVES_ONLY: LeadIns = { claves: CLAVES_LEAD_IN_S }

function testClock(startTime = 0, leadIns: LeadIns = CLAVES_ONLY) {
  const scheduled: { at: number; hit: Hit; placement: Placement }[] = []
  let now = startTime

  const clock: Clock = {
    get currentTime() {
      return now
    },
    schedule(at, hit, placement) {
      scheduled.push({ at, hit, placement })
    },
    leadInFor(voice) {
      return leadIns[voice] ?? 0
    },
  }

  return {
    clock,
    scheduled,
    ats: () => scheduled.map((entry) => entry.at),
    velocities: () => scheduled.map((entry) => entry.hit.velocity),
    voices: () => scheduled.map((entry) => entry.hit.voice),
    gains: () => scheduled.map((entry) => entry.placement.gain),
    steps: () => scheduled.map((entry) => entry.placement.step),
    /** Scheduled time plus that voice's own lead-in. */
    soundTimes: () =>
      scheduled.map((entry) => entry.at + clock.leadInFor(entry.hit.voice)),
    moveTo(time: number) {
      now = time
    },
  }
}

type TestClock = ReturnType<typeof testClock>

const pump = (fake: TestClock, scheduler: Scheduler, times: number[]) => {
  for (const time of times) {
    fake.moveTo(time)
    scheduler.tick()
  }
}

const clickSource = (): Source => ({
  id: 'click',
  steps: BEATS_PER_BAR,
  humanize: null,
  hitsAt: (step) => [
    {
      voice: 'claves',
      velocity: step % BEATS_PER_BAR === 0 ? ACCENT_VELOCITY : EVEN_VELOCITY,
    },
  ],
})

const KIT: readonly VoiceName[] = ['kick', 'snare', 'hatClosed', 'hatOpen']

const fourVoiceSource = (humanize: Humanize | null = null): Source => ({
  id: 'straight-funk',
  steps: STEPS_PER_BAR,
  humanize,
  hitsAt: () => KIT.map((voice) => ({ voice, velocity: 0.8 })),
})

const fixtureOffset = (step: number, bound: number) =>
  bound * Math.sin(step * 12.9898) * 0.999

const oneVoiceGroove = (humanize: Humanize | null = null): Source => ({
  id: 'straight-funk',
  steps: STEPS_PER_BAR,
  humanize,
  hitsAt: () => [{ voice: 'kick', velocity: 0.9 }],
  ...(humanize === null
    ? {}
    : {
        displace: (_hit: Hit, step: number, seconds: number) =>
          fixtureOffset(step, humanizeBoundS(humanize, seconds)),
        trim: (_hit: Hit, step: number) => (step % 2 === 0 ? 0.75 : 1),
      }),
})

describe('the scheduler walks steps', () => {
  it('queues every hit a step carries, and no fewer', () => {
    const fake = testClock(0, {})
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 100,
      source: fourVoiceSource(),
    })

    scheduler.start()

    expect(fake.scheduled).toHaveLength(KIT.length)
    expect(fake.voices()).toEqual(KIT)
  })

  it('puts the four voices of a step at one instant', () => {
    const fake = testClock(0, {})
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 100,
      source: fourVoiceSource(),
    })

    scheduler.start()

    expect(new Set(fake.soundTimes())).toEqual(new Set([0]))
  })

  it('subtracts each voice its own lead-in, not one figure for the step', () => {
    const leadIns: LeadIns = {
      kick: 0,
      snare: 0.002,
      hatClosed: 0.004,
      hatOpen: 0.008,
    }
    const fake = testClock(0, leadIns)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 100,
      source: fourVoiceSource(),
    })

    scheduler.start()

    const sound = Math.max(...Object.values(leadIns))
    expect(fake.ats()).toEqual(KIT.map((voice) => sound - leadIns[voice]!))
    expect(fake.soundTimes()).toEqual(KIT.map(() => sound))
  })

  it('starts the run late enough that no voice is queued in the past', () => {
    const leadIns: LeadIns = { claves: CLAVES_LEAD_IN_S, kick: 0 }
    const fake = testClock(2, leadIns)
    const source: Source = {
      id: 'straight-funk',
      steps: STEPS_PER_BAR,
      humanize: null,
      hitsAt: () => [
        { voice: 'claves', velocity: 0.5 },
        { voice: 'kick', velocity: 0.9 },
      ],
    }
    const scheduler = createScheduler({ clock: fake.clock, bpm: 100, source })

    scheduler.start()

    for (const at of fake.ats()) expect(at).toBeGreaterThanOrEqual(2)
    expect(fake.ats()).toEqual([2, 2 + CLAVES_LEAD_IN_S])
  })

  it('walks sixteenths, not quarters, for a sixteen-step source', () => {
    const fake = testClock(0, {})
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 100,
      source: oneVoiceGroove(),
      lookaheadS: 0.7,
    })

    scheduler.start()

    // 0.15 s a step at 100 bpm, so five steps fill the window, not two beats.
    const ats = fake.ats()
    expect(ats).toHaveLength(5)
    for (const [step, expected] of [0, 0.15, 0.3, 0.45, 0.6].entries()) {
      expect(ats[step]).toBeCloseTo(expected, 12)
    }
  })

  it('hands the source an absolute step that never wraps at the bar', () => {
    const ROUND_ROBIN: readonly VoiceName[] = ['kick', 'snare', 'hatClosed']
    const fake = testClock(0, {})
    const source: Source = {
      ...oneVoiceGroove(),
      hitsAt: (step) => [
        { voice: ROUND_ROBIN[step % ROUND_ROBIN.length], velocity: 0.9 },
      ],
    }
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 100,
      source,
      lookaheadS: 3,
    })

    scheduler.start()

    // Round-robin on three against a sixteen-step bar: period lcm(3, 16) = 48.
    const voices = fake.voices()
    expect(voices.length).toBeGreaterThanOrEqual(18)
    expect(voices.slice(0, 18)).toEqual(
      Array.from(
        { length: 18 },
        (_, step) => ROUND_ROBIN[step % ROUND_ROBIN.length],
      ),
    )
    expect(voices.slice(16, 18)).toEqual(['snare', 'hatClosed'])
  })
})

describe('the beat the four dots show', () => {
  it('is announced on every step of a four-step source', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })
    const heard: Beat[] = []
    scheduler.onBeat((beat) => heard.push(beat))

    scheduler.start()
    pump(fake, scheduler, [0.45, 0.95, 1.45, 1.95, 2.45, 2.95, 3.45])

    expect(heard.map((beat) => beat.index)).toEqual([0, 1, 2, 3, 0, 1, 2, 3])
  })

  it('is announced only on the quarters of a sixteen-step source', () => {
    const fake = testClock(0, {})
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 100,
      source: oneVoiceGroove(),
      lookaheadS: 2.4,
    })
    const heard: Beat[] = []
    scheduler.onBeat((beat) => heard.push(beat))

    scheduler.start()

    expect(fake.ats()).toHaveLength(STEPS_PER_BAR)
    expect(heard.map((beat) => beat.index)).toEqual([0, 1, 2, 3])
    for (const [beat, expected] of [0, 0.6, 1.2, 1.8].entries()) {
      expect(heard[beat].time).toBeCloseTo(expected, 12)
    }
  })

  it('announces one beat for a step, however many voices sound on it', () => {
    const fake = testClock(0, {})
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 100,
      source: fourVoiceSource(),
      lookaheadS: 2.4,
    })
    const heard: Beat[] = []
    scheduler.onBeat((beat) => heard.push(beat))

    scheduler.start()

    expect(fake.scheduled).toHaveLength(STEPS_PER_BAR * KIT.length)
    expect(heard).toHaveLength(BEATS_PER_BAR)
    expect(heard.map((beat) => beat.index)).toEqual([0, 1, 2, 3])
  })
})

describe('the groove comes back to the grid', () => {
  const STEPS = 100_000

  const runLong = (source: Source, bpm: number) => {
    const fake = testClock(0, {})
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm,
      source,
      lookaheadS: 1000,
    })

    scheduler.start()

    const seconds = stepSeconds(bpm, source.steps)
    for (let now = 500; now < STEPS * seconds + 1000; now += 500) {
      pump(fake, scheduler, [now])
      if (fake.scheduled.length > STEPS) break
    }

    return { fake, seconds }
  }

  it('holds an unhumanized source to the grid within one sample period over 100 000 steps', () => {
    const { fake, seconds } = runLong(oneVoiceGroove(null), 100)

    expect(fake.scheduled.length).toBeGreaterThan(STEPS)

    const times = fake.soundTimes()
    const worst = times.reduce(
      (max, time, step) => Math.max(max, Math.abs(time - step * seconds)),
      0,
    )

    expect(worst).toBeLessThanOrEqual(SAMPLE_PERIOD_S)
    expect(Math.abs(times[STEPS] - STEPS * seconds)).toBeLessThanOrEqual(
      SAMPLE_PERIOD_S,
    )
  })

  it('keeps a humanized source inside its bound for all 100 000 steps, at every tempo in the range', () => {
    for (const bpm of [40, 100, 180]) {
      const { fake, seconds } = runLong(oneVoiceGroove(HUMANIZE), bpm)
      const tolerance = humanizeBoundS(HUMANIZE, seconds) + SAMPLE_PERIOD_S

      const times = fake.soundTimes()
      for (let step = 0; step < times.length; step += 1) {
        expect(Math.abs(times[step] - step * seconds)).toBeLessThanOrEqual(
          tolerance,
        )
      }
    }
  })

  it('moves a hit by the displacement its source asks for, and not by zero', () => {
    const bpm = 100
    const seconds = stepSeconds(bpm, STEPS_PER_BAR)
    const bound = humanizeBoundS(HUMANIZE, seconds)

    const straight = testClock(0, {})
    const straightScheduler = createScheduler({
      clock: straight.clock,
      bpm,
      source: oneVoiceGroove(null),
      lookaheadS: 4,
    })
    straightScheduler.start()

    const humanized = testClock(0, {})
    const humanizedScheduler = createScheduler({
      clock: humanized.clock,
      bpm,
      source: oneVoiceGroove(HUMANIZE),
      lookaheadS: 4,
    })
    humanizedScheduler.start()

    const grid = straight.ats()
    const moved = humanized.ats()
    expect(moved.length).toBe(grid.length)

    for (let step = 0; step < grid.length; step += 1) {
      expect(moved[step] - grid[step]).toBeCloseTo(fixtureOffset(step, bound), 12)
    }

    expect(moved.some((at, step) => Math.abs(at - grid[step]) > bound / 10)).toBe(
      true,
    )
  })

  it('hands the clock the gain trim and the absolute step, not the step in the bar', () => {
    const fake = testClock(0, {})
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 100,
      source: oneVoiceGroove(HUMANIZE),
      lookaheadS: 4,
    })
    scheduler.start()

    expect(fake.gains().length).toBeGreaterThan(STEPS_PER_BAR)
    expect(fake.gains().slice(0, 4)).toEqual([0.75, 1, 0.75, 1])

    expect(fake.steps().slice(0, STEPS_PER_BAR + 2)).toEqual(
      Array.from({ length: STEPS_PER_BAR + 2 }, (_, step) => step),
    )
  })

  it('indexes takes on the step the source names, not on its own', () => {
    const fake = testClock(0, {})
    const shifted = oneVoiceGroove(HUMANIZE)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 100,
      // A timeline one bar behind the scheduler's, as a count-in leaves it.
      source: { ...shifted, takeStep: (step) => step - STEPS_PER_BAR },
      lookaheadS: 4,
    })
    scheduler.start()

    expect(fake.steps().slice(0, STEPS_PER_BAR)).toEqual(
      Array.from({ length: STEPS_PER_BAR }, (_, step) => step - STEPS_PER_BAR),
    )
  })

  it('indexes takes on its own step when the source names none', () => {
    const fake = testClock(0, {})
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 100,
      source: oneVoiceGroove(HUMANIZE),
      lookaheadS: 4,
    })
    scheduler.start()

    expect(fake.steps().slice(0, STEPS_PER_BAR)).toEqual(
      Array.from({ length: STEPS_PER_BAR }, (_, step) => step),
    )
  })

  it('schedules the same times however the lookahead window falls', () => {
    const bpm = 100
    const seconds = stepSeconds(bpm, STEPS_PER_BAR)
    const source = oneVoiceGroove(HUMANIZE)

    const wide = testClock(0, {})
    const wideScheduler = createScheduler({
      clock: wide.clock,
      bpm,
      source,
      lookaheadS: 200,
    })
    wideScheduler.start()
    pump(wide, wideScheduler, [100, 200, 300])

    const narrow = testClock(0, {})
    const narrowScheduler = createScheduler({
      clock: narrow.clock,
      bpm,
      source,
      lookaheadS: 0.5,
    })
    narrowScheduler.start()
    pump(
      narrow,
      narrowScheduler,
      Array.from({ length: 4000 }, (_, tick) => (tick + 1) * (seconds / 2)),
    )

    const count = 2000
    expect(narrow.ats().length).toBeGreaterThanOrEqual(count)
    expect(narrow.ats().slice(0, count)).toEqual(wide.ats().slice(0, count))
  })
})

describe('the click scheduler', () => {
  it('schedules four beats exactly half a second apart at 120 bpm', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })

    scheduler.start()
    pump(fake, scheduler, [0.45, 0.95, 1.45])

    expect(fake.ats()).toEqual([0, 0.5, 1, 1.5])
  })

  it('schedules every beat one lead-in before it is meant to sound', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })
    const heard: Beat[] = []
    scheduler.onBeat((beat) => heard.push(beat))

    scheduler.start()
    pump(fake, scheduler, [0.45, 0.95, 1.45])

    expect(heard.map((beat) => beat.time - CLAVES_LEAD_IN_S)).toEqual(fake.ats())
    expect(heard.map((beat) => beat.time)).toEqual([
      0 + CLAVES_LEAD_IN_S,
      0.5 + CLAVES_LEAD_IN_S,
      1 + CLAVES_LEAD_IN_S,
      1.5 + CLAVES_LEAD_IN_S,
    ])
  })

  it('never schedules the first beat of a run in the past', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })

    scheduler.start()

    expect(fake.ats()).toEqual([0])
    expect(fake.ats()[0]).not.toBe(0 - CLAVES_LEAD_IN_S)
  })

  it('clamps to now rather than scheduling behind a late tick', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })
    const heard: Beat[] = []
    scheduler.onBeat((beat) => heard.push(beat))

    scheduler.start()
    pump(fake, scheduler, [0.6])

    expect(fake.ats()).toEqual([0, 0.6])
    expect(heard[1].time).toBe(0.6 + CLAVES_LEAD_IN_S)
  })

  it('drops the beats a long stall overtook rather than firing them together', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })
    const heard: Beat[] = []
    scheduler.onBeat((beat) => heard.push(beat))

    scheduler.start()
    // A backgrounded tab: the driving interval is throttled for three seconds.
    pump(fake, scheduler, [3])

    expect(fake.ats()).toEqual([0, 3])
    expect(heard).toHaveLength(2)
  })

  it('keeps the grid and the bar position across a stall', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })
    const heard: Beat[] = []
    scheduler.onBeat((beat) => heard.push(beat))

    scheduler.start()
    pump(fake, scheduler, [3, 3.45, 3.95])

    expect(heard.map((beat) => beat.index)).toEqual([0, 2, 3, 0])

    for (const at of fake.ats()) {
      expect(Math.abs((at * 2) % 1)).toBeLessThan(1e-9)
    }
  })

  it('repeats the accent pattern across bar boundaries', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })
    const heard: Beat[] = []
    scheduler.onBeat((beat) => heard.push(beat))

    scheduler.start()
    pump(fake, scheduler, [0.45, 0.95, 1.45, 1.95, 2.45])

    expect(fake.velocities()).toEqual([
      ACCENT_VELOCITY,
      EVEN_VELOCITY,
      EVEN_VELOCITY,
      EVEN_VELOCITY,
      ACCENT_VELOCITY,
      EVEN_VELOCITY,
    ])
    expect(heard.map((beat) => beat.index)).toEqual([0, 1, 2, 3, 0, 1])
  })

  it('applies a tempo change from the next unqueued beat and no earlier', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })

    scheduler.start()
    pump(fake, scheduler, [0.45])
    expect(fake.ats()).toEqual([0, 0.5])

    scheduler.setTempo(60)

    expect(fake.ats()).toEqual([0, 0.5])

    pump(fake, scheduler, [1.45, 2.45])

    expect(fake.ats()).toEqual([0, 0.5, 1.5, 2.5])
    expect(fake.velocities()).toEqual([
      ACCENT_VELOCITY,
      EVEN_VELOCITY,
      EVEN_VELOCITY,
      EVEN_VELOCITY,
    ])
  })

  it('changes tempo on a sixteen-step source at the sixteenth, not the quarter', () => {
    const fake = testClock(0, {})
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: oneVoiceGroove(null),
      lookaheadS: 0.05,
    })

    const at120 = stepSeconds(120, STEPS_PER_BAR)
    const at60 = stepSeconds(60, STEPS_PER_BAR)
    expect(at120).toBeCloseTo(0.125, 12)
    expect(at60).toBeCloseTo(0.25, 12)

    scheduler.start()
    pump(fake, scheduler, [at120 * 0.9])
    expect(fake.ats()).toEqual([0, at120])

    scheduler.setTempo(60)
    pump(fake, scheduler, [at120 + at60 * 0.9, at120 + at60 * 1.9])

    expect(fake.ats()).toEqual([0, at120, at120 + at60, at120 + at60 * 2])

    expect(fake.steps()).toEqual([0, 1, 2, 3])
  })

  it('plays the real straight funk source through the real scheduler', () => {
    for (const bpm of [40, 100, 180]) {
    const seconds = stepSeconds(bpm, STEPS_PER_BAR)
    const bound = humanizeBoundS(KIT_HUMANIZE, seconds)

    const fake = testClock(0, {})
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm,
      // Variations off: the four-bar cycle is groove/cycle.test.ts's subject.
      source: createGrooveSource(STRAIGHT_FUNK, { variations: () => false }),
      lookaheadS: seconds * (STEPS_PER_BAR + 1),
    })

    scheduler.start()

    expect(fake.voices()).toContain('kick')
    expect(fake.voices()).toContain('snare')
    expect(fake.voices()).toContain('hatClosed')
    expect(fake.voices()).toContain('hatOpen')

    const queued = Math.max(...fake.steps()) + 1
    for (let step = 0; step < queued; step += 1) {
      const arrived = fake.scheduled
        .filter((entry) => entry.placement.step === step)
        .map((entry) => ({ voice: entry.hit.voice, velocity: entry.hit.velocity }))

      expect(arrived).toEqual(
        hitsAt(STRAIGHT_FUNK, step, false).map((hit) => ({ voice: hit.voice, velocity: hit.velocity })),
      )
    }

    for (const entry of fake.scheduled) {
      expect(Math.abs(entry.at - entry.placement.step * seconds)).toBeLessThanOrEqual(
        bound + 1e-9,
      )
    }

    const moved = fake.scheduled.filter(
      (entry) => Math.abs(entry.at - entry.placement.step * seconds) > bound / 10,
    )
    expect(moved.length).toBeGreaterThan(0)
    }
  })

  it('holds a tempo outside 40-180 bpm to the nearest end of the range', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })

    scheduler.start()
    pump(fake, scheduler, [0.45])
    scheduler.setTempo(10)
    pump(fake, scheduler, [1.95])

    expect(fake.ats()).toEqual([0, 0.5, 0.5 + 60 / MIN_BPM])
  })

  it('starts a fresh bar on the accent after a stop', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })

    scheduler.start()
    pump(fake, scheduler, [0.45])
    scheduler.stop()

    expect(scheduler.isRunning).toBe(false)

    fake.moveTo(5)
    scheduler.start()

    expect(fake.ats()).toEqual([0, 0.5, 5])
    expect(fake.velocities()).toEqual([
      ACCENT_VELOCITY,
      EVEN_VELOCITY,
      ACCENT_VELOCITY,
    ])
  })

  it('queues nothing once stopped', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })

    scheduler.start()
    scheduler.stop()
    pump(fake, scheduler, [0.45, 0.95])

    expect(fake.ats()).toEqual([0])
  })
})

describe('the beat event', () => {
  it('stops reaching a listener that has unsubscribed', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })
    const listener = vi.fn()
    const unsubscribe = scheduler.onBeat(listener)

    scheduler.start()
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    pump(fake, scheduler, [0.45, 0.95])

    expect(listener).toHaveBeenCalledTimes(1)
    expect(fake.ats()).toEqual([0, 0.5, 1])
  })

  it('keeps scheduling when a listener throws', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
    })
    const other = vi.fn()
    scheduler.onBeat(() => {
      throw new Error('the UI fell over')
    })
    scheduler.onBeat(other)

    scheduler.start()
    pump(fake, scheduler, [0.45, 0.95, 1.45])

    expect(fake.ats()).toEqual([0, 0.5, 1, 1.5])
    expect(other).toHaveBeenCalledTimes(4)
  })

  it('schedules the whole window before it notifies anyone', () => {
    const fake = testClock(0)
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm: 120,
      source: clickSource(),
      lookaheadS: 1.2,
    })

    const queuedWhenNotified: number[] = []
    scheduler.onBeat(() => queuedWhenNotified.push(fake.scheduled.length))

    scheduler.start()

    expect(fake.scheduled).toHaveLength(3)
    expect(queuedWhenNotified).toEqual([3, 3, 3])
  })
})
