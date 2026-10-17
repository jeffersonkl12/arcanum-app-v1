import { createTool } from '@mastra/core/tools'
import { PARTY_LIMITS } from '../../main/constant/party.constant'
import { gameContextSchema } from '../context/game.context'
import { partyChangeResultSchema, partyNpcIdsSchema } from '../context/party.context'

export const joinPartyTool = createTool({
  id: 'join-party',
  description:
    'Puts NPCs in the party: from now on they travel with the player and move together with ' +
    '`move-party`. Call it when an NPC agrees to follow the player for a while, even a short ' +
    'while: it is better to have everyone who goes along in the party than to move each one ' +
    'with `move-actors`. The party holds at most ' +
    `${PARTY_LIMITS.maxMembers} members, the player included (${PARTY_LIMITS.maxNpcs} NPCs); ` +
    'a full party refuses, so someone has to leave first. Batch every NPC of the moment in one ' +
    'call; an NPC already in the party is kept. Returns one result per NPC and the members.',
  inputSchema: partyNpcIdsSchema,
  outputSchema: partyChangeResultSchema,
  requestContextSchema: gameContextSchema,
  execute: async ({ npcIds }, { requestContext }) =>
    requestContext.get('partyRegistry').join(requestContext.get('worldId'), npcIds)
})
