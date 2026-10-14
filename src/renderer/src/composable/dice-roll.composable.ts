import { inject, ref, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import type { IpcInput, IpcOutput } from '@shared'
import { diceTrayKey } from '@renderer/constant/dice.constant'
import { diceTray as defaultDiceTray } from '@renderer/lib/dice-tray.lib'
import { useRequest } from './request.composable'

type CheckRequest = Omit<IpcInput<'dice:resolveCheck'>, 'dice'>

/**
 * The player's roll of a check: the dice tumble on screen and the faces go to the engine, which
 * decides the outcome. Nothing is computed here.
 */
export function useDiceRoll(): {
  isRolling: Ref<boolean>
  rollCheck: (
    request: CheckRequest,
    pool: number
  ) => Promise<IpcOutput<'dice:resolveCheck'> | undefined>
} {
  const { request } = useRequest()
  const diceTray = inject(diceTrayKey, defaultDiceTray)
  const isRolling = ref(false)

  /**
   * Rolls `pool` dice (the actor's attribute, +1 or -1 by the mode) and resolves with the engine's
   * result, or `undefined` if the roll did not happen (the user was told).
   */
  async function rollCheck(
    check: CheckRequest,
    pool: number
  ): Promise<IpcOutput<'dice:resolveCheck'> | undefined> {
    if (isRolling.value) return undefined
    isRolling.value = true

    try {
      const dice = await diceTray.rollD6(pool)

      return await request('dice:resolveCheck', { ...check, dice })
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
