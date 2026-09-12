import { describe, expect, it, vi } from 'vitest'
import { BEATS_PER_BAR, STEPS_PER_BAR, stepSeconds } from '@/lib/steps'
import type { Velocity } from '@/lib/velocity'
import type { Clock, Hit, Humanize, Placement, Source, VoiceName } from './source'
import type { Beat, Scheduler } from './scheduler'
import { createScheduler } from './scheduler'
import { MIN_BPM } from './tempo'
import { createStraightFunkSource } from '../groove/source'
import { hitsAt } from '../groove/figure'
import { STRAIGHT_FUNK_HUMANIZE } from '../groove/humanize'

/**
 * Fixtures, not the app's numbers. The transport knows a `Source` and a
 * `Clock` and nothing else — what the click plays and what the kit's lead-ins
 * are belong to `click/` and `groove/`, and are asserted there. These stand in
 * so the transport can be tested without reaching into either.
 */
const CLAVES_LEAD_IN_S = 0.0083
const ACCENT_VELOCITY: Velocity = 0.65
const EVEN_VELOCITY: Velocity = 0.5

/** 44.1 kHz is what the pack is recorded at, so one sample is the finest
 *  difference the device can render. */
const SAMPLE_PERIOD_S = 1 / 44100

const HUMANIZE: Humanize = {
  timingFractionOfStep: 0.03,
  timingCeilingMs: 4,
  velocityJitter: 0.04,
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
    /** When a hit is *heard*: what the clock was asked for, plus the silence
     *  at the head of that voice's own sample. */
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

/** The click's shape: four steps, one voice, never humanized. */
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

/** Four voices on every one of sixteen steps — the polyphony the click's
 *  monophonic scheduler could not express. */
const fourVoiceSource = (humanize: Humanize | null = null): Source => ({
  id: 'straight-funk',
  steps: STEPS_PER_BAR,
  humanize,
  hitsAt: () => KIT.map((voice) => ({ voice, velocity: 0.8 })),
})

/**
 * Stateless and bounded, the way `groove/humanize.ts` is — a fixture rather
 * than that module, because the transport's job is to *apply* a displacement,
 * not to know which one. A source carrying a `Humanize` record but no
 * `displace` is what the scheduler's `?? 0` silently turns into a straight
 * grid, so the humanized cases below would assert nothing against it.
 */
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

    // Four voices on the first step of a 16-step bar, not one.
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
    // Four different lead-ins so a scheduler that reads one constant, or reads
    // the first hit's and applies it to the step, cannot pass. The kit's real
    // lead-ins are all zero and the claves' is 8.3 ms; that is a fact about
    // those recordings, and lives with them.
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
    // The longest lead-in sets the run's offset, so the voice that needs the
    // most silence is the one that starts exactly now.
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

    // A source that round-robins on three indexes the absolute step, so its
    // period is lcm(3, 16) = 48 steps. A step number that wrapped at the bar
    // would restart the cycle at step 16 and make every bar bit-identical.
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

    // One bar: sixteen steps queued, four dots lit.
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

    // Not "small on average" and not "small at the start": the hundred
    // thousandth step is still on the grid, because every step's time is
    // computed from the run's start rather than from the step before it.
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
        // Displaced, never displaced *from the last displacement*. A walk
        // saturates its range inside a bar; this is pulled back to the grid on
        // every note, which is the user's condition for allowing it at all.
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

    // Each hit sits exactly where its source said, so dropping the displacement
    // term is a failure rather than a rounding difference.
    for (let step = 0; step < grid.length; step += 1) {
      expect(moved[step] - grid[step]).toBeCloseTo(fixtureOffset(step, bound), 12)
    }

    // And at least one of them actually moved, so a source that displaced by
    // nothing could not pass this by accident.
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

    // Absolute, because round-robin indexes on it: a bar-local step would
    // restart at 0 and the loop would repeat bit-identically every bar.
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
      // A source whose timeline sits one bar behind the scheduler's, which is
      // what a count-in makes of the groove underneath it.
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
    // Identical output for identical settings, whatever the windowing — the
    // property a random walk cannot have.
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
    // A backgrounded tab: setInterval is throttled and three seconds pass
    // between ticks. Six beats were due; none of them was heard.
    pump(fake, scheduler, [3])

    // One beat, not a burst of six.
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

    // Beat 1 of the run was index 0 at t=0. Six beats of 0.5 s later, t=3.0 is
    // index 6 % 4 = 2, and the bar carries on from there rather than restarting.
    expect(heard.map((beat) => beat.index)).toEqual([0, 2, 3, 0])

    // Still on the original grid: every beat sits a whole number of beats
    // after the first, so the stall moved nothing off the click's own time.
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
    // Every other setTempo case drives the four-step click, where a step and a
    // beat are the same thing. They all pass against a scheduler that re-reads
    // the new tempo on the wrong grid, which would leave the groove running
    // four times too slow after any tempo change.
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

    // The step after the change is one sixteenth at 60 bpm later, not one
    // quarter and not one sixteenth at the old tempo.
    expect(fake.ats()).toEqual([0, at120, at120 + at60, at120 + at60 * 2])

    // And it is steps 0-3 that landed there. Asserting the times alone is not
    // enough: a setTempo that did nothing on a sixteen-step source produces
    // the same four clock times from steps 0, 1, 3, 5, because the ones it
    // overruns are dropped as overtaken.
    expect(fake.steps()).toEqual([0, 1, 2, 3])
  })

  it('plays the real straight funk source through the real scheduler', () => {
    // The fixtures above stand in for a Source so the transport can be tested
    // alone. This is the joint itself: nothing else puts the shipped groove
    // through the shipped scheduler.
    // At both ends of the range as well as the middle: the humanize bound is a
    // fraction of a step with a ceiling, so 40 and 180 exercise different sides
    // of that Math.min and nothing else in the suite runs the shipped source
    // anywhere but 100.
    for (const bpm of [40, 100, 180]) {
    const seconds = stepSeconds(bpm, STEPS_PER_BAR)
    const bound = humanizeBoundS(STRAIGHT_FUNK_HUMANIZE, seconds)

    const fake = testClock(0, {})
    const scheduler = createScheduler({
      clock: fake.clock,
      bpm,
      // Variations off: this case guards the joint, and the four-bar cycle is
      // groove/figure.test.ts's subject. With them on, the comparison below
      // would be against a bar the source is no longer playing.
      source: createStraightFunkSource({ variations: () => false }),
      // A full bar and a little, at whichever tempo. A fixed window in seconds
      // covers ten steps at 40 bpm and forty-eight at 180, so the open hat on
      // step 14 would simply not be reached at the bottom of the range.
      lookaheadS: seconds * (STEPS_PER_BAR + 1),
    })

    scheduler.start()

    expect(fake.voices()).toContain('kick')
    expect(fake.voices()).toContain('snare')
    expect(fake.voices()).toContain('hatClosed')
    expect(fake.voices()).toContain('hatOpen')

    // What this case guards is the JOINT, not the figure. Every hit the source
    // declared arrives at the clock unaltered, on the step it was written for.
    // What the figure *should* contain is asserted in figure.test.ts against a
    // hand-written table — checking it here against hitsAt() would be the same
    // function on both sides of the equals sign, and would stay green if the
    // figure lost a voice.
    const queued = Math.max(...fake.steps()) + 1
    for (let step = 0; step < queued; step += 1) {
      const arrived = fake.scheduled
        .filter((entry) => entry.placement.step === step)
        .map((entry) => ({ voice: entry.hit.voice, velocity: entry.hit.velocity }))

      expect(arrived).toEqual(
        hitsAt(step, false).map((hit) => ({ voice: hit.voice, velocity: hit.velocity })),
      )
    }

    for (const entry of fake.scheduled) {
      expect(Math.abs(entry.at - entry.placement.step * seconds)).toBeLessThanOrEqual(
        bound + 1e-9,
      )
    }

    // The bound is an upper limit, so it is satisfied by a source that displaced
    // nothing at all. Something has to have actually moved for the humanize to
    // have survived the journey.
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
    // A wide lookahead so one window holds several beats. This used to be
    // provoked by stalling the clock, which now correctly drops the beats it
    // overtakes — the subject here is ordering, not what a stall does.
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
    // Every listener saw the full window already queued: the audio is committed
    // to the device before anything renders, so a slow subscriber cannot delay
    // a beat.
    expect(queuedWhenNotified).toEqual([3, 3, 3])
  })
})
