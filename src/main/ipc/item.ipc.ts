import { idSchema, updateInput } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { createItemSchema, setImageSchema, updateItemSchema } from '@schema'
import type { IImageService } from '@service/image.service'
import type { IInventoryService } from '@service/inventory.service'
import { z } from 'zod'

const createInWorldSchema = z.object({ worldId: idSchema, item: createItemSchema })
const giveSchema = z.object({ itemId: idSchema, actorId: idSchema })

export function createItemRoutes(
  inventoryService: IInventoryService,
  itemImageService: IImageService
): RoutesOf<'item'> {
  return {
    'item:listByWorld': route(idSchema, (worldId) => inventoryService.listByWorld(worldId)),
    'item:createInWorld': route(createInWorldSchema, ({ worldId, item }) =>
      inventoryService.createInWorld(worldId, item)
    ),
    'item:give': route(giveSchema, ({ itemId, actorId }) => inventoryService.give(itemId, actorId)),
    'item:drop': route(idSchema, (id) => inventoryService.drop(id)),
    'item:get': route(idSchema, (id) => inventoryService.getItem(id)),
    'item:update': route(updateInput(updateItemSchema), ({ id, patch }) =>
      inventoryService.updateItem(id, patch)
    ),
    'item:remove': route(idSchema, (id) => inventoryService.removeItem(id)),
    'item:consume': route(idSchema, (id) => inventoryService.consume(id)),
    'item:setImage': route(setImageSchema, ({ id, data }) => itemImageService.set(id, data)),
    'item:removeImage': route(idSchema, (id) => itemImageService.remove(id))
  }
}
