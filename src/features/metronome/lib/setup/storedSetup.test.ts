import { describe, expect, it, vi } from 'vitest'
import { MAX_BPM, MIN_BPM } from '../transport/tempo'
import {
  DEFAULT_BPM,
  DEFAULT_FILLS,
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
  it('opens at 100 bpm on the click, with fills on', () => {
    expect(readSetup(fakeStorage())).toEqual({
      bpm: 100,
      source: 'click',
      fills: true,
    })
    expect(DEFAULT_BPM).toBe(100)
    expect(DEFAULT_FILLS).toBe(true)
    expect(DEFAULT_SETUP).toEqual({
      bpm: DEFAULT_BPM,
      source: DEFAULT_SOURCE,
      fills: DEFAULT_FILLS,
    })
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
    writeSetup({ bpm: 137, source: 'straight-funk', fills: false }, storage)

    expect(readSetup(storage)).toEqual({
      bpm: 137,
      source: 'straight-funk',
      fills: false,
    })
  })

  it('stores the version alongside, so a later shape can tell itself apart', () => {
    const storage = fakeStorage()
    writeSetup({ bpm: 120, source: 'click', fills: true }, storage)

    expect(JSON.parse(storage.raw() ?? '{}')).toEqual({
      version: SETUP_VERSION,
      bpm: 120,
      source: 'click',
      fills: true,
    })
  })

  it('keeps both edges of the legal range', () => {
    for (const bpm of [MIN_BPM, MAX_BPM]) {
      const storage = fakeStorage()
      writeSetup({ bpm, source: 'click', fills: true }, storage)

      expect(readSetup(storage).bpm, `${bpm}`).toBe(bpm)
    }
  })
})

describe('each value falls back on its own', () => {
  it('resets an impossible tempo and keeps the groove', () => {
    const setup = readSetup(
      stored({ version: SETUP_VERSION, bpm: 9999, source: 'straight-funk' }),
    )

    expect(setup).toEqual({
      bpm: DEFAULT_BPM,
      source: 'straight-funk',
      fills: DEFAULT_FILLS,
    })
  })

  it('resets an unknown groove and keeps the tempo', () => {
    // The case this rule exists for: a release renames a groove, and throwing
    // the whole setup away would forget the tempo the player cared about.
    const setup = readSetup(
      stored({ version: SETUP_VERSION, bpm: 140, source: 'a-groove-we-removed' }),
    )

    expect(setup).toEqual({
      bpm: 140,
      source: DEFAULT_SOURCE,
      fills: DEFAULT_FILLS,
    })
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

describe('the stored shape', () => {
  it('stays at version 1, because V8 added a field instead of changing the shape', () => {
    // Every other case here writes AND reads through SETUP_VERSION, so a bump
    // would leave them all green while silently discarding every stored tempo
    // in the wild. V8 added `fills` with a per-value default, which is exactly
    // the case the per-value fallback exists for and exactly what a bump is
    // not for. Pinning the literal is what makes a future bump fail here, with
    // this reason attached, rather than in four component tests that do not
    // say why.
    expect(SETUP_VERSION).toBe(1)
  })

  it('reads a record at the pinned version, whatever the constant later becomes', () => {
    const storage = stored({ version: 1, bpm: 137, source: 'straight-funk' })

    expect(readSetup(storage)).toEqual({
      bpm: 137,
      source: 'straight-funk',
      fills: true,
    })
  })
})

describe('the fills toggle', () => {
  it('keeps a box that was unticked', () => {
    const storage = fakeStorage()
    writeSetup({ bpm: 120, source: 'straight-funk', fills: false }, storage)

    expect(readSetup(storage).fills).toBe(false)
  })

  it('reads a record written before the field existed as fills on', () => {
    // The version is deliberately not bumped: adding a field with a default is
    // what the per-value fallback is for, and a bump would have discarded
    // everyone's stored tempo to gain nothing.
    const setup = readSetup(
      stored({ version: SETUP_VERSION, bpm: 137, source: 'straight-funk' }),
    )

    expect(setup).toEqual({
      bpm: 137,
      source: 'straight-funk',
      fills: DEFAULT_FILLS,
    })
  })

  it('resets a fills that is the wrong type and keeps the tempo and the groove', () => {
    for (const fills of ['true', 'false', 0, 1, null, {}, []]) {
      const setup = readSetup(
        stored({
          version: SETUP_VERSION,
          bpm: 137,
          source: 'straight-funk',
          fills,
        }),
      )

      expect(setup, JSON.stringify(fills)).toEqual({
        bpm: 137,
        source: 'straight-funk',
        fills: DEFAULT_FILLS,
      })
    }
  })

  it('survives a bad tempo beside it, each falling back on its own', () => {
    const setup = readSetup(
      stored({
        version: SETUP_VERSION,
        bpm: 9999,
        source: 'straight-funk',
        fills: false,
      }),
    )

    expect(setup).toEqual({
      bpm: DEFAULT_BPM,
      source: 'straight-funk',
      fills: false,
    })
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

    expect(() =>
      writeSetup({ bpm: 120, source: 'click', fills: true }, storage),
    ).not.toThrow()
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
    expect(() =>
      writeSetup({ bpm: 120, source: 'click', fills: true }),
    ).not.toThrow()

    vi.unstubAllGlobals()
  })

  it('returns the defaults with no storage at all, as on a server', () => {
    vi.stubGlobal('window', undefined)
    expect(readSetup()).toEqual(DEFAULT_SETUP)
    expect(() => writeSetup(DEFAULT_SETUP)).not.toThrow()
    vi.unstubAllGlobals()
  })
})
