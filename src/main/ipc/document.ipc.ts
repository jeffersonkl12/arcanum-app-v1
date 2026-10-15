import { idSchema, updateInput } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { createDocumentSchema, updateDocumentSchema } from '@schema'
import type { IDocumentService } from '@service/document.service'

export function createDocumentRoutes(documentService: IDocumentService): RoutesOf<'document'> {
  return {
    'document:listByWorld': route(idSchema, (worldId) => documentService.listByWorld(worldId)),
    'document:get': route(idSchema, (id) => documentService.get(id)),
    'document:create': route(createDocumentSchema, (input) => documentService.create(input)),
    'document:update': route(updateInput(updateDocumentSchema), ({ id, patch }) =>
      documentService.update(id, patch)
    ),
    'document:delete': route(idSchema, (id) => documentService.delete(id))
  }
}
