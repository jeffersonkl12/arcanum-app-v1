export const ROLL_MODES = ['normal', 'advantage', 'disadvantage'] as const

export type RollMode = (typeof ROLL_MODES)[number]

/** How many d6 are rolled in a check, by mode. */
export const DICE_PER_ROLL_MODE: Readonly<Record<RollMode, number>> = {
  normal: 2,
  advantage: 3,
  disadvantage: 1
}

/** A check is always a pool of d6, so this is what the player sees on the button: `2d6`. */
export function rollNotation(mode: RollMode): string {
  return `${DICE_PER_ROLL_MODE[mode]}d6`
}
