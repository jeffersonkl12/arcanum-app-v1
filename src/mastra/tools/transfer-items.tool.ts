import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema } from '../context/game.context'
import {
  itemOutcomeSchema,
  itemTransferSchema,
  MAX_ITEMS_PER_CALL
} from '../context/item.context'

export const transferItemsTool = createTool({
  id: 'transfer-items',
  description:
    'Moves one or many items in a single call: from anyone (or the ground) to an actor, between ' +
    'actors, or to the ground with `toActorId: null` (dropped, left behind). The item arrives ' +
    'unequipped. Use it for gifts, trades, loot, theft and dropped things. Refused when the ' +
    'receiver has no room; the item then stays where it was. Returns one result per item, in order.',
  inputSchema: z.object({
    transfers: z.array(itemTransferSchema).min(1).max(MAX_ITEMS_PER_CALL)
  }),
  outputSchema: z.object({ results: z.array(itemOutcomeSchema) }),
  requestContextSchema: gameContextSchema,
  execute: async ({ transfers }, { requestContext }) => ({
    results: await requestContext
      .get('itemRegistry')
      .transferItems(requestContext.get('worldId'), transfers)
  })
})
