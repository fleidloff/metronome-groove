/**
 * Off-beat displacement, in the sibling project's units: `0` is straight, `1`
 * lands on the next on-beat, and a triplet shuffle is about `0.67`. An odd
 * step is delayed by `swing × half a step`; an even one never moves.
 */
export function swingOffset(swing: number, step: number, stepSeconds: number): number {
  if (swing === 0 || step % 2 === 0) return 0
  return Math.min(Math.max(swing, 0), 1) * (stepSeconds / 2)
}

/**
 * Zero, and declared rather than omitted.
 *
 * *Straight* is the antonym of *swung*, so a feel named straight funk that
 * swung would contradict its own name — and at 0.18 on a sixteenth grid every
 * odd step moves, which is all three ghosts, the kick on step 3 and eight of
 * the hats. The constant exists so that trying 0.18 by ear is a value change
 * and a test rather than a new mechanism.
 */
export const STRAIGHT_FUNK_SWING = 0
