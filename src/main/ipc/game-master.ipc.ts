import { TEXT_LIMITS } from '@constant'
import { idSchema } from '@ipc/common.ipc'
import { toIpcError } from '@ipc/error.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import type { IRendererEvents } from '@lib/renderer-events.lib'
import type { NarratorStreamEvent } from '@lib/narrator.lib'
import type { IGameMasterService } from '@service/game-master.service'
import { z } from 'zod'

const turnSchema = z.object({
  worldId: idSchema,
  message: z.string().trim().min(1).max(TEXT_LIMITS.longText)
})

const streamTurnSchema = turnSchema.extend({ turnId: z.uuid() })

export function createGameMasterRoutes(
  gameMasterService: IGameMasterService,
  rendererEvents: IRendererEvents
): RoutesOf<'gameMaster'> {
  return {
    'gameMaster:takeTurn': route(turnSchema, ({ worldId, message }) =>
      gameMasterService.takeTurn(worldId, message)
    ),
    'gameMaster:streamTurn': route(streamTurnSchema, async ({ turnId, worldId, message }) => {
      // Anything that stops the turn from starting rejects here, as a normal IPC error.
      const events = await gameMasterService.streamTurn(worldId, message)

      // From here on the turn runs on its own and reports through events, not through this reply.
      void forwardTurn(turnId, events, rendererEvents)
    }),
    'gameMaster:listHistory': route(idSchema, (worldId) => gameMasterService.listHistory(worldId)),
    'gameMaster:deleteCampaign': route(idSchema, (worldId) =>
      gameMasterService.deleteCampaign(worldId)
    )
  }
}

/** Pumps a turn to the renderer; whatever happens, the last event is `done` or `error`. */
async function forwardTurn(
  turnId: string,
  events: AsyncIterable<NarratorStreamEvent>,
  rendererEvents: IRendererEvents
): Promise<void> {
  try {
    for await (const event of events) {
      rendererEvents.emit('gameMaster:turnEvent', { turnId, ...event })
    }
  } catch (error) {
    rendererEvents.emit('gameMaster:turnEvent', { turnId, type: 'error', error: toIpcError(error) })
  }
}
