import { idSchema } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import type { IMemoryService } from '@service/memory.service'

export function createMemoryRoutes(memoryService: IMemoryService): RoutesOf<'memory'> {
  return {
    'memory:listByActor': route(idSchema, (actorId) => memoryService.listByActor(actorId))
  }
}
