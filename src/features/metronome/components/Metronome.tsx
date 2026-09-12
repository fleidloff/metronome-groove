'use client'

import { useEffect, useRef, useState } from 'react'
import { PageFrame } from '@/components/layout/PageFrame'
import { Stack } from '@/components/layout/Stack'
import { Eyebrow } from '@/components/typography/Eyebrow'
import { FinePrint } from '@/components/typography/FinePrint'
import { app } from '@/lib/snippets'
import { useClickTransport } from '../hooks/useClickTransport'
import { useRemoteControl } from '../hooks/useRemoteControl'
import { GROOVES } from '../lib/groove/grooves/registry'
import { NO_MUTES, type MuteSet } from '../lib/mute/voices'
import type { SourceId } from '../lib/transport/source'
import {
  DEFAULT_BPM,
  DEFAULT_COUNT_IN,
  DEFAULT_FILLS,
  DEFAULT_MUTES,
  DEFAULT_SOURCE,
  readSetup,
  writeSetup,
  type StoredMutes,
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
import { CountInToggle } from './CountInToggle'
import { FillsToggle } from './FillsToggle'
import { MuteRow } from './MuteRow'
import { SourceSelect } from './SourceSelect'
import { StartStopButton } from './StartStopButton'
import { TapTempoButton } from './TapTempoButton'
import { TempoControl } from './TempoControl'

export interface Transport {
  start(bpm: number): void
  stop(): void
  setTempo(bpm: number): void
  suspend(): void
  resume(bpm: number): void
  onBeat(listener: (beat: number) => void): () => void
  select?(id: SourceId): void
  onLoadingChange?(listener: (loading: boolean) => void): () => void
  setFills?(on: boolean): void
  setCountIn?(on: boolean): void
  setMutes?(mutes: MuteSet): void
}

const systemClock = () => performance.now() / 1000

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
  const [countIn, setCountIn] = useState(DEFAULT_COUNT_IN)
  const [mutes, setMutes] = useState<StoredMutes>(DEFAULT_MUTES)
  const [restored, setRestored] = useState(false)
  const muted = mutes[source] ?? NO_MUTES
  const told = useRef<SourceId>(DEFAULT_SOURCE)
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

  // A browser refuses a media session until the page has been interacted with.
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

  const tap = () => {
    arm()

    const live = attempt.current
    const at = now()

    if (live.state.taps.length === 0) click.suspend()
    stopWaiting()

    const next = addTap(live.state, at)
    settle(next)

    live.timer = setTimeout(() => {
      const result = commit(next)
      settle(EMPTY_TAPS)

      if (result.kind === 'tempo') setBpm(result.bpm)
      click.resume(result.kind === 'tempo' ? result.bpm : bpm)
    }, windowFor(next) * 1000)
  }

  // This route is prerendered, so reading storage during render hydrates
  // against the server's defaults.
  /* eslint-disable react-hooks/set-state-in-effect -- a client-only store can
     only be read after mount. */
  useEffect(() => {
    const stored = readSetup()
    setBpm(stored.bpm)
    setSource(stored.source)
    setFills(stored.fills)
    setCountIn(stored.countIn)
    setMutes(stored.mutes)
    setRestored(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (told.current === source) return
    told.current = source
    click.select?.(source)
  }, [source, click])

  useEffect(() => {
    if (!restored) return
    writeSetup({ bpm, source, fills, countIn, mutes })
  }, [restored, bpm, source, fills, countIn, mutes])

  useEffect(() => {
    click.setFills?.(fills)
  }, [fills, click])

  useEffect(() => {
    click.setCountIn?.(countIn)
  }, [countIn, click])

  useEffect(() => {
    click.setMutes?.(muted)
  }, [muted, click])

  useRemoteControl(toggle, { armed })

  const changeSource = (next: SourceId) => {
    arm()
    setSource(next)
  }

  const changeFills = (next: boolean) => {
    arm()
    setFills(next)
  }

  const changeCountIn = (next: boolean) => {
    arm()
    setCountIn(next)
  }

  const changeMutes = (next: MuteSet) => {
    arm()
    setMutes({ ...mutes, [source]: next })
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
      <Stack gap={4}>
        {source !== 'click' && (
          <>
            <FillsToggle checked={fills} onChange={changeFills} />
            <CountInToggle checked={countIn} onChange={changeCountIn} />
            <MuteRow
              groove={GROOVES[source]}
              mutes={muted}
              onChange={changeMutes}
            />
          </>
        )}
        <FinePrint>{app.sampleCredit}</FinePrint>
      </Stack>
    </PageFrame>
  )
}
