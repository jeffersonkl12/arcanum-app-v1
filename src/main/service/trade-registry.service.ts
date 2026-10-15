import { ConflictError, NotFoundError } from '@error'
import type { Actor } from '@schema/actor.schema'
import type { IActorService } from '@service/actor.service'
import type { IInventoryService } from '@service/inventory.service'
import type { ITradeService } from '@service/trade.service'
import { toItemView } from '@util/item-view.util'
import type { CoinPurse } from '../../mastra/context/coin.context'
import type { ITradeRegistry, Purchase, PurchaseOutcome } from '../../mastra/context/trade.context'

/**
 * The AI's door to buying, the counterpart of the item and coin registries. It does no rule
 * checking of its own: price, balance and room are `ITradeService`'s. What it adds is what an AI
 * caller needs and the UI does not:
 *
 * - **Batches.** Each purchase is tried in order and has its own outcome, so one refused purchase
 *   never loses the others. Order matters because a balance is checked after the earlier ones.
 * - **World scope.** The ids come from the model, so the buyer and the item must belong to the
 *   world of the turn; anything else answers as if it did not exist.
 * - **Rule breaches as answers.** `ConflictError` and `NotFoundError` become a `reason` the model
 *   can act on; anything else is a bug and propagates.
 */
export class TradeRegistryService implements ITradeRegistry {
  constructor(
    private readonly tradeService: ITradeService,
    private readonly actorService: IActorService,
    private readonly inventoryService: IInventoryService
  ) {}

  async purchaseItems(worldId: string, purchases: Purchase[]): Promise<PurchaseOutcome[]> {
    const outcomes: PurchaseOutcome[] = []

    for (const purchase of purchases) {
      try {
        outcomes.push(await this.purchaseOne(worldId, purchase))
      } catch (error) {
        outcomes.push({ ok: false, itemId: purchase.itemId, reason: reasonOf(error) })
      }
    }

    return outcomes
  }

  private async purchaseOne(
    worldId: string,
    { itemId, buyerId }: Purchase
  ): Promise<PurchaseOutcome> {
    const buyerActor = await this.actorService.get(buyerId)
    const item = await this.inventoryService.getItem(itemId)

    if (buyerActor.worldId !== worldId) {
      throw new NotFoundError('Actor', buyerId)
    }
    if (item.worldId !== worldId) {
      throw new NotFoundError('Item', itemId)
    }

    const {
      price,
      buyer,
      seller,
      item: bought
    } = await this.tradeService.purchase({
      buyerId,
      itemId
    })

    return {
      ok: true,
      itemId,
      item: toItemView(bought),
      price,
      buyer: toPurse(buyer),
      seller: seller && toPurse(seller)
    }
  }
}

/** The answer for a rule breach; anything that is not one is a bug and keeps propagating. */
function reasonOf(error: unknown): string {
  if (error instanceof ConflictError || error instanceof NotFoundError) {
    return error.message
  }

  throw error
}

function toPurse(actor: Actor): CoinPurse {
  return {
    actorId: actor.id,
    goldPieces: actor.goldPieces,
    silverPieces: actor.silverPieces,
    bronzePieces: actor.bronzePieces
  }
}
