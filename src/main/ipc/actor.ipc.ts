import { idSchema, updateInput } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { createActorSchema, updateActorSchema } from '@schema'
import type { IActorService } from '@service/actor.service'

export function createActorRoutes(actorService: IActorService): RoutesOf<'actor'> {
  return {
    'actor:listByWorld': route(idSchema, (worldId) => actorService.listByWorld(worldId)),
    'actor:get': route(idSchema, (id) => actorService.get(id)),
    'actor:create': route(createActorSchema, (input) => actorService.create(input)),
    'actor:update': route(updateInput(updateActorSchema), ({ id, patch }) =>
      actorService.update(id, patch)
    ),
    'actor:delete': route(idSchema, (id) => actorService.delete(id))
  }
}
