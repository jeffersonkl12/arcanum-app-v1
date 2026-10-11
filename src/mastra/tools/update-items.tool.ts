import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema } from '../context/game.context'
import { itemOutcomeSchema, itemUpdateSchema, MAX_ITEMS_PER_CALL } from '../context/item.context'

export const updateItemsTool = createTool({
  id: 'update-items',
  description:
    'Changes one or many existing items in a single call (rename, rewrite the description, make ' +
    'it a different weapon or armor, change its size). Send only the fields that change; `null` ' +
    'clears an optional field. An equipped item cannot change how it is held or worn: unequip it ' +
    'first. Returns one result per item, in order, with the item as it is now.',
  inputSchema: z.object({ updates: z.array(itemUpdateSchema).min(1).max(MAX_ITEMS_PER_CALL) }),
  outputSchema: z.object({ results: z.array(itemOutcomeSchema) }),
  requestContextSchema: gameContextSchema,
  execute: async ({ updates }, { requestContext }) => ({
    results: await requestContext
      .get('itemRegistry')
      .updateItems(requestContext.get('worldId'), updates)
  })
})
