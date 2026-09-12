export type AppSnippets = {
  name: string
  tagline: string
  sampleCredit: string
}

export type MetronomeSnippets = {
  start: string
  stop: string
  tempo: string
  tempoUnit: string
  bar: string
  beatName: (args: { beat: number }) => string
  downbeatName: (args: { beat: number }) => string
  tap: string
  sound: string
  click: string
  bossaNova: string
  rock: string
  shuffle: string
  straightFunk: string
  fills: string
  countIn: string
  loading: string
}
