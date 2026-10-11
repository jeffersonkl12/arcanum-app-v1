import { DICE_PER_ROLL_MODE, ROLL_MODES } from '@constant'
import { route, type RoutesOf } from '@ipc/route.ipc'
import type { IDiceCheckService } from '@service/dice-check.service'
import { z } from 'zod'

const MAX_DICE = Math.max(...Object.values(DICE_PER_ROLL_MODE))

const resolveCheckSchema = z.object({
  mode: z.enum(ROLL_MODES),
  dice: z.array(z.number().int().min(1).max(6)).min(1).max(MAX_DICE)
})

export function createDiceRoutes(diceCheckService: IDiceCheckService): RoutesOf<'dice'> {
  return {
    'dice:resolveCheck': route(resolveCheckSchema, ({ mode, dice }) =>
      diceCheckService.resolve(mode, dice)
    )
  }
}
