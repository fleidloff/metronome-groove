import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR, stepSeconds } from '@/lib/steps'
import { DYNAMIC_RANGE_DB } from '@/lib/velocity'
import type { Humanize, VoiceName } from '../transport/source'
import { KIT_HUMANIZE } from './grooves/shared'
import { gainTrim, roundRobinIndex, timingBound, timingOffset } from './humanize'

const VOICES: readonly VoiceName[] = ['kick', 'snare', 'hatClosed', 'hatOpen']

const SEED = 20260912

const RIM_EXACT: Humanize = { ...KIT_HUMANIZE, exactVoices: ['rim'] }

const BOTH_HATS_EXACT: Humanize = {
  ...KIT_HUMANIZE,
  exactVoices: ['hatClosed', 'hatOpen'],
}

const FUNK_MICROSECONDS: Record<string, readonly number[]> = {
  kick: [
    2484, -2993, -1643, 25, 1422, -1265, -1310, 1846, 2542, 3732, 2555, -318, 3544, -864, 3790,
    -1053, 1036, -549, -111, 425, -3558, 3600, -335, -3332, -1873, -2327, -1155, 3669, -880, -3210,
    -634, 1391, -1218, 1396, -321, 1995, -234, 3331, 12, 838, -897, -2483, 125, 950, 3933, -1991,
    1201, -2994, -1553, 506, -3634, 3148, 3897, 2996, 1146, 1490, -1663, 2225, 2212, -3474, 2487,
    3074, 1799, 2071, -941, -1059, 50, 2652, 1477, 2014, -938, 1180, 1585, -1169, -1890, -3613, 139,
    -3719, 846, -3063, -3770, -3405, -3651, 305, 585, 2611, -1829, 1778, 926, -1094, -2650, -2998,
    -646, -110, 1961, 547, 506, 727, 3781, -2694, 1508, 1971, 2071, 2106, 897, 2660, -2429, -1539,
    -981, -1934, -3396, 1700, 1284, -1401, 2514, 2549, 1729, -2274, -1619, -95, -1087, -1135, -1686,
    -161, 318, -2196, 1993, -572, -3516, 2399, 1542, -1716, -3550, -1282, 3477, -3409, 3784, -1801,
    1587, 562, 207, -2171, -2589, -3708, -3685, -2528, -3675, -688, -734, -3608, 304, 219, 2891,
    -1025, 3811, 3201, -2144, -1144, -3340, 2342, -3842, 1781, 3613, 645, 3219, -2831, 1279, 63,
    -2929, -373, 2292, 3602, 3655, 3848, -519, -1347, -677, -2212, 267, -1338, -1814, -1040, 2202,
    501, -2868, -1767, 1797, 1492, 865, 3128, 2647, 3735,
  ],
  snare: [
    -493, 2938, 859, 694, -2826, 1226, -1690, -942, -3067, -673, -2007, -3663, -671, 907, -2667,
    1313, -3863, 2172, -1818, -71, -130, 3439, -1220, -2263, -927, 983, 2760, -3872, 2580, -3339,
    -2141, 349, -3337, -1517, 1936, -2828, 646, 2727, -1932, 558, 406, -1986, 3967, 3376, -2346,
    2580, 2671, 1338, 542, 3891, -390, -3957, -3725, -2116, 207, 918, -432, 1768, -1768, 1175,
    -3059, -2418, -2327, 2851, 1499, -971, 2431, 2903, -3881, -3256, 1382, -1942, 2641, -348, 337,
    1292, -962, 3474, 2021, -2791, -1185, 1995, -3086, -2131, -816, 643, 3469, 3678, 1751, 2294,
    1492, 3935, -2105, -2134, -3587, -1888, -839, -1873, -33, 3066, 1304, -697, 2054, -2274, 336,
    2443, -2899, -949, -1223, 310, -2149, 3011, -2557, -1347, 566, 2174, 1902, -477, -702, -3542,
    557, 2108, 3277, 3989, 832, 226, 295, -1949, 71, 805, -1630, -2881, -3130, 1592, -1588, -3659,
    1858, -788, -3223, 3185, 2936, 1891, -1289, -1872, -1376, 3575, 2629, -2839, 2491, -1720, -3412,
    -3994, 3012, 1855, -2069, -1471, 2456, -2209, -3224, 1095, -2234, 1269, 3714, -2849, -3389,
    -2288, 1165, -2516, -2491, 3332, 847, 2284, -3279, 56, -1515, 1316, -524, 1740, 401, 349, -747,
    -2622, 2317, 2111, 1119, 201, -3722, 3934, -2826, -3837, 3405, 2412,
  ],
  hatClosed: [
    817, -1278, -1914, -381, 3847, 1904, 1362, 2151, -3356, -3065, -2957, 64, 3684, 2010, 3899,
    -1467, -170, 1672, -163, 1916, 1648, 1194, 2697, -3551, 219, -798, 798, -1296, -1621, 2607,
    -168, 3597, -1147, -3778, 1145, -3960, 1884, 3700, -3579, -1428, 636, -1997, -1943, -537, -1027,
    3103, 1181, 1842, -2110, 1770, 182, 1748, -2613, 692, 1413, -902, -632, 3247, -485, -567, -1540,
    3469, 1958, -3892, -3723, -1504, 2237, -291, 3944, 1678, -441, -2396, -2712, -1426, 1195, 154,
    3960, 1604, -1815, -1385, 2360, 2447, -2434, 683, -1507, 3030, 861, 2488, -2028, 3083, -2544,
    -1472, 2565, -3575, -1971, 199, -3285, 2018, 3787, 2264, -3440, -3733, -2980, 2751, -3961, -703,
    -3211, 1777, 1096, -1762, 1957, -310, 2692, 2491, -279, 1658, 2915, 2139, 2999, -2491, -636,
    1134, 2159, -2343, -2952, -2097, 2556, -1201, -2555, -3287, -3893, 539, 1793, 991, 3805, 435,
    -2817, -1311, 803, -3962, 3262, -1353, 2609, 728, -234, 3400, 1708, 1459, 400, 1663, -1875,
    1117, -2166, -3517, -2635, 1799, 630, -967, -829, 1466, -3982, -1248, -1140, 1500, -3723, 2468,
    -590, 979, 1711, -2811, 2319, 3471, 2750, 1235, -2556, 161, 3862, -1887, 2649, -1004, 1950,
    1147, -2801, 340, 1428, 1446, -2018, -272, 2306, -641, 1833, 1440,
  ],
  hatOpen: [
    1900, -2048, -2192, -2247, -950, 2453, -543, 3648, -967, -1938, -961, -3625, -2140, -226, 2795,
    3946, 3505, 3159, -1305, -2994, 816, 2638, -3605, 1089, -851, 849, -3428, -2884, 956, 515, 3664,
    -333, -1547, 1641, 531, 330, 1381, -2037, -2521, 2136, -3481, -293, -1036, 996, 3347, 1418,
    3634, 2615, 1201, 3170, 1412, 730, -715, -1990, -580, -442, 1868, -2461, 223, -1205, -416, -201,
    -3662, 1345, -3035, -488, 2773, 3369, 1390, 1967, -2254, 538, -1813, 3711, -1772, -1920, -2437,
    -711, 1807, -312, -1020, -2799, 2742, 1059, -2300, 2636, 1540, -1664, 1420, 1725, -2483, -3907,
    -2729, 3437, 3821, -3555, -3186, -1393, 1655, -2559, -2125, 1063, 3805, 2610, -1032, 763, -1957,
    -1892, 3753, 429, 687, -3638, -1960, -2827, 2880, 2558, 2436, 1158, 1353, 3386, 2094, -3272,
    3212, 63, -2056, -1560, 3435, -3342, -2610, -600, 758, -2240, 3442, -1512, 2982, 2708, 890,
    -2122, -511, 2005, 2669, -1087, 46, 2390, -3502, -2048, -1181, -1644, 2233, 3120, 11, -282,
    -1311, -2834, 3243, -3730, -823, -3091, -2892, -2037, 254, -788, 1642, 695, 3189, 85, 2832,
    -1244, 2318, 1278, 3895, -3563, 2556, -639, -2115, -2676, 1836, -3670, 1180, 1722, -2295, -1865,
    507, -1759, 2606, -3934, -1284, -2230, -2373, -1350, 1513, 3373,
  ],
}

const at = (bpm: number) => stepSeconds(bpm, STEPS_PER_BAR)

const offsetsOver = (count: number, voice: VoiceName, seconds: number) =>
  Array.from({ length: count }, (_, step) =>
    timingOffset(KIT_HUMANIZE, SEED, voice, step, seconds),
  )

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

describe('the humanize record', () => {
  it('carries the frozen numbers', () => {
    expect(KIT_HUMANIZE).toEqual({
      timingFractionOfStep: 0.03,
      timingCeilingMs: 4,
      velocityJitter: 0.04,
      exactVoices: [],
    })
  })
})

describe('the timing bound', () => {
  it('is a fraction of the step with a millisecond ceiling', () => {
    expect(timingBound(KIT_HUMANIZE, at(40))).toBeCloseTo(0.004, 12)
    expect(timingBound(KIT_HUMANIZE, at(100))).toBeCloseTo(0.004, 12)
    expect(timingBound(KIT_HUMANIZE, at(180))).toBeCloseTo(0.0025, 12)
  })

  it('lets the ceiling bind at the slow end, where 3% of a step is 11 ms', () => {
    expect(0.03 * at(40)).toBeGreaterThan(0.004)
    expect(timingBound(KIT_HUMANIZE, at(40))).toBeLessThan(0.03 * at(40))
  })

  it('lets the fraction bind at the fast end, where 4 ms is 5% of a step', () => {
    expect(0.03 * at(180)).toBeLessThan(0.004)
    expect(timingBound(KIT_HUMANIZE, at(180))).toBe(0.03 * at(180))
  })

  it('hands over from the ceiling to the fraction at 112.5 bpm', () => {
    expect(timingBound(KIT_HUMANIZE, at(112.5))).toBeCloseTo(0.004, 12)
  })
})

describe('the timing offset', () => {
  it('is stateless: the same arguments give the same answer, in any order', () => {
    const first = timingOffset(KIT_HUMANIZE, SEED, 'snare', 7, at(100))

    for (const step of [0, 9, 3, 7, 15, 7, 1, 7]) {
      for (const voice of VOICES) {
        timingOffset(KIT_HUMANIZE, SEED, voice, step, at(100))
      }
    }

    expect(timingOffset(KIT_HUMANIZE, SEED, 'snare', 7, at(100))).toBe(first)
    expect(timingOffset(KIT_HUMANIZE, SEED, 'snare', 7, at(100))).toBe(first)
  })

  it('answers a late step the same whether or not the steps before it were asked for', () => {
    const cold = timingOffset(KIT_HUMANIZE, SEED, 'kick', 9999, at(100))

    offsetsOver(9999, 'kick', at(100))

    expect(timingOffset(KIT_HUMANIZE, SEED, 'kick', 9999, at(100))).toBe(cold)
  })

  it('stays inside the bound over ten thousand steps, at every tempo', () => {
    for (const bpm of [40, 100, 180]) {
      const bound = timingBound(KIT_HUMANIZE, at(bpm))

      for (const voice of VOICES) {
        for (const offset of offsetsOver(10_000, voice, at(bpm))) {
          expect(Math.abs(offset)).toBeLessThanOrEqual(bound)
        }
      }
    }
  })

  it('uses the bound it is given rather than sitting near zero', () => {
    const bound = timingBound(KIT_HUMANIZE, at(100))
    const reach = Math.max(...offsetsOver(10_000, 'hatClosed', at(100)).map(Math.abs))

    expect(reach).toBeGreaterThan(bound * 0.95)
  })

  it('leans on no voice: every voice averages the grid, so no backbeat moves', () => {
    const bound = timingBound(KIT_HUMANIZE, at(100))

    for (const voice of VOICES) {
      expect(Math.abs(mean(offsetsOver(10_000, voice, at(100))))).toBeLessThan(bound * 0.05)
    }
  })

  it('never accumulates: the next step is not the previous one nudged', () => {
    const offsets = offsetsOver(2_000, 'hatClosed', at(100))
    const forward = offsets.slice(1).filter((o, i) => Math.sign(o) === Math.sign(offsets[i])).length

    expect(forward).toBeGreaterThan(800)
    expect(forward).toBeLessThan(1_200)
  })

  it('separates the voices and the seeds', () => {
    const step = 4
    const voices = VOICES.map((v) => timingOffset(KIT_HUMANIZE, SEED, v, step, at(100)))

    expect(new Set(voices).size).toBe(VOICES.length)
    expect(timingOffset(KIT_HUMANIZE, SEED + 1, 'kick', step, at(100))).not.toBe(
      timingOffset(KIT_HUMANIZE, SEED, 'kick', step, at(100)),
    )
  })
})

describe('the velocity jitter', () => {
  it('is a gain trim, so it can only be applied after the layer is chosen', () => {
    const trim = gainTrim(KIT_HUMANIZE, SEED, 'snare', 7)

    expect(trim).toBeGreaterThan(0)
    expect(typeof trim).toBe('number')
  })

  it('stays inside the jitter read through this repo own decibel curve', () => {
    const ceiling = DYNAMIC_RANGE_DB * KIT_HUMANIZE.velocityJitter

    for (const voice of VOICES) {
      for (let step = 0; step < 10_000; step += 1) {
        const dB = 20 * Math.log10(gainTrim(KIT_HUMANIZE, SEED, voice, step))

        expect(Math.abs(dB)).toBeLessThanOrEqual(ceiling + 1e-9)
      }
    }
  })

  it('is stateless too, and independent of the timing offset', () => {
    const first = gainTrim(KIT_HUMANIZE, SEED, 'hatOpen', 14)

    timingOffset(KIT_HUMANIZE, SEED, 'hatOpen', 14, at(100))

    expect(gainTrim(KIT_HUMANIZE, SEED, 'hatOpen', 14)).toBe(first)
    expect(gainTrim(KIT_HUMANIZE, SEED, 'hatOpen', 15)).not.toBe(first)
  })

  it('draws separately from the timing, so a late hit is not also a loud one', () => {
    const steps = Array.from({ length: 10_000 }, (_, step) => step)
    const timing = steps.map((s) => timingOffset(KIT_HUMANIZE, SEED, 'kick', s, at(100)))
    const gain = steps.map((s) => 20 * Math.log10(gainTrim(KIT_HUMANIZE, SEED, 'kick', s)))
    const centred = (xs: readonly number[]) => xs.map((x) => x - mean(xs))
    const dot = (a: readonly number[], b: readonly number[]) =>
      a.reduce((sum, x, i) => sum + x * b[i], 0)
    const [t, g] = [centred(timing), centred(gain)]
    const correlation = dot(t, g) / Math.sqrt(dot(t, t) * dot(g, g))

    expect(Math.abs(correlation)).toBeLessThan(0.1)
  })

  it('averages out rather than pushing a voice up or down', () => {
    const trims = Array.from({ length: 10_000 }, (_, step) =>
      gainTrim(KIT_HUMANIZE, SEED, 'hatClosed', step),
    )

    expect(mean(trims.map((t) => 20 * Math.log10(t)))).toBeCloseTo(0, 1)
  })
})

describe('the round robin', () => {
  const barOf = (bar: number, count: number) =>
    Array.from({ length: STEPS_PER_BAR }, (_, i) => roundRobinIndex(bar * STEPS_PER_BAR + i, count))

  const periodInBars = (count: number) => {
    for (let p = 1; p <= 64; p += 1) {
      const repeats = Array.from({ length: 20 }, (_, bar) =>
        barOf(bar + p, count).every((v, i) => v === barOf(bar, count)[i]),
      ).every(Boolean)

      if (repeats) return p
    }

    throw new Error('no period found')
  }

  it('indexes on the absolute step, so a three-way alternate runs 48 steps', () => {
    expect(periodInBars(3) * STEPS_PER_BAR).toBe(48)
  })

  it('does not repeat the same bar twice running', () => {
    expect(barOf(0, 3)).not.toEqual(barOf(1, 3))
    expect(barOf(1, 3)).not.toEqual(barOf(2, 3))
    expect(barOf(3, 3)).toEqual(barOf(0, 3))
  })

  it('walks the alternates in order and stays in range', () => {
    expect(Array.from({ length: 7 }, (_, s) => roundRobinIndex(s, 3))).toEqual([
      0, 1, 2, 0, 1, 2, 0,
    ])
    expect(roundRobinIndex(9_999, 1)).toBe(0)
  })
})

describe('the exact voices', () => {
  it('zeroes a member at every step of twelve bars, at every tempo in the range', () => {
    for (let bpm = 40; bpm <= 180; bpm += 1) {
      for (let step = 0; step < 12 * STEPS_PER_BAR; step += 1) {
        expect(timingOffset(RIM_EXACT, SEED, 'rim', step, at(bpm))).toBe(0)
      }
    }
  })

  it('zeroes a member however many are exempt, and however far into the run', () => {
    for (const voice of ['hatClosed', 'hatOpen'] as const) {
      for (const step of [0, 1, 7, 15, 16, 999, 10_000, 123_457]) {
        expect(timingOffset(BOTH_HATS_EXACT, SEED, voice, step, at(100))).toBe(0)
      }
    }
  })

  it('leaves every other voice bound exactly where it was', () => {
    for (const bpm of [40, 100, 180]) {
      for (const voice of VOICES) {
        for (let step = 0; step < 4 * STEPS_PER_BAR; step += 1) {
          expect(timingOffset(RIM_EXACT, SEED, voice, step, at(bpm))).toBe(
            timingOffset(KIT_HUMANIZE, SEED, voice, step, at(bpm)),
          )
        }
      }
    }

    expect(timingOffset(BOTH_HATS_EXACT, SEED, 'kick', 3, at(100))).toBe(
      timingOffset(KIT_HUMANIZE, SEED, 'kick', 3, at(100)),
    )
    expect(timingOffset(BOTH_HATS_EXACT, SEED, 'snare', 4, at(100))).not.toBe(0)
  })

  it('still reaches the exempt voice with the gain trim, which is all the dynamics it has', () => {
    const trims = Array.from({ length: STEPS_PER_BAR }, (_, step) =>
      gainTrim(RIM_EXACT, SEED, 'rim', step),
    )

    expect(new Set(trims).size).toBe(STEPS_PER_BAR)

    for (const trim of trims) {
      expect(trim).not.toBe(1)
      expect(trim).toBeGreaterThan(0)
    }

    const ceiling = DYNAMIC_RANGE_DB * RIM_EXACT.velocityJitter
    const reach = Math.max(...trims.map((t) => Math.abs(20 * Math.log10(t))))

    expect(reach).toBeGreaterThan(ceiling * 0.5)
    expect(reach).toBeLessThanOrEqual(ceiling + 1e-9)
  })

  it('trims the exempt voice by exactly what it would have been trimmed unexempted', () => {
    for (let step = 0; step < 4 * STEPS_PER_BAR; step += 1) {
      expect(gainTrim(RIM_EXACT, SEED, 'rim', step)).toBe(
        gainTrim(KIT_HUMANIZE, SEED, 'rim', step),
      )
    }
  })

  it('is exactly today behaviour when empty, funk hit for hit over twelve bars', () => {
    for (const voice of VOICES) {
      const offsets = Array.from({ length: 12 * STEPS_PER_BAR }, (_, step) =>
        Math.round(timingOffset(KIT_HUMANIZE, SEED, voice, step, at(100)) * 1e6),
      )

      expect(offsets).toEqual(FUNK_MICROSECONDS[voice])
    }
  })

  it('moves no funk hit to zero, so the pin above is a pin and not a tautology', () => {
    for (const voice of VOICES) {
      expect(FUNK_MICROSECONDS[voice].every((micros) => micros !== 0)).toBe(true)
    }
  })
})
