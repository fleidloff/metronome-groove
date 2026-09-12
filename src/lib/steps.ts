export const STEPS_PER_BAR = 16

export const BEATS_PER_BAR = 4

export function stepSeconds(bpm: number, stepsPerBar: number): number {
  return 60 / bpm / (stepsPerBar / BEATS_PER_BAR)
}

export function isQuarter(step: number, stepsPerBar: number): boolean {
  return step % (stepsPerBar / BEATS_PER_BAR) === 0
}
