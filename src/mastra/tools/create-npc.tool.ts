import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema, npcDraftSchema } from '../context/game.context'

export const createNpcTool = createTool({
  id: 'create-npc',
  description:
    'Registers a new NPC in the current world through the game engine and returns it with its id. ' +
    'If the engine rejects the NPC, `reason` says why; fix the data and call again.',
  inputSchema: npcDraftSchema,
  outputSchema: z.object({
    created: z.boolean(),
    npc: npcDraftSchema.extend({ id: z.string() }).optional(),
    reason: z.string().optional()
  }),
  requestContextSchema: gameContextSchema,
  execute: async (draft, { requestContext }) => {
    const result = await requestContext
      .get('npcRegistry')
      .createNpc(requestContext.get('worldId'), draft)

    return result.ok
      ? { created: true, npc: result.npc }
      : { created: false, reason: result.reason }
  }
})
