'use client'

import { useEffect, useRef, useState } from 'react'
import { PageFrame } from '@/components/layout/PageFrame'
import { Stack } from '@/components/layout/Stack'
import { Eyebrow } from '@/components/typography/Eyebrow'
import { FinePrint } from '@/components/typography/FinePrint'
import { app } from '@/lib/snippets'
import { useClickTransport } from '../hooks/useClickTransport'
import { useRemoteControl } from '../hooks/useRemoteControl'
import type { SourceId } from '../lib/transport/source'
import {
  DEFAULT_BPM,
  DEFAULT_FILLS,
  DEFAULT_SOURCE,
  readSetup,
  writeSetup,
} from '../lib/setup/storedSetup'
import { clampTempo } from '../lib/transport/tempo'
import {
  addTap,
  commit,
  EMPTY_TAPS,
  windowFor,
  type TapState,
} from '../lib/tap/tapTempo'
import { BeatRow } from './BeatRow'
import { FillsToggle } from './FillsToggle'
import { SourceSelect } from './SourceSelect'
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
  /**
   * Which source sounds. Selecting one is what starts its samples downloading,
   * so a player who never leaves the click never fetches the kit.
   *
   * Optional, with `onLoadingChange`, so a test can drive the click alone.
   */
  select?(id: SourceId): void
  /** Reports whether the selected source's samples are still arriving, and
   *  reports the current answer on subscribing. */
  onLoadingChange?(listener: (loading: boolean) => void): () => void
  /**
   * Whether the groove plays its marked bars. The transport reads this per
   * queued step, so it lands on the next unqueued one — nothing is rebuilt and
   * a run in progress is not interrupted.
   *
   * Optional, like `select`, so a test can drive the click alone.
   */
  setFills?(on: boolean): void
}

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
  const [source, setSource] = useState<SourceId>(DEFAULT_SOURCE)
  const [fills, setFills] = useState(DEFAULT_FILLS)
  const [restored, setRestored] = useState(false)
  /** What the transport has been told, so it is not told the same thing twice. */
  const told = useRef<SourceId>(DEFAULT_SOURCE)
  /** The samples are still arriving. Only worth saying once sound has been
   *  asked for — before that the control's job is to offer the press. */
  const [loading, setLoading] = useState(false)
  const attempt = useRef({
    state: EMPTY_TAPS as TapState,
    timer: null as ReturnType<typeof setTimeout> | null,
  })

  useEffect(() => click.onBeat(setBeat), [click])

  useEffect(() => click.onLoadingChange?.(setLoading), [click])

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

  /**
   * Read **after** mount, not during render.
   *
   * This route is statically prerendered, so the server's HTML carries the
   * defaults and cannot know what any one player stored. Seeding state from
   * storage during render therefore hydrates a different value than the markup
   * says — React recovers by throwing the server tree away and re-rendering on
   * the client, which works but is an error path with a flash. Applying it a
   * frame later is the same outcome without the error.
   */
  /* eslint-disable react-hooks/set-state-in-effect -- reading a client-only
     store on mount is the one shape this rule cannot express. The alternatives
     are worse: seeding during render hydrates against prerendered defaults and
     makes React throw the server tree away, and useSyncExternalStore hands back
     a value that useState would still only read on the client — the same
     mismatch by another route. */
  useEffect(() => {
    const stored = readSetup()
    setBpm(stored.bpm)
    setSource(stored.source)
    setFills(stored.fills)
    setRestored(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * The transport is told from an effect for the same reason the setup is
   * persisted from one: a restore goes *around* the handlers. Selecting in
   * `changeSource` alone left a reloaded page showing straight-funk in the box
   * and playing the click, because nothing had told the transport.
   *
   * `told` mirrors what the transport already has, starting at its own default.
   * That single guard does all the work: before the restore lands, `source` is
   * still the default and nothing is said, so a player who only ever presses
   * Start never downloads a kit they did not ask for. A `restored` gate here
   * as well read as load-bearing and was not — no mutation of it could fail a
   * test.
   */
  useEffect(() => {
    if (told.current === source) return
    told.current = source
    click.select?.(source)
  }, [source, click])

  /**
   * Persisted from an effect rather than from the handlers, because the two
   * things that set a tempo share no path: the slider goes through
   * `changeTempo`, and a committed tap calls `setBpm` directly. A write in one
   * handler would silently forget the other, and a third writer would be easy
   * to add without noticing.
   *
   * Gated on `restored` so the mount render cannot write its defaults over a
   * real stored setup before the read has landed.
   */
  useEffect(() => {
    if (!restored) return
    writeSetup({ bpm, source, fills })
  }, [restored, bpm, source, fills])

  /**
   * Told rather than passed, and told on its own: the transport holds one
   * field the groove reads as each step is queued, so a tick reaches the sound
   * inside the lookahead without the device being built again.
   */
  useEffect(() => {
    click.setFills?.(fills)
  }, [fills, click])

  // The speaker's button is the Start/Stop control, pressed from across the
  // room. Armed by the first on-screen press, because a browser will not let a
  // page claim a media session before the player has touched it. Does nothing
  // at all on a browser that refuses the session.
  useRemoteControl(toggle, { armed })

  /** A run in progress carries on with whatever was picked. */
  const changeSource = (next: SourceId) => {
    arm()
    setSource(next)
  }

  const changeFills = (next: boolean) => {
    arm()
    setFills(next)
  }

  const changeTempo = (next: number) => {
    arm()

    const tempo = clampTempo(next)
    setBpm(tempo)
    click.setTempo(tempo)
  }

  return (
    <PageFrame>
      <Eyebrow>{app.name}</Eyebrow>
      <BeatRow current={beat} />
      <TempoControl bpm={bpm} onChange={changeTempo} />
      <Stack gap={4}>
        <SourceSelect value={source} onChange={changeSource} />
        <StartStopButton running={running} loading={running && loading} onToggle={toggle} />
        <TapTempoButton onTap={tap} />
      </Stack>
      {/* Both below Play, so the toggle appearing and going with the source
          can never move the one control the page is for. CC-BY 4.0 on the kit
          is an obligation rather than decoration, and stays last. */}
      <Stack gap={4}>
        {source !== 'click' && (
          <FillsToggle checked={fills} onChange={changeFills} />
        )}
        <FinePrint>{app.sampleCredit}</FinePrint>
      </Stack>
    </PageFrame>
  )
}
