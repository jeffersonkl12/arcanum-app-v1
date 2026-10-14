import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema } from '../context/game.context'
import { itemEquipSchema, itemOutcomeSchema, MAX_ITEMS_PER_CALL } from '../context/item.context'

export const equipItemsTool = createTool({
  id: 'equip-items',
  description:
    'Equips or unequips items an actor already carries, in a single call. Only weapons and ' +
    'clothing can be equipped. The engine decides where each goes (a light weapon in one hand, a ' +
    'heavy or ranged weapon in both, clothing on the body, one piece at a time) and takes off ' +
    'what it replaces. Unequipped items stay in the inventory. Returns one result per item, in ' +
    'order, with the slot it ended up in.',
  inputSchema: z.object({ changes: z.array(itemEquipSchema).min(1).max(MAX_ITEMS_PER_CALL) }),
  outputSchema: z.object({ results: z.array(itemOutcomeSchema) }),
  requestContextSchema: gameContextSchema,
  execute: async ({ changes }, { requestContext }) => ({
    results: await requestContext
      .get('itemRegistry')
      .equipItems(requestContext.get('worldId'), changes)
  })
})
