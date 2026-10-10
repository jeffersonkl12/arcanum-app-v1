export const ROLL_MODES = ['normal', 'advantage', 'disadvantage'] as const

export type RollMode = (typeof ROLL_MODES)[number]

/** How many d6 are rolled in a check, by mode. */
export const DICE_PER_ROLL_MODE: Readonly<Record<RollMode, number>> = {
  normal: 2,
  advantage: 3,
  disadvantage: 1
}
