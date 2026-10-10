import { DICE_PER_ROLL_MODE, type CheckOutcome, type RollMode } from '@constant'
import type { IDiceRoller } from '@lib/dice.lib'

/** Lowest face that counts as a success. */
const SUCCESS_THRESHOLD = 5
const CRITICAL_SUCCESS_FACE = 6
const CRITICAL_FAILURE_FACE = 1

export interface CheckResult {
  mode: RollMode
  /** Every die rolled, in rolled order. */
  dice: number[]
  /** The die the outcome is read from. */
  highest: number
  outcome: CheckOutcome
  /** True for `success` and `critical_success`. */
  succeeded: boolean
}

export interface IDiceCheckService {
  /** Rolls a check: 2d6 normally, 3d6 with advantage, 1d6 with disadvantage. */
  check(mode?: RollMode): CheckResult
}

/**
 * The outcome is read from the highest die:
 * 6 is a critical success, 5 a success, 2 to 4 a failure, and all dice on 1 a critical failure.
 */
export class DiceCheckService implements IDiceCheckService {
  constructor(private readonly diceRoller: IDiceRoller) {}

  check(mode: RollMode = 'normal'): CheckResult {
    const dice = this.diceRoller.rollD6(DICE_PER_ROLL_MODE[mode])
    const highest = Math.max(...dice)
    const outcome = this.resolveOutcome(highest)

    return {
      mode,
      dice,
      highest,
      outcome,
      succeeded: outcome === 'success' || outcome === 'critical_success'
    }
  }

  private resolveOutcome(highest: number): CheckOutcome {
    if (highest === CRITICAL_SUCCESS_FACE) return 'critical_success'
    if (highest >= SUCCESS_THRESHOLD) return 'success'
    if (highest === CRITICAL_FAILURE_FACE) return 'critical_failure'
    return 'failure'
  }
}
