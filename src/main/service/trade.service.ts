import { ACTOR_COINS, type CoinSet } from '@constant'
import { ConflictError } from '@error'
import type { Actor } from '@schema/actor.schema'
import type { Item } from '@schema/item.schema'
import type { IActorService } from '@service/actor.service'
import type { ICoinService } from '@service/coin.service'
import type { IInventoryService } from '@service/inventory.service'

export interface PurchaseRequest {
  buyerId: string
  itemId: string
}

export interface Purchase {
  /** The item as it is now, in the buyer's inventory. */
  item: Item
  /** What was paid: the value of the item. */
  price: CoinSet
  buyer: Actor
  /** The one who carried the item and got the money; absent when the item lay loose in the world. */
  seller?: Actor
}

export interface ITradeService {
  /**
   * The buyer pays the value of the item and receives it, unequipped. The price is the item's own
   * (coins are never converted, so the buyer needs enough of each coin it asks); the seller is
   * whoever carries it, and the money is gone when nobody does. Throws `NotFoundError` for an
   * unknown actor or item and `ConflictError` for a rule breach (no value, short of money, no room
   * in the inventory, different worlds). Nothing changes on failure.
   */
  purchase(request: PurchaseRequest): Promise<Purchase>
}

/** Buying and selling combine two engine rules, money and inventory; this service owns the deal. */
export class TradeService implements ITradeService {
  constructor(
    private readonly actorService: IActorService,
    private readonly inventoryService: IInventoryService,
    private readonly coinService: ICoinService
  ) {}

  async purchase({ buyerId, itemId }: PurchaseRequest): Promise<Purchase> {
    const buyer = await this.actorService.get(buyerId)
    const item = await this.inventoryService.getItem(itemId)

    if (item.worldId !== buyer.worldId) {
      throw new ConflictError('The item and the buyer belong to different worlds')
    }
    if (item.actorId === buyer.id) {
      throw new ConflictError(`${buyer.name} already carries the item`)
    }

    const price = priceOf(item)
    if (ACTOR_COINS.every((coin) => price[coin] === 0)) {
      throw new ConflictError(`"${item.name}" has no value, so it cannot be bought`)
    }

    // Checked before the money moves, so a buyer without room never pays.
    const { freeSlots } = await this.inventoryService.get(buyer.id)
    if (freeSlots < item.slots) {
      throw new ConflictError(
        `${buyer.name} has ${freeSlots} free inventory slots and "${item.name}" takes ${item.slots}`
      )
    }

    const payment = await this.coinService.transfer({
      fromActorId: buyer.id,
      toActorId: item.actorId,
      coins: price
    })

    try {
      return {
        item: await this.inventoryService.transfer(item.id, buyer.id),
        price,
        buyer: payment.from ?? buyer,
        seller: payment.to
      }
    } catch (error) {
      // The item did not move after all: give the money back so the deal is all or nothing.
      await this.coinService.transfer({
        fromActorId: item.actorId,
        toActorId: buyer.id,
        coins: price
      })

      throw error
    }
  }
}

function priceOf(item: Item): CoinSet {
  return {
    goldPieces: item.goldPieces,
    silverPieces: item.silverPieces,
    bronzePieces: item.bronzePieces
  }
}
