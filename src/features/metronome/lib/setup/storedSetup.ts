import { isTempo } from '../transport/tempo'
import { SOURCE_IDS, type SourceId } from '../transport/source'

export const SETUP_KEY = 'metronome.setup'

/**
 * Bumped when the stored shape changes. Anything else is discarded whole — the
 * per-value fallback below is for a bad *value*, not for a shape we stopped
 * understanding.
 */
export const SETUP_VERSION = 1

export const DEFAULT_BPM = 100

/** The click, because it is what a first-time visitor gets for one small file. */
export const DEFAULT_SOURCE: SourceId = 'click'

export interface Setup {
  readonly bpm: number
  readonly source: SourceId
}

export const DEFAULT_SETUP: Setup = {
  bpm: DEFAULT_BPM,
  source: DEFAULT_SOURCE,
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

/** `isTempo` takes a number, so the type guard comes first. */
const isStoredTempo = (value: unknown): value is number =>
  typeof value === 'number' && isTempo(value)

/**
 * Reads what was stored, validating each value on its own: a bad tempo falls
 * back without taking a good groove with it, and the other way round. The
 * failure this protects against is a release renaming a groove, and discarding
 * everything would then forget the tempo too.
 *
 * Never throws. Private mode, a refused read and unparseable JSON all return
 * the defaults — a metronome that will not open because of a storage quota is
 * worse than one that forgot the tempo.
 */
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

  // An array needs no guard of its own: it carries no `version`, so the check
  // below rejects it. An `Array.isArray` test here was unreachable — no
  // mutation of it could fail a test, which is how it was found.
  const stored = parsed as Record<string, unknown>
  if (stored.version !== SETUP_VERSION) return DEFAULT_SETUP

  return {
    bpm: isStoredTempo(stored.bpm) ? stored.bpm : DEFAULT_BPM,
    source: isSourceId(stored.source) ? stored.source : DEFAULT_SOURCE,
  }
}

/**
 * Never throws. A refused write is a tempo that is not remembered, which is not
 * worth an error the player can do nothing about.
 */
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
