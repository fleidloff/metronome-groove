import type { MetronomeSnippets } from '../types'

export const metronome = {
  start: 'Start',
  stop: 'Stop',
  tempo: 'Tempo',
  tempoUnit: 'bpm',
  bar: 'Bar',
  beatName: ({ beat }) => `Beat ${beat}`,
  downbeatName: ({ beat }) => `Beat ${beat}, downbeat`,
  tap: 'Tap',
} satisfies MetronomeSnippets
