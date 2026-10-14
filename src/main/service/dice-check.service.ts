import {
  ACTOR_ATTRIBUTE_LIMITS,
  checkPoolSize,
  type ActorAttribute,
  type CheckOutcome,
  type RollMode
} from '@constant'
import { ConflictError } from '@error'
import type { IDiceRoller } from '@lib/dice.lib'
import type { IActorService } from '@service/actor.service'

/** Lowest face that counts as a success. */
const SUCCESS_THRESHOLD = 5
/** Pool of the biggest attribute with advantage: the most dice a check can ever roll. */
export const MAX_CHECK_POOL = checkPoolSize(ACTOR_ATTRIBUTE_LIMITS.max, 'advantage')

/** Who rolls, with what, and in which circumstances. */
export interface CheckRequest {
  actorId: string
  attribute: ActorAttribute
  mode?: RollMode
}

export interface CheckResult {
  actorId: string
  attribute: ActorAttribute
  mode: RollMode
  /** Every die rolled, in rolled order: as many as the attribute score, +1 or -1 by the mode. */
  dice: number[]
  outcome: CheckOutcome
  /** True for `success`. */
  succeeded: boolean
}

export interface IDiceCheckService {
  /**
   * Rolls a check for an actor. Throws `NotFoundError` if the actor does not exist.
   */
  check(request: CheckRequest): Promise<CheckResult>
  /**
   * Resolves a check whose dice were rolled elsewhere (the 3D dice of the player's screen): the
   * faces are only the entropy, the rules stay here. Throws `NotFoundError` if the actor does not
   * exist and `ConflictError` if the faces are not those of a roll with this attribute and mode.
   */
  resolve(request: CheckRequest, dice: number[]): Promise<CheckResult>
}

/**
 * A check rolls one d6 per point of the attribute, plus one with advantage and minus one with
 * disadvantage. If at least one die shows 5 or 6 it is a success; otherwise it is a failure.
 */
export class DiceCheckService implements IDiceCheckService {
  constructor(
    private readonly diceRoller: IDiceRoller,
    private readonly actorService: IActorService
  ) {}

  async check(request: CheckRequest): Promise<CheckResult> {
    const pool = await this.poolFor(request)

    return this.toResult(request, this.diceRoller.rollD6(pool))
  }

  async resolve(request: CheckRequest, dice: number[]): Promise<CheckResult> {
    const pool = await this.poolFor(request)
    if (dice.length !== pool || !dice.every(isD6Face)) {
      throw new ConflictError(
        `A ${request.mode ?? 'normal'} ${request.attribute} check is ${pool} d6, but got [${dice.join(', ')}]`
      )
    }

    return this.toResult(request, dice)
  }

  private async poolFor({ actorId, attribute, mode = 'normal' }: CheckRequest): Promise<number> {
    const actor = await this.actorService.get(actorId)

    return checkPoolSize(actor[attribute], mode)
  }

  private toResult(request: CheckRequest, dice: number[]): CheckResult {
    const succeeded = dice.some((face) => face >= SUCCESS_THRESHOLD)

    return {
      actorId: request.actorId,
      attribute: request.attribute,
      mode: request.mode ?? 'normal',
      dice,
      outcome: succeeded ? 'success' : 'failure',
      succeeded
    }
  }
}

function isD6Face(face: number): boolean {
  return Number.isInteger(face) && face >= 1 && face <= 6
}
