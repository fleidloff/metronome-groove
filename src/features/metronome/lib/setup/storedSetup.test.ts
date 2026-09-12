import { describe, expect, it, vi } from 'vitest'
import { MAX_BPM, MIN_BPM } from '../transport/tempo'
import {
  DEFAULT_BPM,
  DEFAULT_SETUP,
  DEFAULT_SOURCE,
  SETUP_KEY,
  SETUP_VERSION,
  readSetup,
  writeSetup,
} from './storedSetup'

/** A storage that can be told to misbehave the way a real one does. */
function fakeStorage({
  onGet,
  onSet,
}: { onGet?: () => never; onSet?: () => never } = {}) {
  const held = new Map<string, string>()
  return {
    getItem: (key: string) => {
      onGet?.()
      return held.get(key) ?? null
    },
    setItem: (key: string, value: string) => {
      onSet?.()
      held.set(key, value)
    },
    removeItem: (key: string) => void held.delete(key),
    clear: () => held.clear(),
    key: () => null,
    length: 0,
    /** What is actually on disk, for a test to inspect or corrupt. */
    raw: () => held.get(SETUP_KEY) ?? null,
    put: (value: string) => held.set(SETUP_KEY, value),
  } as unknown as Storage & { raw: () => string | null; put: (v: string) => void }
}

const stored = (value: unknown) => {
  const storage = fakeStorage()
  storage.put(JSON.stringify(value))
  return storage
}

describe('a first visit', () => {
  it('opens at 100 bpm on the click', () => {
    expect(readSetup(fakeStorage())).toEqual({ bpm: 100, source: 'click' })
    expect(DEFAULT_BPM).toBe(100)
    expect(DEFAULT_SETUP).toEqual({ bpm: DEFAULT_BPM, source: DEFAULT_SOURCE })
  })

  it('writes nothing by being read', () => {
    const storage = fakeStorage()
    readSetup(storage)

    expect(storage.raw()).toBeNull()
  })
})

describe('a round trip', () => {
  it('gives back what went in', () => {
    const storage = fakeStorage()
    writeSetup({ bpm: 137, source: 'straight-funk' }, storage)

    expect(readSetup(storage)).toEqual({ bpm: 137, source: 'straight-funk' })
  })

  it('stores the version alongside, so a later shape can tell itself apart', () => {
    const storage = fakeStorage()
    writeSetup({ bpm: 120, source: 'click' }, storage)

    expect(JSON.parse(storage.raw() ?? '{}')).toEqual({
      version: SETUP_VERSION,
      bpm: 120,
      source: 'click',
    })
  })

  it('keeps both edges of the legal range', () => {
    for (const bpm of [MIN_BPM, MAX_BPM]) {
      const storage = fakeStorage()
      writeSetup({ bpm, source: 'click' }, storage)

      expect(readSetup(storage).bpm, `${bpm}`).toBe(bpm)
    }
  })
})

describe('each value falls back on its own', () => {
  it('resets an impossible tempo and keeps the groove', () => {
    const setup = readSetup(
      stored({ version: SETUP_VERSION, bpm: 9999, source: 'straight-funk' }),
    )

    expect(setup).toEqual({ bpm: DEFAULT_BPM, source: 'straight-funk' })
  })

  it('resets an unknown groove and keeps the tempo', () => {
    // The case this rule exists for: a release renames a groove, and throwing
    // the whole setup away would forget the tempo the player cared about.
    const setup = readSetup(
      stored({ version: SETUP_VERSION, bpm: 140, source: 'a-groove-we-removed' }),
    )

    expect(setup).toEqual({ bpm: 140, source: DEFAULT_SOURCE })
  })

  it('resets a tempo that is the wrong type entirely', () => {
    for (const bpm of ['120', null, {}, [], Number.NaN, Infinity]) {
      const setup = readSetup(stored({ version: SETUP_VERSION, bpm, source: 'click' }))
      expect(setup.bpm, JSON.stringify(bpm)).toBe(DEFAULT_BPM)
    }
  })

  it('resets both when both are wrong', () => {
    expect(
      readSetup(stored({ version: SETUP_VERSION, bpm: 1, source: 7 })),
    ).toEqual(DEFAULT_SETUP)
  })
})

describe('a shape we no longer understand', () => {
  it('is discarded whole, rather than falling back field by field', () => {
    // A wrong version is not a bad value — it is a shape whose meaning we
    // cannot vouch for, so even a plausible field is not trusted.
    const setup = readSetup(
      stored({ version: SETUP_VERSION + 1, bpm: 140, source: 'straight-funk' }),
    )

    expect(setup).toEqual(DEFAULT_SETUP)
  })

  it('is discarded when the version is missing altogether', () => {
    expect(readSetup(stored({ bpm: 140, source: 'straight-funk' }))).toEqual(
      DEFAULT_SETUP,
    )
  })
})

describe('storage that will not cooperate', () => {
  it('returns the defaults for junk that is not JSON', () => {
    const storage = fakeStorage()
    storage.put('{not json')

    expect(readSetup(storage)).toEqual(DEFAULT_SETUP)
  })

  it('returns the defaults for JSON that is not an object', () => {
    for (const shape of ['null', '[]', '42', '"click"']) {
      const storage = fakeStorage()
      storage.put(shape)
      expect(readSetup(storage), shape).toEqual(DEFAULT_SETUP)
    }
  })

  it('returns the defaults when reading throws, as in private mode', () => {
    const storage = fakeStorage({
      onGet: () => {
        throw new DOMException('denied', 'SecurityError')
      },
    })

    expect(() => readSetup(storage)).not.toThrow()
    expect(readSetup(storage)).toEqual(DEFAULT_SETUP)
  })

  it('does not throw when writing is refused, as on a full quota', () => {
    const storage = fakeStorage({
      onSet: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
    })

    expect(() => writeSetup({ bpm: 120, source: 'click' }, storage)).not.toThrow()
  })

  it('survives a browser where reaching for storage throws', () => {
    // Some policies make the property access itself throw, before any method
    // is called. Nothing reached this guard until it was tested directly.
    const exploding = {
      get localStorage(): Storage {
        throw new DOMException('blocked', 'SecurityError')
      },
    }
    vi.stubGlobal('window', exploding)

    expect(() => readSetup()).not.toThrow()
    expect(readSetup()).toEqual(DEFAULT_SETUP)
    expect(() => writeSetup({ bpm: 120, source: 'click' })).not.toThrow()

    vi.unstubAllGlobals()
  })

  it('returns the defaults with no storage at all, as on a server', () => {
    vi.stubGlobal('window', undefined)
    expect(readSetup()).toEqual(DEFAULT_SETUP)
    expect(() => writeSetup(DEFAULT_SETUP)).not.toThrow()
    vi.unstubAllGlobals()
  })
})
