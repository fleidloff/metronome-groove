import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRemoteControl } from './useRemoteControl'

function fakeSession() {
  const handlers = new Map<string, unknown>()
  const session = {
    setActionHandler: vi.fn((action: string, handler: unknown) => {
      if (handler === null) handlers.delete(action)
      else handlers.set(action, handler)
    }),
    metadata: null,
    playbackState: 'none',
  } as unknown as MediaSession

  return {
    session,
    press: () => (handlers.get('pause') as (() => void) | undefined)?.(),
    bound: () => handlers.size,
  }
}

const fakeMedia = () =>
  ({ play: vi.fn(), pause: vi.fn(), remove: vi.fn() }) as unknown as HTMLAudioElement

function mount(onPress: () => void, device: ReturnType<typeof fakeSession>) {
  function Probe() {
    useRemoteControl(onPress, { session: device.session, media: fakeMedia() })
    return null
  }
  return render(<Probe />)
}

describe('the speaker as a remote', () => {
  it('binds on mount and calls back on a press', () => {
    const device = fakeSession()
    const onPress = vi.fn()
    mount(onPress, device)

    device.press()

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('unbinds on unmount, so a closed page does not hold the buttons', () => {
    const device = fakeSession()
    const view = mount(vi.fn(), device)

    expect(device.bound()).toBe(1)
    view.unmount()

    expect(device.bound()).toBe(0)
  })

  it('always calls the latest handler, not the one it bound with', () => {
    const device = fakeSession()
    const first = vi.fn()
    const second = vi.fn()

    function Probe({ onPress }: { onPress: () => void }) {
      useRemoteControl(onPress, { session: device.session, media: fakeMedia() })
      return null
    }

    const view = render(<Probe onPress={first} />)
    view.rerender(<Probe onPress={second} />)
    device.press()

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('does not rebind on every render', () => {
    const device = fakeSession()
    function Probe({ onPress }: { onPress: () => void }) {
      useRemoteControl(onPress, { session: device.session, media: fakeMedia() })
      return null
    }

    const view = render(<Probe onPress={vi.fn()} />)
    const afterMount = vi.mocked(device.session.setActionHandler).mock.calls.length
    view.rerender(<Probe onPress={vi.fn()} />)

    expect(vi.mocked(device.session.setActionHandler).mock.calls.length).toBe(
      afterMount,
    )
  })
})
