import { isTempo } from '../transport/tempo'
import { SOURCE_IDS, type SourceId } from '../transport/source'

export const SETUP_KEY = 'metronome.setup'

export const SETUP_VERSION = 1

export const DEFAULT_BPM = 100

export const DEFAULT_SOURCE: SourceId = 'click'

export const DEFAULT_FILLS = true

export const DEFAULT_COUNT_IN = false

export interface Setup {
  readonly bpm: number
  readonly source: SourceId
  readonly fills: boolean
  readonly countIn: boolean
}

export const DEFAULT_SETUP: Setup = {
  bpm: DEFAULT_BPM,
  source: DEFAULT_SOURCE,
  fills: DEFAULT_FILLS,
  countIn: DEFAULT_COUNT_IN,
}

const storageOf = (given?: Storage) => {
  if (given) return given
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    // Reading the property itself can throw where storage is disabled.
    return undefined
  }
}

const isSourceId = (value: unknown): value is SourceId =>
  typeof value === 'string' && (SOURCE_IDS as readonly string[]).includes(value)

const isStoredTempo = (value: unknown): value is number =>
  typeof value === 'number' && isTempo(value)

export function readSetup(storage?: Storage): Setup {
  const live = storageOf(storage)
  if (!live) return DEFAULT_SETUP

  let raw: string | null
  try {
    raw = live.getItem(SETUP_KEY)
  } catch {
    return DEFAULT_SETUP
  }
  if (raw === null) return DEFAULT_SETUP

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_SETUP
  }

  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETUP

  const stored = parsed as Record<string, unknown>
  if (stored.version !== SETUP_VERSION) return DEFAULT_SETUP

  return {
    bpm: isStoredTempo(stored.bpm) ? stored.bpm : DEFAULT_BPM,
    source: isSourceId(stored.source) ? stored.source : DEFAULT_SOURCE,
    fills: typeof stored.fills === 'boolean' ? stored.fills : DEFAULT_FILLS,
    countIn:
      typeof stored.countIn === 'boolean' ? stored.countIn : DEFAULT_COUNT_IN,
  }
}

export function writeSetup(setup: Setup, storage?: Storage): void {
  const live = storageOf(storage)
  if (!live) return

  try {
    live.setItem(
      SETUP_KEY,
      JSON.stringify({ version: SETUP_VERSION, ...setup }),
    )
  } catch {
    // Quota, private mode, or a browser that simply refuses.
  }
}
