import { createTool } from '@mastra/core/tools'
import { gameContextSchema } from '../context/game.context'
import { partyChangeResultSchema, partyNpcIdsSchema } from '../context/party.context'

export const leavePartyTool = createTool({
  id: 'leave-party',
  description:
    'Takes NPCs out of the party: they stop following the player and stay where they are, ' +
    'because their path parts from the party, the job is done or they were left behind. They ' +
    'no longer move with `move-party`. Batch every NPC of the moment in one call; an NPC that ' +
    'is not in the party is ignored. Returns one result per NPC and the members that remain.',
  inputSchema: partyNpcIdsSchema,
  outputSchema: partyChangeResultSchema,
  requestContextSchema: gameContextSchema,
  execute: async ({ npcIds }, { requestContext }) =>
    requestContext.get('partyRegistry').leave(requestContext.get('worldId'), npcIds)
})
