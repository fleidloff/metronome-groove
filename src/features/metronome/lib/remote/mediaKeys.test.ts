import { describe, expect, it, vi } from 'vitest'
import { bindMediaKeys } from './mediaKeys'

/** A MediaSession that records what was set, and can refuse like Firefox. */
function fakeSession({ refuse = false } = {}) {
  const handlers = new Map<string, unknown>()
  const setActionHandler = vi.fn((action: string, handler: unknown) => {
    if (refuse) throw new TypeError('unsupported action')
    handlers.set(action, handler)
  })

  const session = {
    setActionHandler,
    metadata: null,
    playbackState: 'none',
  } as unknown as MediaSession

  return {
    session,
    setActionHandler,
    handlers,
    press: () => (handlers.get('pause') as (() => void) | undefined)?.(),
  }
}

const fakeMedia = () => {
  const element = { play: vi.fn(), pause: vi.fn(), remove: vi.fn(), src: 'x' }
  return element as unknown as HTMLAudioElement & { play: ReturnType<typeof vi.fn> }
}

describe('binding the speaker button', () => {
  it('registers a pause handler, which is the only action the hardware sends', () => {
    const device = fakeSession()
    bindMediaKeys(vi.fn(), { session: device.session, media: fakeMedia() })

    expect(device.setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function))
  })

  it('calls back once per press', () => {
    const device = fakeSession()
    const onPress = vi.fn()
    bindMediaKeys(onPress, { session: device.session, media: fakeMedia() })

    device.press()
    device.press()

    expect(onPress).toHaveBeenCalledTimes(2)
  })

  it('tells the system it is playing, so every press arrives as pause', () => {
    const device = fakeSession()
    bindMediaKeys(vi.fn(), { session: device.session, media: fakeMedia() })

    // Left at 'playing' deliberately: the system then believes the page is
    // playing and sends `pause` every time, rather than alternating.
    expect(device.session.playbackState).toBe('playing')
  })

  it('starts the silent media, which is what claims the session at all', () => {
    const device = fakeSession()
    const media = fakeMedia()
    bindMediaKeys(vi.fn(), { session: device.session, media })

    expect(media.play).toHaveBeenCalled()
  })

  it('stops claiming to be playing when torn down', () => {
    // Left at 'playing' with no handler behind it, the session would go on
    // telling the system a closed page is the music.
    const device = fakeSession()
    const release = bindMediaKeys(vi.fn(), {
      session: device.session,
      media: fakeMedia(),
    })

    expect(device.session.playbackState).toBe('playing')
    release()

    expect(device.session.playbackState).toBe('none')
  })

  it('releases everything it took when torn down', () => {
    const device = fakeSession()
    const media = fakeMedia()
    const release = bindMediaKeys(vi.fn(), { session: device.session, media })

    release()

    expect(device.setActionHandler).toHaveBeenCalledWith('pause', null)
    expect(media.pause).toHaveBeenCalled()
    expect(media.remove).toHaveBeenCalled()
  })
})

describe('failing safely', () => {
  it('does not let a throwing element reach the render', () => {
    const angry = {
      play: () => { throw new Error('no') },
      pause: vi.fn(),
      remove: vi.fn(),
    } as unknown as HTMLAudioElement

    expect(() =>
      bindMediaKeys(vi.fn(), { session: fakeSession().session, media: angry }),
    ).not.toThrow()
  })

  it('does not leave an unhandled rejection when autoplay is refused', async () => {
    const refused = {
      play: () => Promise.reject(new DOMException('gesture', 'NotAllowedError')),
      pause: vi.fn(),
      remove: vi.fn(),
    } as unknown as HTMLAudioElement

    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    bindMediaKeys(vi.fn(), { session: fakeSession().session, media: refused })
    await new Promise((resolve) => setTimeout(resolve, 0))
    process.off('unhandledRejection', unhandled)

    expect(unhandled).not.toHaveBeenCalled()
  })

  it('cleans up even when registering half-succeeded', () => {
    // A session that takes the handler and then throws on playbackState was
    // leaking it forever: `bound` was set after the throwing line.
    const handlers = new Map<string, unknown>()
    const session = {
      setActionHandler: (action: string, handler: unknown) => {
        if (handler === null) handlers.delete(action)
        else handlers.set(action, handler)
      },
      get playbackState() { return 'none' },
      set playbackState(_value: string) { throw new TypeError('nope') },
    } as unknown as MediaSession

    const release = bindMediaKeys(vi.fn(), { session, media: fakeMedia() })
    expect(handlers.size).toBe(1)

    release()
    expect(handlers.size).toBe(0)
  })
})

describe('a platform that refuses — the Firefox path', () => {
  it('does not throw, so the rest of the app is untouched', () => {
    const device = fakeSession({ refuse: true })

    expect(() =>
      bindMediaKeys(vi.fn(), { session: device.session, media: fakeMedia() }),
    ).not.toThrow()
  })

  it('is still safe to tear down', () => {
    const device = fakeSession({ refuse: true })
    const release = bindMediaKeys(vi.fn(), {
      session: device.session,
      media: fakeMedia(),
    })

    expect(() => release()).not.toThrow()
  })

  it('binds nothing at all when there is no media session', () => {
    const onPress = vi.fn()
    const release = bindMediaKeys(onPress, { session: undefined, media: fakeMedia() })

    expect(() => release()).not.toThrow()
    expect(onPress).not.toHaveBeenCalled()
  })
})
