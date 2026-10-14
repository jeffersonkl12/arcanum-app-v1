import { createTool } from '@mastra/core/tools'
import { gameContextSchema } from '../context/game.context'
import { inventoryViewSchema, itemQuerySchema } from '../context/item.context'

export const findItemsTool = createTool({
  id: 'find-items',
  description:
    'Looks up specific items and returns their full details (description, type, weapon or clothing class, ' +
    'who carries it, where it is equipped) and their ids. Search by `name` (part of it is enough), ' +
    'narrowed with `actorId` to what one actor carries, or by exact `itemId`. Use it when you need ' +
    'more about an item the party section only names, or to get the id before acting on it. To ' +
    'see a whole inventory, use `get-inventory`.',
  inputSchema: itemQuerySchema,
  outputSchema: inventoryViewSchema,
  requestContextSchema: gameContextSchema,
  execute: async (query, { requestContext }) =>
    requestContext.get('itemRegistry').findItems(requestContext.get('worldId'), query)
})
