import { createTool } from '@mastra/core/tools'
import { gameContextSchema } from '../context/game.context'
import { memoryQuerySchema, memoryRecallSchema } from '../context/memory.context'

export const recallMemoriesTool = createTool({
  id: 'recall-memories',
  description:
    "Searches the characters' long-term memory by meaning. The prompt already lists the latest " +
    'memories and the ones close to what the player just said; use this when a character should ' +
    'remember something those do not show: a person, place or event from long ago, or what one ' +
    'specific character knows (pass `actorId`). A character only remembers memories it is an actor of: ' +
    'never let it recall one it is not listed in. Returns the best matches first; an empty list means ' +
    'nothing relevant is remembered.',
  inputSchema: memoryQuerySchema,
  outputSchema: memoryRecallSchema,
  requestContextSchema: gameContextSchema,
  execute: async (query, { requestContext }) =>
    requestContext.get('memoryRegistry').recall(requestContext.get('worldId'), query)
})
