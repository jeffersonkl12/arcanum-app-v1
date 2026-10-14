import { z } from 'zod'
// Pure constants of the engine, imported by relative path (see `game.context.ts`).
import { ACTOR_COIN_LIMITS } from '../../main/constant/actor-coin.constant'

/** Most transfers one batch call takes, so a single call cannot flood the engine or the context. */
export const MAX_COIN_TRANSFERS_PER_CALL = 20

const coinAmountSchema = z.number().int().min(ACTOR_COIN_LIMITS.min).max(ACTOR_COIN_LIMITS.max)

/** How many pieces of each coin; an omitted coin is zero. The engine checks that something moves. */
export const coinAmountsSchema = z.object({
  goldPieces: coinAmountSchema.optional().describe('Gold pieces, the most valuable coin.'),
  silverPieces: coinAmountSchema.optional(),
  bronzePieces: coinAmountSchema.optional()
})

export type CoinAmounts = z.infer<typeof coinAmountsSchema>

/**
 * Money that moves from one actor to another. Coins are never converted: each coin is paid with
 * the same coin, so the payer must carry enough of each one that is asked.
 */
export const coinTransferSchema = coinAmountsSchema.extend({
  fromActorId: z
    .uuid()
    .nullable()
    .describe('Id of the actor that pays, or null when the money comes from nowhere (a reward).'),
  toActorId: z
    .uuid()
    .nullable()
    .describe('Id of the actor that receives, or null when the money is gone (spent, lost, taxed).')
})

export type CoinTransfer = z.infer<typeof coinTransferSchema>

/** What an actor carries after a transfer. */
export const coinPurseSchema = z.object({
  actorId: z.string(),
  goldPieces: z.number().int(),
  silverPieces: z.number().int(),
  bronzePieces: z.number().int()
})

export type CoinPurse = z.infer<typeof coinPurseSchema>

/**
 * What happened to one transfer of a batch. A batch never stops at a failure: every transfer is
 * tried, and the outcomes come back in the order of the request.
 */
export const coinOutcomeSchema = z.object({
  ok: z.boolean(),
  from: coinPurseSchema.optional().describe('The payer as it is now; absent when it was null.'),
  to: coinPurseSchema.optional().describe('The receiver as it is now; absent when it was null.'),
  reason: z.string().optional().describe('Why the engine refused this transfer.')
})

export type CoinOutcome = z.infer<typeof coinOutcomeSchema>

/**
 * Port to the game engine's money, implemented in the main process. Like `IItemRegistry`, it is the
 * only way the AI moves money: balances, limits and ownership are the engine's. Every id is checked
 * to belong to `worldId`, because the ids come from the model.
 */
export interface ICoinRegistry {
  transferCoins(worldId: string, transfers: CoinTransfer[]): Promise<CoinOutcome[]>
}
