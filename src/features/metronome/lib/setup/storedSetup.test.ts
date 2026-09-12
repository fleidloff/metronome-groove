import { describe, expect, it, vi } from 'vitest'
import { MAX_BPM, MIN_BPM } from '../transport/tempo'
import {
  DEFAULT_BPM,
  DEFAULT_COUNT_IN,
  DEFAULT_FILLS,
  DEFAULT_MUTES,
  DEFAULT_SETUP,
  DEFAULT_SOURCE,
  SETUP_KEY,
  SETUP_VERSION,
  type StoredMutes,
  readSetup,
  writeSetup,
} from './storedSetup'

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
  it('opens at 100 bpm on the click, with fills on, the count-in off and nothing muted', () => {
    expect(readSetup(fakeStorage())).toEqual({
      bpm: 100,
      source: 'click',
      fills: true,
      countIn: false,
      mutes: {},
    })
    expect(DEFAULT_BPM).toBe(100)
    expect(DEFAULT_FILLS).toBe(true)
    expect(DEFAULT_COUNT_IN).toBe(false)
    expect(DEFAULT_MUTES).toEqual({})
    expect(DEFAULT_SETUP).toEqual({
      bpm: DEFAULT_BPM,
      source: DEFAULT_SOURCE,
      fills: DEFAULT_FILLS,
      countIn: DEFAULT_COUNT_IN,
      mutes: DEFAULT_MUTES,
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
    writeSetup(
      {
        bpm: 137,
        source: 'straight-funk',
        fills: false,
        countIn: true,
        mutes: DEFAULT_MUTES,
      },
      storage,
    )

    expect(readSetup(storage)).toEqual({
      bpm: 137,
      source: 'straight-funk',
      fills: false,
      countIn: true,
      mutes: {},
    })
  })

  it('stores the version alongside, so a later shape can tell itself apart', () => {
    const storage = fakeStorage()
    writeSetup(
      {
        bpm: 120,
        source: 'click',
        fills: true,
        countIn: false,
        mutes: DEFAULT_MUTES,
      },
      storage,
    )

    expect(JSON.parse(storage.raw() ?? '{}')).toEqual({
      version: SETUP_VERSION,
      bpm: 120,
      source: 'click',
      fills: true,
      countIn: false,
      mutes: {},
    })
  })

  it('keeps both edges of the legal range', () => {
    for (const bpm of [MIN_BPM, MAX_BPM]) {
      const storage = fakeStorage()
      writeSetup(
        {
          bpm,
          source: 'click',
          fills: true,
          countIn: false,
          mutes: DEFAULT_MUTES,
        },
        storage,
      )

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
      countIn: DEFAULT_COUNT_IN,
      mutes: DEFAULT_MUTES,
    })
  })

  it('resets an unknown groove and keeps the tempo', () => {
    const setup = readSetup(
      stored({ version: SETUP_VERSION, bpm: 140, source: 'a-groove-we-removed' }),
    )

    expect(setup).toEqual({
      bpm: 140,
      source: DEFAULT_SOURCE,
      fills: DEFAULT_FILLS,
      countIn: DEFAULT_COUNT_IN,
      mutes: DEFAULT_MUTES,
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
  it('stays at version 1, because V8, V9 and V15 added fields instead of changing the shape', () => {
    expect(SETUP_VERSION).toBe(1)
  })

  it('reads a V7-shaped record complete, whatever the constant later becomes', () => {
    const storage = stored({ version: 1, bpm: 137, source: 'straight-funk' })

    expect(readSetup(storage)).toEqual({
      bpm: 137,
      source: 'straight-funk',
      fills: true,
      countIn: false,
      mutes: {},
    })
  })

  it('reads a V8-shaped record complete, whatever the constant later becomes', () => {
    const storage = stored({
      version: 1,
      bpm: 137,
      source: 'straight-funk',
      fills: false,
    })

    expect(readSetup(storage)).toEqual({
      bpm: 137,
      source: 'straight-funk',
      fills: false,
      countIn: false,
      mutes: {},
    })
  })
})

describe('the fills toggle', () => {
  it('keeps a box that was unticked', () => {
    const storage = fakeStorage()
    writeSetup(
      {
        bpm: 120,
        source: 'straight-funk',
        fills: false,
        countIn: false,
        mutes: DEFAULT_MUTES,
      },
      storage,
    )

    expect(readSetup(storage).fills).toBe(false)
  })

  it('reads a record written before the field existed as fills on', () => {
    const setup = readSetup(
      stored({ version: SETUP_VERSION, bpm: 137, source: 'straight-funk' }),
    )

    expect(setup).toEqual({
      bpm: 137,
      source: 'straight-funk',
      fills: DEFAULT_FILLS,
      countIn: DEFAULT_COUNT_IN,
      mutes: DEFAULT_MUTES,
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
        countIn: DEFAULT_COUNT_IN,
        mutes: DEFAULT_MUTES,
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
      countIn: DEFAULT_COUNT_IN,
      mutes: DEFAULT_MUTES,
    })
  })
})

describe('the count-in box', () => {
  it('is off for a player who has never touched it', () => {
    expect(readSetup(fakeStorage()).countIn).toBe(false)
  })

  it('keeps a box that was ticked', () => {
    const storage = fakeStorage()
    writeSetup(
      {
        bpm: 120,
        source: 'straight-funk',
        fills: true,
        countIn: true,
        mutes: DEFAULT_MUTES,
      },
      storage,
    )

    expect(readSetup(storage).countIn).toBe(true)
  })

  it('reads a record written before the field existed as count-in off', () => {
    const setup = readSetup(
      stored({
        version: SETUP_VERSION,
        bpm: 137,
        source: 'straight-funk',
        fills: false,
      }),
    )

    expect(setup).toEqual({
      bpm: 137,
      source: 'straight-funk',
      fills: false,
      countIn: false,
      mutes: DEFAULT_MUTES,
    })
  })

  it('resets a countIn that is the wrong type and keeps the other three', () => {
    for (const countIn of ['true', 'false', 0, 1, null, {}, []]) {
      const setup = readSetup(
        stored({
          version: SETUP_VERSION,
          bpm: 137,
          source: 'straight-funk',
          fills: false,
          countIn,
        }),
      )

      expect(setup, JSON.stringify(countIn)).toEqual({
        bpm: 137,
        source: 'straight-funk',
        fills: false,
        countIn: DEFAULT_COUNT_IN,
        mutes: DEFAULT_MUTES,
      })
    }
  })

  it('survives a bad tempo and an unknown groove beside it', () => {
    const setup = readSetup(
      stored({
        version: SETUP_VERSION,
        bpm: 9999,
        source: 'a-groove-we-removed',
        fills: false,
        countIn: true,
      }),
    )

    expect(setup).toEqual({
      bpm: DEFAULT_BPM,
      source: DEFAULT_SOURCE,
      fills: false,
      countIn: true,
      mutes: DEFAULT_MUTES,
    })
  })
})

describe('the mute sets', () => {
  it('are empty for a player who has never muted anything', () => {
    expect(readSetup(fakeStorage()).mutes).toEqual({})
    expect(DEFAULT_MUTES).toEqual({})
  })

  it('reads a record written before the field existed with nothing muted and the stored tempo intact', () => {
    const setup = readSetup(
      stored({
        version: SETUP_VERSION,
        bpm: 137,
        source: 'straight-funk',
        fills: false,
        countIn: true,
      }),
    )

    expect(setup).toEqual({
      bpm: 137,
      source: 'straight-funk',
      fills: false,
      countIn: true,
      mutes: {},
    })
    expect(setup.bpm).toBe(137)
  })

  it('round-trips a set for each of two grooves', () => {
    const storage = fakeStorage()
    const mutes: StoredMutes = {
      rock: ['hat'],
      'straight-funk': ['kick', 'snare'],
    }
    writeSetup(
      { bpm: 92, source: 'rock', fills: true, countIn: false, mutes },
      storage,
    )

    expect(readSetup(storage).mutes).toEqual(mutes)
  })

  it('keeps a set under the groove it was stored for', () => {
    const setup = readSetup(
      stored({
        version: SETUP_VERSION,
        bpm: 92,
        source: 'rock',
        fills: true,
        countIn: false,
        mutes: { rock: ['hat'] },
      }),
    )

    expect(setup.mutes.rock).toEqual(['hat'])
    expect(setup.mutes['straight-funk']).toBeUndefined()
  })

  it('drops a set stored under a groove that no longer exists', () => {
    const setup = readSetup(
      stored({
        version: SETUP_VERSION,
        bpm: 92,
        source: 'rock',
        fills: true,
        countIn: false,
        mutes: { rock: ['hat'], 'a-groove-we-removed': ['kick'] },
      }),
    )

    expect(setup.mutes).toEqual({ rock: ['hat'] })
  })

  it('drops a voice the row cannot show and keeps the rest of the set', () => {
    const setup = readSetup(
      stored({
        version: SETUP_VERSION,
        bpm: 92,
        source: 'rock',
        fills: true,
        countIn: false,
        mutes: { rock: ['hat', 'cowbell', 7, null] },
      }),
    )

    expect(setup.mutes).toEqual({ rock: ['hat'] })
  })

  it('drops an entry whose set is not an array and keeps the entries beside it', () => {
    const setup = readSetup(
      stored({
        version: SETUP_VERSION,
        bpm: 92,
        source: 'rock',
        fills: true,
        countIn: false,
        mutes: { rock: ['hat'], 'straight-funk': 'kick' },
      }),
    )

    expect(setup.mutes).toEqual({ rock: ['hat'] })
  })

  it('resets a mutes that is not an object and keeps the other four', () => {
    for (const mutes of ['rock', 7, null, [], ['rock'], true]) {
      const setup = readSetup(
        stored({
          version: SETUP_VERSION,
          bpm: 137,
          source: 'straight-funk',
          fills: false,
          countIn: true,
          mutes,
        }),
      )

      expect(setup, JSON.stringify(mutes)).toEqual({
        bpm: 137,
        source: 'straight-funk',
        fills: false,
        countIn: true,
        mutes: {},
      })
    }
  })
})

describe('a shape we no longer understand', () => {
  it('is discarded whole, rather than falling back field by field', () => {
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
      writeSetup(
        {
          bpm: 120,
          source: 'click',
          fills: true,
          countIn: false,
          mutes: DEFAULT_MUTES,
        },
        storage,
      ),
    ).not.toThrow()
  })

  it('survives a browser where reaching for storage throws', () => {
    const exploding = {
      get localStorage(): Storage {
        throw new DOMException('blocked', 'SecurityError')
      },
    }
    vi.stubGlobal('window', exploding)

    expect(() => readSetup()).not.toThrow()
    expect(readSetup()).toEqual(DEFAULT_SETUP)
    expect(() =>
      writeSetup({
        bpm: 120,
        source: 'click',
        fills: true,
        countIn: false,
        mutes: DEFAULT_MUTES,
      }),
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
