import type { Velocity } from '@/lib/velocity'

/** Time is injected so a test can advance it rather than wait for it. */
export interface Clock {
  readonly currentTime: number
  schedule(at: number, velocity: Velocity): void
}
