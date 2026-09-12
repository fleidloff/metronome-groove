export const MIN_BPM = 40
export const MAX_BPM = 180

export const isTempo = (bpm: number) =>
  Number.isFinite(bpm) && bpm >= MIN_BPM && bpm <= MAX_BPM

export const clampTempo = (bpm: number) =>
  Math.min(MAX_BPM, Math.max(MIN_BPM, bpm))

export const secondsPerBeat = (bpm: number) => 60 / bpm
