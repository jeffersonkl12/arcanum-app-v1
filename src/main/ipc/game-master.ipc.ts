import { TEXT_LIMITS } from '@constant'
import { idSchema } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import type { IGameMasterService } from '@service/game-master.service'
import { z } from 'zod'

const turnSchema = z.object({
  worldId: idSchema,
  message: z.string().trim().min(1).max(TEXT_LIMITS.longText)
})

export function createGameMasterRoutes(
  gameMasterService: IGameMasterService
): RoutesOf<'gameMaster'> {
  return {
    'gameMaster:takeTurn': route(turnSchema, ({ worldId, message }) =>
      gameMasterService.takeTurn(worldId, message)
    ),
    'gameMaster:listHistory': route(idSchema, (worldId) => gameMasterService.listHistory(worldId))
  }
}
