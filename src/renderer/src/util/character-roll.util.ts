import {
  actorAttributeKeys,
  actorRollRules,
  type ActorAttributes
} from '@renderer/constant/actor.constant'

export function sumDice(dice: readonly number[]): number {
  return dice.reduce((total, face) => total + face, 0)
}

/** The faces of one throw of `attributeDice` dice per attribute, in the order of the attributes. */
export function toAttributeScores(dice: readonly number[]): ActorAttributes {
  const size = actorRollRules.attributeDice
  const scores = actorAttributeKeys.map((_, index) =>
    sumDice(dice.slice(index * size, (index + 1) * size))
  )

  return {
    strength: scores[0],
    dexterity: scores[1],
    intelligence: scores[2]
  }
}
