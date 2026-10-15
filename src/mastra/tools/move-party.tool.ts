import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema } from '../context/game.context'
import { partyMoveOutcomeSchema } from '../context/point-of-interest.context'

export const movePartyTool = createTool({
  id: 'move-party',
  description:
    'Takes the whole party, every member at once, to a place of the world: they travel to the ' +
    'next town, enter the inn, climb to the tower. Give the id of the place they end up in (get ' +
    'it with `find-places`), or `placeId: null` when they are nowhere in particular. Members ' +
    'never end up split: either all of them move or none does. To move one actor, or an NPC that ' +
    'is not in the party, use `move-actors`.',
  inputSchema: z.object({
    placeId: z
      .uuid()
      .nullable()
      .describe('Id of the place the party ends up in, or null when it is nowhere in particular.')
  }),
  outputSchema: partyMoveOutcomeSchema,
  requestContextSchema: gameContextSchema,
  execute: async ({ placeId }, { requestContext }) =>
    requestContext.get('pointOfInterestRegistry').moveParty(requestContext.get('worldId'), placeId)
})
