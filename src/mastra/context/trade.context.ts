import { z } from 'zod'
import { coinAmountsSchema, coinPurseSchema } from './coin.context'
import { itemViewSchema } from './item.context'

/** Most purchases one batch call takes, so a single call cannot flood the engine or the context. */
export const MAX_PURCHASES_PER_CALL = 20

/**
 * An item bought. The price is not part of it: the engine charges the value of the item, so the
 * model cannot invent or haggle one, and the seller is whoever carries the item.
 */
export const purchaseSchema = z.object({
  itemId: z.uuid().describe('Id of the item for sale; it must have a value.'),
  buyerId: z.uuid().describe('Id of the actor (NPC or party member) that pays and receives it.')
})

export type Purchase = z.infer<typeof purchaseSchema>

/**
 * What happened to one purchase of a batch. A batch never stops at a failure: every purchase is
 * tried, and the outcomes come back in the order of the request.
 */
export const purchaseOutcomeSchema = z.object({
  ok: z.boolean(),
  itemId: z.string().optional(),
  item: itemViewSchema.optional().describe('The item as it is now, carried by the buyer.'),
  price: coinAmountsSchema.optional().describe('What the buyer paid.'),
  buyer: coinPurseSchema.optional().describe('The buyer’s money as it is now.'),
  seller: coinPurseSchema
    .optional()
    .describe('The seller’s money as it is now; absent when the item was loose in the world.'),
  reason: z.string().optional().describe('Why the engine refused this purchase.')
})

export type PurchaseOutcome = z.infer<typeof purchaseOutcomeSchema>

/**
 * Port to the game engine's trade, implemented in the main process. Like `IItemRegistry`, it is the
 * only way the AI buys: prices, balances and room in the inventory are the engine's. Every id is
 * checked to belong to `worldId`, because the ids come from the model.
 */
export interface ITradeRegistry {
  purchaseItems(worldId: string, purchases: Purchase[]): Promise<PurchaseOutcome[]>
}
