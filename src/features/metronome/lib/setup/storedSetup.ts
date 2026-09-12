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

/**
 * On, including for a first-time visitor. A ticked box is not setup — what the
 * persona rules out is something you must *do* before you hear anything, and
 * off by default would ship the groove's best sound switched off.
 */
export const DEFAULT_FILLS = true

/**
 * Off, unlike `fills`. The count-in is for playing along from a standing
 * start, and someone looping a groove to practise over does not want to hear
 * it on every restart.
 */
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
    // A record written before this field existed has no `fills` key, and the
    // per-value fallback is what lets it read back complete rather than
    // costing everyone the tempo a version bump would have discarded.
    fills: typeof stored.fills === 'boolean' ? stored.fills : DEFAULT_FILLS,
    countIn:
      typeof stored.countIn === 'boolean' ? stored.countIn : DEFAULT_COUNT_IN,
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
