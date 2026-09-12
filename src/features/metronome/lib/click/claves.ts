/** The one claves layer in the sibling project's pack. */
export const CLAVES_NOMINAL_VELOCITY = 0.5

/**
 * Silence before the attack, measured to -60 dB of peak. The pack keeps the
 * source lead-in deliberately, so a buffer started at `t` is *heard* at
 * `t + 0.0083`. Every beat is scheduled earlier by this much.
 */
export const CLAVES_LEAD_IN_S = 0.0083

export const CLAVES_SAMPLE_URL = '/samples/claves_mf.flac'
