import { idSchema } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { createItemSchema } from '@schema'
import type { IInventoryService } from '@service/inventory.service'
import { z } from 'zod'

const addItemSchema = z.object({ actorId: idSchema, item: createItemSchema })

export function createInventoryRoutes(inventoryService: IInventoryService): RoutesOf<'inventory'> {
  return {
    'inventory:get': route(idSchema, (actorId) => inventoryService.get(actorId)),
    'inventory:addItem': route(addItemSchema, ({ actorId, item }) =>
      inventoryService.addItem(actorId, item)
    ),
    'inventory:equip': route(idSchema, (itemId) => inventoryService.equip(itemId)),
    'inventory:unequip': route(idSchema, (itemId) => inventoryService.unequip(itemId))
  }
}
