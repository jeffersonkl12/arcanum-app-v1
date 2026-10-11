import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema } from '../context/game.context'
import { itemDraftSchema, itemOutcomeSchema, MAX_ITEMS_PER_CALL } from '../context/item.context'

export const createItemsTool = createTool({
  id: 'create-items',
  description:
    'Creates one or MANY items through the game engine in a single call: always batch every item ' +
    'you need now instead of calling once per item. Each item either lies loose in the world or, ' +
    'with `ownerId`, goes into that actor’s inventory, and with `equip` it is equipped right away ' +
    '(weapons and clothing). Returns one result per item, in order, with the id of each item ' +
    'created. A refused item (`ok=false`, see `reason`, e.g. the inventory is full) does not stop ' +
    'the others: fix only the ones that failed and call again for them.',
  inputSchema: z.object({ items: z.array(itemDraftSchema).min(1).max(MAX_ITEMS_PER_CALL) }),
  outputSchema: z.object({ results: z.array(itemOutcomeSchema) }),
  requestContextSchema: gameContextSchema,
  execute: async ({ items }, { requestContext }) => ({
    results: await requestContext
      .get('itemRegistry')
      .createItems(requestContext.get('worldId'), items)
  })
})
