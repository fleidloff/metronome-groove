import { createSilentMedia } from './silentMedia'

/**
 * The only action the hardware actually delivers.
 *
 * With `playbackState` left at `playing`, the system believes the page is
 * playing and sends `pause` on every press — one signal every time, rather
 * than an alternation between `play` and `pause` that we would have to track.
 * Measured on a real speaker; see docs/adr/0004-bluetooth-media-buttons.md.
 */
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

/**
 * Binds the speaker's button to `onPress`, and returns a teardown that releases
 * the handler and the silent media it took.
 *
 * Every step is defensive. A platform that refuses — Firefox does — degrades to
 * doing nothing at all, rather than throwing into a render: there is no message
 * for the player, because there is nothing they could do about it.
 */
export function bindMediaKeys(
  onPress: () => void,
  { session, media }: MediaKeysOptions = {},
): () => void {
  const live = sessionOf(session)
  const element = media ?? createSilentMedia()
  // No document (a server render) means nothing to claim a session with.
  if (!element) return () => {}
  let bound = false

  // The silent media is what makes the browser believe we are playing at all;
  // without it the handler is registered and never called.
  //
  // **This needs a user gesture.** Chrome judges autoplay by `muted` and
  // `volume`, not by the samples, so an unmuted element played on mount is
  // refused with NotAllowedError however silent it is — which is why the
  // caller arms this on the first press rather than on render.
  try {
    const playing = element.play?.()
    // Rejects when no gesture has happened. Nothing to recover: the caller
    // arms again on the next gesture.
    if (playing && typeof playing.catch === 'function') playing.catch(() => {})
  } catch {
    // A synchronous throw from a caller's element must not reach a render.
  }

  if (live) {
    try {
      // Set before anything else can throw, so teardown always knows to clean
      // up — an exception between registering and flagging would otherwise
      // leak the handler for the life of the page.
      live.setActionHandler(ACTION, onPress)
      bound = true
      live.playbackState = 'playing'
    } catch {
      // Firefox. Nothing to do and nothing to say.
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
