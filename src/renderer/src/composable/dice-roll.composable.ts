import { ref, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import { DICE_PER_ROLL_MODE, type IpcOutput, type RollMode } from '@shared'
import { diceTray } from '@renderer/lib/dice-tray.lib'
import { useRequest } from './request.composable'

/**
 * The player's roll of a check: the dice tumble on screen and the faces go to the engine, which
 * decides the outcome. Nothing is computed here.
 */
export function useDiceRoll(): {
  isRolling: Ref<boolean>
  rollCheck: (mode: RollMode) => Promise<IpcOutput<'dice:resolveCheck'> | undefined>
} {
  const { request } = useRequest()
  const isRolling = ref(false)

  /** Resolves with the engine's result, or `undefined` if the roll did not happen (the user was told). */
  async function rollCheck(mode: RollMode): Promise<IpcOutput<'dice:resolveCheck'> | undefined> {
    if (isRolling.value) return undefined
    isRolling.value = true

    try {
      const dice = await diceTray.rollD6(DICE_PER_ROLL_MODE[mode])

      return await request('dice:resolveCheck', { mode, dice })
    } catch (error) {
      console.error('The dice could not be rolled', error)
      toast.error('Não foi possível rolar os dados')
      return undefined
    } finally {
      isRolling.value = false
    }
  }

  return { isRolling, rollCheck }
}
