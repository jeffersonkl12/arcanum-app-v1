import { ACTOR_ATTRIBUTES, ROLL_MODES } from '@constant'
import { idSchema } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { MAX_CHECK_POOL, type IDiceCheckService } from '@service/dice-check.service'
import { z } from 'zod'

const resolveCheckSchema = z.object({
  actorId: idSchema,
  attribute: z.enum(ACTOR_ATTRIBUTES),
  mode: z.enum(ROLL_MODES).optional(),
  dice: z.array(z.number().int().min(1).max(6)).min(1).max(MAX_CHECK_POOL)
})

export function createDiceRoutes(diceCheckService: IDiceCheckService): RoutesOf<'dice'> {
  return {
    'dice:resolveCheck': route(resolveCheckSchema, ({ dice, ...request }) =>
      diceCheckService.resolve(request, dice)
    )
  }
}
