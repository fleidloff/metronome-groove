'use client'

import { useEffect, useRef } from 'react'
import { bindMediaKeys, type MediaKeysOptions } from '../lib/remote/mediaKeys'

export function useRemoteControl(
  onPress: () => void,
  { armed = true, ...options }: MediaKeysOptions & { armed?: boolean } = {},
): void {
  const latest = useRef(onPress)

  // React 19 lints a ref written during render.
  useEffect(() => {
    latest.current = onPress
  }, [onPress])

  // Read through a ref: an inline options object as a dependency would
  // rebuild the media session on every render.
  const held = useRef(options)

  // A browser refuses a media session before a user gesture: NotAllowedError.
  useEffect(() => {
    if (!armed) return
    return bindMediaKeys(() => latest.current(), held.current)
  }, [armed])
}
