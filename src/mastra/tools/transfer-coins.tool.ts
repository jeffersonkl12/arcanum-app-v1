import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  coinOutcomeSchema,
  coinTransferSchema,
  MAX_COIN_TRANSFERS_PER_CALL
} from '../context/coin.context'
import { gameContextSchema } from '../context/game.context'

export const transferCoinsTool = createTool({
  id: 'transfer-coins',
  description:
    'Moves money in a single call, between actors or from and to the world itself: payments, ' +
    'purchases, wages, bribes, loot, theft, rewards and fines. Give how many `goldPieces`, ' +
    '`silverPieces` and `bronzePieces` move; coins are never converted, so the payer needs enough ' +
    'of each coin that is asked. Use `fromActorId: null` for money that comes from nowhere (a ' +
    'reward, treasure found) and `toActorId: null` for money that is gone (spent in a shop, lost, ' +
    'taxed). Refused when the payer is short; nothing then moves. Returns one result per ' +
    'transfer, in order, with the money of each actor as it is now.',
  inputSchema: z.object({
    transfers: z.array(coinTransferSchema).min(1).max(MAX_COIN_TRANSFERS_PER_CALL)
  }),
  outputSchema: z.object({ results: z.array(coinOutcomeSchema) }),
  requestContextSchema: gameContextSchema,
  execute: async ({ transfers }, { requestContext }) => ({
    results: await requestContext
      .get('coinRegistry')
      .transferCoins(requestContext.get('worldId'), transfers)
  })
})
