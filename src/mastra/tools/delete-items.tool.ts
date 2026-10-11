import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema } from '../context/game.context'
import { itemOutcomeSchema, MAX_ITEMS_PER_CALL } from '../context/item.context'

export const deleteItemsTool = createTool({
  id: 'delete-items',
  description:
    'Destroys one or many items for good, carried or not (burned, broken, spent, lost for ever). ' +
    'To only move an item, use `transfer-items` instead. Returns one result per item, in order.',
  inputSchema: z.object({ itemIds: z.array(z.uuid()).min(1).max(MAX_ITEMS_PER_CALL) }),
  outputSchema: z.object({ results: z.array(itemOutcomeSchema) }),
  requestContextSchema: gameContextSchema,
  execute: async ({ itemIds }, { requestContext }) => ({
    results: await requestContext
      .get('itemRegistry')
      .deleteItems(requestContext.get('worldId'), itemIds)
  })
})
