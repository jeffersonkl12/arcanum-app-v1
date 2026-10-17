import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema, npcDraftSchema, npcViewSchema } from '../context/game.context'

export const createNpcTool = createTool({
  id: 'create-npc',
  description:
    'Registers a new NPC in the current world through the game engine and returns it with its id ' +
    'and the values the engine settled on (attributes, hit points and money, with the defaults ' +
    'filled in). Items are not part of it: create them afterwards with `create-items`, using the ' +
    'id returned here as `ownerId`. If the engine rejects the NPC (`ok=false`), `reason` says why; ' +
    'fix the data and call again. Use it for NPCs who are important or likely to be met again, ' +
    'not for every person the player talks to.',
  inputSchema: npcDraftSchema,
  outputSchema: z.object({
    ok: z.boolean(),
    npc: npcViewSchema.optional(),
    reason: z.string().optional()
  }),
  requestContextSchema: gameContextSchema,
  execute: async (draft, { requestContext }) => {
    const result = await requestContext
      .get('npcRegistry')
      .createNpc(requestContext.get('worldId'), draft)

    return result.ok ? { ok: true, npc: result.npc } : { ok: false, reason: result.reason }
  }
})
