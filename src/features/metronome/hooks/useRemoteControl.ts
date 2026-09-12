'use client'

import { useEffect, useRef } from 'react'
import { bindMediaKeys, type MediaKeysOptions } from '../lib/remote/mediaKeys'

/**
 * Lets the speaker's button start and stop the click.
 *
 * Binds once and holds the handler in a ref, because the caller's `onPress`
 * closes over whether the click is running — rebinding on every render would
 * churn the media session, and calling a stale handler would start a click that
 * is already going.
 *
 * Does nothing at all on a platform that refuses the session. That is Firefox,
 * it is expected, and it is silent: there is nothing the player could do.
 */
export function useRemoteControl(
  onPress: () => void,
  { armed = true, ...options }: MediaKeysOptions & { armed?: boolean } = {},
): void {
  const latest = useRef(onPress)

  // Kept current in an effect rather than during render — a ref written while
  // rendering is a bug React 19 lints for, and this one only needs to be right
  // by the time a button is pressed.
  useEffect(() => {
    latest.current = onPress
  }, [onPress])

  // Bound once armed, then for the life of the page. The options are read
  // through a ref rather than a dependency because they are a *resource* — a
  // caller passing `createSilentMedia()` inline would otherwise tear the media
  // session down and rebuild it on every render.
  const held = useRef(options)

  // **Armed by a user gesture, never on mount.** Claiming a media session means
  // playing an element, and a browser refuses that before the page has been
  // interacted with — `NotAllowedError`, and the session is never claimed. So
  // the speaker's button starts working after the first press of Start on the
  // phone, which is the gesture the AudioContext needs anyway.
  useEffect(() => {
    if (!armed) return
    return bindMediaKeys(() => latest.current(), held.current)
  }, [armed])
}
