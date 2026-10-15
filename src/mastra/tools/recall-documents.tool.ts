import { createTool } from '@mastra/core/tools'
import { documentQuerySchema, documentRecallSchema } from '../context/document.context'
import { gameContextSchema } from '../context/game.context'

export const recallDocumentsTool = createTool({
  id: 'recall-documents',
  description:
    "Searches the world's documents by meaning: what the player wrote about its subjects, such as " +
    'houses, cities, economy, politics, history, customs or rules of the setting. Use it before ' +
    'narrating or answering anything that depends on such a fact, instead of inventing it. Pass ' +
    '`category` to narrow the search to one kind of document. What it finds stays in the prompt for ' +
    'a few turns. Returns the best matches first; an empty list means the world has nothing written ' +
    'about it, so do not present an invention as established fact.',
  inputSchema: documentQuerySchema,
  outputSchema: documentRecallSchema,
  requestContextSchema: gameContextSchema,
  execute: async (query, { requestContext }) =>
    requestContext.get('documentRegistry').recall(requestContext.get('worldId'), query)
})
