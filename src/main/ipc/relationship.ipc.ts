import { idSchema } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import type { IRelationshipService } from '@service/relationship.service'

export function createRelationshipRoutes(
  relationshipService: IRelationshipService
): RoutesOf<'relationship'> {
  return {
    'relationship:listByActor': route(idSchema, (actorId) =>
      relationshipService.listForActor(actorId)
    )
  }
}
