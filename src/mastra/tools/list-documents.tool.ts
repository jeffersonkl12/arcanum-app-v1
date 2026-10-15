import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { documentIndexSchema } from '../context/document.context'
import { gameContextSchema } from '../context/game.context'

export const listDocumentsTool = createTool({
  id: 'list-documents',
  description:
    "Lists what the world's documents cover: each subject with the categories written about it. " +
    'Use it to see whether the world has anything on a topic and to learn the exact categories to ' +
    'pass to `recall-documents`. It returns names only; read the content with `recall-documents`.',
  inputSchema: z.object({}),
  outputSchema: documentIndexSchema,
  requestContextSchema: gameContextSchema,
  execute: async (_input, { requestContext }) =>
    requestContext.get('documentRegistry').index(requestContext.get('worldId'))
})
