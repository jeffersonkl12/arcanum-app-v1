import { idSchema } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { createPartySchema } from '@schema'
import type { IPartyService } from '@service/party.service'
import { z } from 'zod'

const membershipSchema = z.object({ partyId: idSchema, actorId: idSchema })

export function createPartyRoutes(partyService: IPartyService): RoutesOf<'party'> {
  return {
    'party:findByWorld': route(idSchema, (worldId) => partyService.findByWorld(worldId)),
    'party:create': route(createPartySchema, (input) => partyService.create(input)),
    'party:delete': route(idSchema, (id) => partyService.delete(id)),
    'party:listMembers': route(idSchema, (partyId) => partyService.listMembers(partyId)),
    'party:addMember': route(membershipSchema, ({ partyId, actorId }) =>
      partyService.addMember(partyId, actorId)
    ),
    'party:removeMember': route(membershipSchema, ({ partyId, actorId }) =>
      partyService.removeMember(partyId, actorId)
    )
  }
}
