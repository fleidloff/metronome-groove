'use client'

import { useEffect, useRef, useState } from 'react'
import { app } from '@/lib/snippets'
import { useClickTransport } from '../hooks/useClickTransport'
import { useRemoteControl } from '../hooks/useRemoteControl'
import { clampTempo } from '../lib/click/tempo'
import {
  addTap,
  commit,
  EMPTY_TAPS,
  windowFor,
  type TapState,
} from '../lib/tap/tapTempo'
import { BeatRow } from './BeatRow'
import { StartStopButton } from './StartStopButton'
import { TapTempoButton } from './TapTempoButton'
import { TempoControl } from './TempoControl'

/** What the component needs of the click, so it can be rendered without one.
 *  `onBeat` reports the *audible* beat and returns its own teardown. */
export interface Transport {
  start(bpm: number): void
  stop(): void
  setTempo(bpm: number): void
  /** Silences the click but remembers it was running, so it can return at a new
   *  tempo without the player pressing start again. */
  suspend(): void
  /** Returns at `bpm`, on a fresh bar, only if `suspend` had been called while
   *  running. A no-op otherwise. */
  resume(bpm: number): void
  onBeat(listener: (beat: number) => void): () => void
}

const DEFAULT_BPM = 120

/** Monotonic seconds, to match what `addTap` expects. */
const systemClock = () => performance.now() / 1000

/**
 * `transport` is injected by tests. Left out, the real one is used — and it
 * builds no AudioContext until start is pressed, both because a browser
 * refuses one before a user gesture and because that keeps this render inert
 * under jsdom.
 */
export function Metronome({
  transport,
  now = systemClock,
}: {
  transport?: Transport
  now?: () => number
}) {
  const audioTransport = useClickTransport()
  const click = transport ?? audioTransport
  const [bpm, setBpm] = useState(DEFAULT_BPM)
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState<number | null>(null)
  const [armed, setArmed] = useState(false)
  const attempt = useRef({
    state: EMPTY_TAPS as TapState,
    timer: null as ReturnType<typeof setTimeout> | null,
  })

  useEffect(() => click.onBeat(setBeat), [click])

  useEffect(() => {
    const live = attempt.current

    return () => {
      if (live.timer !== null) clearTimeout(live.timer)
      live.timer = null
    }
  }, [])

  useEffect(
    () => () => {
      click.stop()
    },
    [click],
  )

  /**
   * Any touch of any control arms the speaker's button.
   *
   * A browser will not let a page that has never been interacted with play,
   * and without playing we cannot claim a media session — so the speaker is
   * dead until the player touches *something*. Which control they touch first
   * is not ours to predict: they might tap a tempo, or drag the slider, before
   * ever pressing Start.
   */
  const arm = () => setArmed(true)

  const toggle = () => {
    arm()

    if (running) {
      click.stop()
      setBeat(null)
    } else {
      click.start(bpm)
    }
    setRunning(!running)
  }

  const settle = (state: TapState) => {
    attempt.current.state = state
  }

  const stopWaiting = () => {
    const live = attempt.current
    if (live.timer !== null) clearTimeout(live.timer)
    live.timer = null
  }

  /**
   * Tapping has no finish line. Each tap silences the click, restarts the
   * two-second window, and adds itself; the *silence* is what commits, so more
   * taps make a better answer rather than overrunning a count.
   */
  const tap = () => {
    arm()

    const live = attempt.current
    const at = now()

    if (live.state.taps.length === 0) click.suspend()
    stopWaiting()

    const next = addTap(live.state, at)
    settle(next)

    // Two beats of whatever is being tapped — so the wait shortens as soon as
    // there is evidence of what the tempo is.
    live.timer = setTimeout(() => {
      const result = commit(next)
      settle(EMPTY_TAPS)

      // A refused or empty attempt leaves the tempo alone, but the click still
      // comes back — a stray press must never be a way to get stranded silent.
      if (result.kind === 'tempo') setBpm(result.bpm)
      click.resume(result.kind === 'tempo' ? result.bpm : bpm)
    }, windowFor(next) * 1000)
  }

  // The speaker's button is the Start/Stop control, pressed from across the
  // room. Armed by the first on-screen press, because a browser will not let a
  // page claim a media session before the player has touched it. Does nothing
  // at all on a browser that refuses the session.
  useRemoteControl(toggle, { armed })

  const changeTempo = (next: number) => {
    arm()

    const tempo = clampTempo(next)
    setBpm(tempo)
    click.setTempo(tempo)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-between gap-12 px-6 py-12">
      <h1 className="text-sm font-medium uppercase tracking-[0.3em] text-muted">
        {app.name}
      </h1>
      <BeatRow current={beat} />
      <TempoControl bpm={bpm} onChange={changeTempo} />
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        <StartStopButton running={running} onToggle={toggle} />
        <TapTempoButton onTap={tap} />
      </div>
    </main>
  )
}
