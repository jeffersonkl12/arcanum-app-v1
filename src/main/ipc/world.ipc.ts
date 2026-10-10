import { idSchema, updateInput } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { createWorldSchema, updateWorldSchema, worldFilterSchema } from '@schema'
import { cloneWorldSchema } from '@schema/world-clone.schema'
import type { IWorldCloneService } from '@service/world-clone.service'
import type { IWorldService } from '@service/world.service'

export function createWorldRoutes(
  worldService: IWorldService,
  worldCloneService: IWorldCloneService
): RoutesOf<'world'> {
  return {
    'world:list': route(worldFilterSchema.optional(), (filter) => worldService.list(filter)),
    'world:get': route(idSchema, (id) => worldService.get(id)),
    'world:create': route(createWorldSchema, (input) => worldService.create(input)),
    'world:update': route(updateInput(updateWorldSchema), ({ id, patch }) =>
      worldService.update(id, patch)
    ),
    'world:delete': route(idSchema, (id) => worldService.delete(id)),
    'world:clone': route(cloneWorldSchema, (input) => worldCloneService.clone(input))
  }
}
