import { idSchema, updateInput } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { createCultureSchema, updateCultureSchema } from '@schema'
import type { ICultureService } from '@service/culture.service'

export function createCultureRoutes(cultureService: ICultureService): RoutesOf<'culture'> {
  return {
    'culture:listByWorld': route(idSchema, (worldId) => cultureService.listByWorld(worldId)),
    'culture:get': route(idSchema, (id) => cultureService.get(id)),
    'culture:create': route(createCultureSchema, (input) => cultureService.create(input)),
    'culture:update': route(updateInput(updateCultureSchema), ({ id, patch }) =>
      cultureService.update(id, patch)
    ),
    'culture:delete': route(idSchema, (id) => cultureService.delete(id))
  }
}
