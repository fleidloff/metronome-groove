import type { Humanize } from '../../transport/source'

/**
 * The humanize record every groove in this app plays under. It lived in
 * `straightFunk.ts` from V6 to V16 because funk was the only groove there was,
 * and `docs/architecture.md` set the trigger that moved it: *when a third
 * groove wants it, the record moves to `grooves/shared.ts`*. Rock was the
 * second, bossa the third, shuffle the fourth and second line the fifth.
 *
 * A groove that needs to differ spreads this and overrides — see
 * `bossaNova.ts`, which adds `exactVoices` and changes nothing else. That is
 * the intended way to depart, because it keeps the departure visible as a diff
 * against the shared numbers rather than as a second copy of them.
 */
export const KIT_HUMANIZE: Humanize = {
  timingFractionOfStep: 0.03,
  timingCeilingMs: 4,
  velocityJitter: 0.04,
  exactVoices: [],
}
