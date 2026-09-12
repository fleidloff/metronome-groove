/**
 * The shape of each area. A language folder satisfies these, so adding a
 * second language is a folder that fails to compile until it is complete
 * rather than a folder that is quietly missing half its lines.
 */

export type AppSnippets = {
  name: string
  tagline: string
  /**
   * The attribution the sample licence asks for. CC-BY 4.0 is a condition of
   * shipping the kit at all, so this is an obligation rather than a decoration:
   * it is always on the page and there is nothing to dismiss.
   */
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
  /** What the source picker is asking. */
  sound: string
  click: string
  straightFunk: string
  /**
   * The groove's variations toggle. Named for the thing a non-drummer would
   * notice in a song rather than for what the code does — it covers a light
   * variation as well, and the persona judged that irrelevant.
   */
  fills: string
  /** Shown on the start control while the samples it needs are still arriving,
   *  so a press during the load reads as waiting rather than as nothing. */
  loading: string
}
