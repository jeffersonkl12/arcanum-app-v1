import {
  actorAttributeKeys,
  actorRollRules,
  type ActorAttributeKey
} from '@renderer/constant/actor.constant'

/** A throw of dice for a field: the faces that fell and the value they give. */
export interface DiceRoll {
  dice: number[]
  score: number
}

export type AttributeRolls = Record<ActorAttributeKey, DiceRoll>

export function sumDice(dice: readonly number[]): number {
  return dice.reduce((total, face) => total + face, 0)
}

export function highestDie(dice: readonly number[]): number {
  return Math.max(...dice)
}

/** An attribute keeps the highest die of its throw, so it never goes above a single face. */
export function toAttributeRoll(dice: readonly number[]): DiceRoll {
  return { dice: [...dice], score: highestDie(dice) }
}

/** Maximum health is the sum of its throw. */
export function toHitPointRoll(dice: readonly number[]): DiceRoll {
  return { dice: [...dice], score: sumDice(dice) }
}

/** The faces of one throw of `attributeDice` dice per attribute, in the order of the attributes. */
export function toAttributeRolls(dice: readonly number[]): AttributeRolls {
  const size = actorRollRules.attributeDice
  const [strength, dexterity, intelligence] = actorAttributeKeys.map((_, index) =>
    toAttributeRoll(dice.slice(index * size, (index + 1) * size))
  )

  return { strength, dexterity, intelligence }
}
