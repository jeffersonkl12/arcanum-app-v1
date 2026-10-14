import { inject, ref, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import { actorAttributeKeys, actorRollRules } from '@renderer/constant/actor.constant'
import { diceTrayKey } from '@renderer/constant/dice.constant'
import { diceTray as defaultDiceTray } from '@renderer/lib/dice-tray.lib'
import {
  toAttributeRoll,
  toAttributeRolls,
  toHitPointRoll,
  type AttributeRolls,
  type DiceRoll
} from '@renderer/util/character-roll.util'

// One throw at a time for the whole window: the tray is a single canvas over the app.
const isRolling = ref(false)

/**
 * The dice of a new character: the dice tumble on screen and their faces are the result. Each
 * attribute is the highest of 2d6, and the maximum health is 2d6 summed (`actorRollRules`).
 */
export function useCharacterRoll(): {
  isRolling: Ref<boolean>
  rollAttribute: () => Promise<DiceRoll | undefined>
  rollAttributes: () => Promise<AttributeRolls | undefined>
  rollHitPoints: () => Promise<DiceRoll | undefined>
} {
  const diceTray = inject(diceTrayKey, defaultDiceTray)

  /** Resolves with the faces, or `undefined` if the roll did not happen (the user was told). */
  async function throwDice(quantity: number): Promise<number[] | undefined> {
    if (isRolling.value) return undefined
    isRolling.value = true

    try {
      return await diceTray.rollD6(quantity)
    } catch (error) {
      console.error('The dice could not be rolled', error)
      toast.error('Não foi possível rolar os dados')
      return undefined
    } finally {
      isRolling.value = false
    }
  }

  async function rollAttribute(): Promise<DiceRoll | undefined> {
    const dice = await throwDice(actorRollRules.attributeDice)
    return dice && toAttributeRoll(dice)
  }

  /** All the attributes in a single throw. */
  async function rollAttributes(): Promise<AttributeRolls | undefined> {
    const dice = await throwDice(actorRollRules.attributeDice * actorAttributeKeys.length)
    return dice && toAttributeRolls(dice)
  }

  async function rollHitPoints(): Promise<DiceRoll | undefined> {
    const dice = await throwDice(actorRollRules.hitPointDice)
    return dice && toHitPointRoll(dice)
  }

  return { isRolling, rollAttribute, rollAttributes, rollHitPoints }
}
