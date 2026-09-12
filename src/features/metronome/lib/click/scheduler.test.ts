import { describe, expect, it, vi } from 'vitest'
import type { Velocity } from '@/lib/velocity'
import { CLAVES_LEAD_IN_S } from './claves'
import type { Clock } from './clock'
import { ACCENT_VELOCITY, EVEN_VELOCITY } from './pattern'
import { MIN_BPM } from './tempo'
import type { Beat, ClickScheduler } from './scheduler'
import { createClickScheduler } from './scheduler'

function testClock(startTime = 0) {
  const scheduled: { at: number; velocity: Velocity }[] = []
  let now = startTime

  const clock: Clock = {
    get currentTime() {
      return now
    },
    schedule(at, velocity) {
      scheduled.push({ at, velocity })
    },
  }

  return {
    clock,
    scheduled,
    ats: () => scheduled.map((beat) => beat.at),
    velocities: () => scheduled.map((beat) => beat.velocity),
    moveTo(time: number) {
      now = time
    },
  }
}

type TestClock = ReturnType<typeof testClock>

const pump = (fake: TestClock, scheduler: ClickScheduler, times: number[]) => {
  for (const time of times) {
    fake.moveTo(time)
    scheduler.tick()
  }
}

describe('the click scheduler', () => {
  it('schedules four beats exactly half a second apart at 120 bpm', () => {
    const fake = testClock(0)
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })

    scheduler.start()
    pump(fake, scheduler, [0.45, 0.95, 1.45])

    expect(fake.ats()).toEqual([0, 0.5, 1, 1.5])
  })

  it('schedules every beat one lead-in before it is meant to sound', () => {
    const fake = testClock(0)
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })
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
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })

    scheduler.start()

    expect(fake.ats()).toEqual([0])
    expect(fake.ats()[0]).not.toBe(0 - CLAVES_LEAD_IN_S)
  })

  it('clamps to now rather than scheduling behind a late tick', () => {
    const fake = testClock(0)
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })
    const heard: Beat[] = []
    scheduler.onBeat((beat) => heard.push(beat))

    scheduler.start()
    pump(fake, scheduler, [0.6])

    expect(fake.ats()).toEqual([0, 0.6])
    expect(heard[1].time).toBe(0.6 + CLAVES_LEAD_IN_S)
  })

  it('drops the beats a long stall overtook rather than firing them together', () => {
    const fake = testClock(0)
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })
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
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })
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
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })
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
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })

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

  it('holds a tempo outside 40-180 bpm to the nearest end of the range', () => {
    const fake = testClock(0)
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })

    scheduler.start()
    pump(fake, scheduler, [0.45])
    scheduler.setTempo(10)
    pump(fake, scheduler, [1.95])

    expect(fake.ats()).toEqual([0, 0.5, 0.5 + 60 / MIN_BPM])
  })

  it('starts a fresh bar on the accent after a stop', () => {
    const fake = testClock(0)
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })

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
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })

    scheduler.start()
    scheduler.stop()
    pump(fake, scheduler, [0.45, 0.95])

    expect(fake.ats()).toEqual([0])
  })
})

describe('the beat event', () => {
  it('stops reaching a listener that has unsubscribed', () => {
    const fake = testClock(0)
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })
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
    const scheduler = createClickScheduler({ clock: fake.clock, bpm: 120 })
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
    const scheduler = createClickScheduler({
      clock: fake.clock,
      bpm: 120,
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
