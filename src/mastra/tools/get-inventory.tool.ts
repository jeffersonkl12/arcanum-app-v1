import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema } from '../context/game.context'
import { inventoryViewSchema } from '../context/item.context'

export const getInventoryTool = createTool({
  id: 'get-inventory',
  description:
    'Reads what an actor carries (items with their ids and where each is equipped, plus the ' +
    'inventory `capacity`, `usedSlots` and `freeSlots`), or, without `actorId`, the items lying ' +
    'loose in the world. Use it to learn the id of an item before updating, deleting, moving or ' +
    'equipping it, or to check there is room before giving something; never guess an item id.',
  inputSchema: z.object({
    actorId: z.uuid().optional().describe('Omit to list the loose items of the world.')
  }),
  outputSchema: inventoryViewSchema,
  requestContextSchema: gameContextSchema,
  execute: async ({ actorId }, { requestContext }) =>
    requestContext.get('itemRegistry').getInventory(requestContext.get('worldId'), actorId)
})
