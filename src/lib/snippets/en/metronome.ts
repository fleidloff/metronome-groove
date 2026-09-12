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
  sound: 'Sound',
  click: 'Click',
  bossaNova: 'Bossa nova',
  rock: 'Rock',
  shuffle: 'Shuffle',
  straightFunk: 'Straight funk',
  secondLine: 'Second line',
  fills: 'Fills',
  countIn: 'Count-in',
  loading: 'Loading…',
} satisfies MetronomeSnippets
