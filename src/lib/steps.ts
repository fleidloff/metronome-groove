/**
 * The step grid. Domain rather than product: a bar of 4/4 divides into
 * sixteenths whether or not this app exists, which is the bar `src/lib/` sets.
 */

export const STEPS_PER_BAR = 16

export const BEATS_PER_BAR = 4

/** Seconds per step. A source declares how many steps its bar holds — 4 for a
 *  click on the quarters, 16 for a groove on the sixteenths. */
export function stepSeconds(bpm: number, stepsPerBar: number): number {
  return 60 / bpm / (stepsPerBar / BEATS_PER_BAR)
}

/** Whether a step lands on a quarter, which is all the four dots show. */
export function isQuarter(step: number, stepsPerBar: number): boolean {
  return step % (stepsPerBar / BEATS_PER_BAR) === 0
}
