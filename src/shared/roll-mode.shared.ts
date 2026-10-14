export const ROLL_MODES = ['normal', 'advantage', 'disadvantage'] as const

export type RollMode = (typeof ROLL_MODES)[number]

/** How many d6 a mode adds to (or takes from) the pool of a check. */
export const DICE_DELTA_PER_ROLL_MODE: Readonly<Record<RollMode, number>> = {
  normal: 0,
  advantage: 1,
  disadvantage: -1
}

/** A check always rolls at least one die, however low the attribute or the mode takes the pool. */
const MIN_POOL = 1

/**
 * How many d6 a check rolls: the attribute score, plus one die with advantage and minus one with
 * disadvantage. The pool is rolled and a single 5 or 6 is a success.
 */
export function checkPoolSize(score: number, mode: RollMode): number {
  return Math.max(MIN_POOL, score + DICE_DELTA_PER_ROLL_MODE[mode])
}

/** A check is always a pool of d6, so this is what the player sees on the button: `4d6`. */
export function rollNotation(pool: number): string {
  return `${pool}d6`
}
