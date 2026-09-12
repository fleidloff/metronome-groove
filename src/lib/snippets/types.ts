/**
 * The shape of each area. A language folder satisfies these, so adding a
 * second language is a folder that fails to compile until it is complete
 * rather than a folder that is quietly missing half its lines.
 */

export type AppSnippets = {
  name: string
  tagline: string
}

export type MetronomeSnippets = {
  start: string
  stop: string
  tempo: string
  tempoUnit: string
  bar: string
  beatName: (args: { beat: number }) => string
  downbeatName: (args: { beat: number }) => string
}
