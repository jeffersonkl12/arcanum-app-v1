import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { MEMORY_LIMITS } from '../../main/constant/memory.constant'
import { gameContextSchema } from '../context/game.context'
import { memoryDraftSchema, memoryOutcomeSchema } from '../context/memory.context'

export const rememberEventsTool = createTool({
  id: 'remember-events',
  description:
    "Records in the characters' long-term memory something that just happened and that they would " +
    'still remember later: a betrayal, a revelation, a secret shared, a promise, a quarrel, a favor, ' +
    'a bond made or a moment spent together. One memory belongs to every actor listed, so each of ' +
    'them can recall it later (a card game between an NPC and the player is ONE memory with both). ' +
    'Record only what matters to the story; do not record routine actions or what is happening ' +
    'in this very scene and will not be asked about. Give each memory the importance it deserves. ' +
    'Several events of one scene go in a single call. Returns one result per memory, in order.',
  inputSchema: z.object({
    memories: z.array(memoryDraftSchema).min(1).max(MEMORY_LIMITS.perCall)
  }),
  outputSchema: z.object({ results: z.array(memoryOutcomeSchema) }),
  requestContextSchema: gameContextSchema,
  execute: async ({ memories }, { requestContext }) => ({
    results: await requestContext
      .get('memoryRegistry')
      .remember(requestContext.get('worldId'), memories)
  })
})
