'use client'

import { useEffect, useState } from 'react'
import { app } from '@/lib/snippets'
import { useClickTransport } from '../hooks/useClickTransport'
import { clampTempo } from '../lib/click/tempo'
import { BeatRow } from './BeatRow'
import { StartStopButton } from './StartStopButton'
import { TempoControl } from './TempoControl'

/** What the component needs of the click, so it can be rendered without one.
 *  `onBeat` reports the *audible* beat and returns its own teardown. */
export interface Transport {
  start(bpm: number): void
  stop(): void
  setTempo(bpm: number): void
  onBeat(listener: (beat: number) => void): () => void
}

const DEFAULT_BPM = 120

/**
 * `transport` is injected by tests. Left out, the real one is used — and it
 * builds no AudioContext until start is pressed, both because a browser
 * refuses one before a user gesture and because that keeps this render inert
 * under jsdom.
 */
export function Metronome({ transport }: { transport?: Transport }) {
  const audioTransport = useClickTransport()
  const click = transport ?? audioTransport
  const [bpm, setBpm] = useState(DEFAULT_BPM)
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState<number | null>(null)

  useEffect(() => click.onBeat(setBeat), [click])

  useEffect(
    () => () => {
      click.stop()
    },
    [click],
  )

  const toggle = () => {
    if (running) {
      click.stop()
      setBeat(null)
    } else {
      click.start(bpm)
    }
    setRunning(!running)
  }

  const changeTempo = (next: number) => {
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
      <StartStopButton running={running} onToggle={toggle} />
    </main>
  )
}
