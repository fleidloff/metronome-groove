/**
 * Off-beat displacement, in the sibling project's units: `0` is straight, `1`
 * lands on the next on-beat, and a triplet shuffle is about `0.67`. An odd
 * step is delayed by `swing × half a step`; an even one never moves.
 */
export function swingOffset(swing: number, step: number, stepSeconds: number): number {
  if (swing === 0 || step % 2 === 0) return 0
  return Math.min(Math.max(swing, 0), 1) * (stepSeconds / 2)
}
