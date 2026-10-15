import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema } from '../context/game.context'
import {
  MAX_PURCHASES_PER_CALL,
  purchaseOutcomeSchema,
  purchaseSchema
} from '../context/trade.context'

export const purchaseItemsTool = createTool({
  id: 'purchase-items',
  description:
    'Buys one or MANY items in a single call: the buyer pays and the item moves to its ' +
    'inventory, together or not at all. You never set the price: the engine charges the value ' +
    'the item has (see `goldPieces`, `silverPieces` and `bronzePieces` on the item), and the ' +
    'money goes to whoever carries it, or is gone if the item lay loose in the world. Coins are ' +
    'never converted, so the buyer needs enough of each coin the item asks. Refused when the item ' +
    'has no value, the buyer is short of money or has no room; nothing then moves. Use it for ' +
    'shops and merchants; use the transfer tools for gifts, loot and theft. Returns one result ' +
    'per purchase, in order, with the price and the money of buyer and seller as it is now.',
  inputSchema: z.object({
    purchases: z.array(purchaseSchema).min(1).max(MAX_PURCHASES_PER_CALL)
  }),
  outputSchema: z.object({ results: z.array(purchaseOutcomeSchema) }),
  requestContextSchema: gameContextSchema,
  execute: async ({ purchases }, { requestContext }) => ({
    results: await requestContext
      .get('tradeRegistry')
      .purchaseItems(requestContext.get('worldId'), purchases)
  })
})
