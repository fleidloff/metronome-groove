// A media notification is only shown for media longer than five seconds.
export const SILENT_SECONDS = 8

const RATE = 8000

// Digital zeros satisfy Chrome; Firefox reads the samples and refuses media
// keys for anything inaudible. See docs/adr/0004-bluetooth-media-buttons.md.
function silentWav(): string {
  const frames = RATE * SILENT_SECONDS
  const buffer = new ArrayBuffer(44 + frames * 2)
  const view = new DataView(buffer)

  const ascii = (at: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(at + index, text.charCodeAt(index))
    }
  }

  ascii(0, 'RIFF')
  view.setUint32(4, 36 + frames * 2, true)
  ascii(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, frames * 2, true)

  let binary = ''
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return `data:audio/wav;base64,${btoa(binary)}`
}

export const SILENT_WAV = silentWav()

export function createSilentMedia(): HTMLAudioElement | undefined {
  if (typeof document === 'undefined') return undefined

  const element = document.createElement('audio')
  element.src = SILENT_WAV
  element.loop = true
  element.muted = false
  element.volume = 1
  return element
}
