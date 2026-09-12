export function swingOffset(swing: number, step: number, stepSeconds: number): number {
  if (swing === 0 || step % 2 === 0) return 0
  return Math.min(Math.max(swing, 0), 1) * (stepSeconds / 2)
}
