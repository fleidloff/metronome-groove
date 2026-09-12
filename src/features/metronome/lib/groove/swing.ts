/**
 * Swing warps the grid rather than displacing single steps: the stated steps
 * `stride` grid steps apart move, and the grid between two of them stretches
 * with them, so a sub-stated-step note is felt inside the swung pair rather
 * than against it.
 *
 * `swing` is clamped to `[0, 1]` and read as the long-short ratio
 * `(2 + s) / (2 - s)` — `2 / 3` is the 2:1 triplet shuffle, `1` is 3:1.
 * `stride` is `groove.steps / groove.subdivision`.
 */
export function swingOffset(
  swing: number,
  step: number,
  stepSeconds: number,
  stride: number,
): number {
  const clamped = Math.min(Math.max(swing, 0), 1)
  if (clamped === 0) return 0

  const position = step / stride
  const stated = Math.floor(position)
  const fraction = position - stated
  const lag = statedLag(stated, clamped)

  return (lag + fraction * (statedLag(stated + 1, clamped) - lag)) * stride * stepSeconds
}

function statedLag(stated: number, swing: number): number {
  return stated % 2 === 1 ? swing / 2 : 0
}
