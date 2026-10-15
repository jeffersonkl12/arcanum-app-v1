import { idSchema, updateInput } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { createActorInputSchema, setImageSchema, updateActorInputSchema } from '@schema'
import type { IActorService } from '@service/actor.service'
import type { IImageService } from '@service/image.service'

export function createActorRoutes(
  actorService: IActorService,
  actorImageService: IImageService
): RoutesOf<'actor'> {
  return {
    'actor:listByWorld': route(idSchema, (worldId) => actorService.listByWorld(worldId)),
    'actor:get': route(idSchema, (id) => actorService.get(id)),
    'actor:create': route(createActorInputSchema, (input) => actorService.create(input)),
    'actor:update': route(updateInput(updateActorInputSchema), ({ id, patch }) =>
      actorService.update(id, patch)
    ),
    'actor:delete': route(idSchema, (id) => actorService.delete(id)),
    'actor:setImage': route(setImageSchema, ({ id, data }) => actorImageService.set(id, data)),
    'actor:removeImage': route(idSchema, (id) => actorImageService.remove(id))
  }
}
