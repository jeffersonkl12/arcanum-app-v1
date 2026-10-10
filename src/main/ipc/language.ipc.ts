import { idSchema, updateInput } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { createLanguageSchema, updateLanguageSchema } from '@schema'
import type { ILanguageService } from '@service/language.service'

export function createLanguageRoutes(languageService: ILanguageService): RoutesOf<'language'> {
  return {
    'language:listByWorld': route(idSchema, (worldId) => languageService.listByWorld(worldId)),
    'language:get': route(idSchema, (id) => languageService.get(id)),
    'language:create': route(createLanguageSchema, (input) => languageService.create(input)),
    'language:update': route(updateInput(updateLanguageSchema), ({ id, patch }) =>
      languageService.update(id, patch)
    ),
    'language:delete': route(idSchema, (id) => languageService.delete(id))
  }
}
