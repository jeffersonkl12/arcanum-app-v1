import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema } from '../context/game.context'
import {
  actorMoveOutcomeSchema,
  actorMoveSchema,
  MAX_MOVES_PER_CALL
} from '../context/point-of-interest.context'

export const moveActorsTool = createTool({
  id: 'move-actors',
  description:
    'Moves actors to a place of the world in a single call: an NPC who walks into the tavern, a ' +
    'character who goes upstairs, someone who leaves for the market. Give each actor and the id ' +
    'of the place it ends up in (get it with `find-places`), or `placeId: null` when it is nowhere ' +
    'in particular. To move the whole party together, use `move-party` instead. Refused when an ' +
    'actor or a place does not exist in this world; the other moves still happen. Returns one ' +
    'result per move, in order.',
  inputSchema: z.object({
    moves: z.array(actorMoveSchema).min(1).max(MAX_MOVES_PER_CALL)
  }),
  outputSchema: z.object({ results: z.array(actorMoveOutcomeSchema) }),
  requestContextSchema: gameContextSchema,
  execute: async ({ moves }, { requestContext }) => ({
    results: await requestContext
      .get('pointOfInterestRegistry')
      .moveActors(requestContext.get('worldId'), moves)
  })
})
