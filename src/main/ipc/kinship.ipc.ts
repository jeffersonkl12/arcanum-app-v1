import { idSchema } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { removeKinshipSchema, setKinshipSchema } from '@schema'
import type { IKinshipService } from '@service/kinship.service'

export function createKinshipRoutes(kinshipService: IKinshipService): RoutesOf<'kinship'> {
  return {
    'kinship:listByActor': route(idSchema, (actorId) => kinshipService.listForActor(actorId)),
    'kinship:set': route(setKinshipSchema, (input) => kinshipService.set(input)),
    'kinship:remove': route(removeKinshipSchema, (input) => kinshipService.remove(input))
  }
}
