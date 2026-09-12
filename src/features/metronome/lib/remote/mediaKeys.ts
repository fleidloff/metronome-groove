import { createSilentMedia } from './silentMedia'

// With `playbackState` at `playing`, hardware buttons deliver `pause` on every
// press and never `play`. See docs/adr/0004-bluetooth-media-buttons.md.
const ACTION = 'pause' as const

export interface MediaKeysOptions {
  session?: MediaSession
  media?: HTMLAudioElement
}

const sessionOf = (given?: MediaSession) =>
  given ??
  (typeof navigator !== 'undefined' && 'mediaSession' in navigator
    ? navigator.mediaSession
    : undefined)

export function bindMediaKeys(
  onPress: () => void,
  { session, media }: MediaKeysOptions = {},
): () => void {
  const live = sessionOf(session)
  const element = media ?? createSilentMedia()
  if (!element) return () => {}
  let bound = false

  // Without media playing, the action handler is registered and never called.
  // Chrome judges autoplay by `muted` and `volume` rather than by the samples,
  // so this needs a user gesture however silent the element is.
  try {
    const playing = element.play?.()
    if (playing && typeof playing.catch === 'function') playing.catch(() => {})
  } catch {
    // An element that throws synchronously must not reach a render.
  }

  if (live) {
    try {
      live.setActionHandler(ACTION, onPress)
      bound = true
      live.playbackState = 'playing'
    } catch {
      // Firefox refuses to take a handler at all.
    }
  }

  return () => {
    if (live && bound) {
      try {
        live.setActionHandler(ACTION, null)
        live.playbackState = 'none'
      } catch {
        // Releasing a handler a platform never took is not an error.
      }
    }
    element.pause?.()
    element.remove?.()
  }
}
