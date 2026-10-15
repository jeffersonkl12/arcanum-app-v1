import { INVENTORY_CAPACITY, TEXT_LIMITS, type EquipmentSlot } from '@constant'
import { itemTable } from '@database/entity/item.entity'
import { createInsertSchema } from 'drizzle-orm/zod'
import type { z } from 'zod'

/**
 * What the renderer sends to create an item. The world (or the actor whose inventory it goes to)
 * is in the channel's input, who carries the item and where it is equipped are the engine's
 * (`give` / `drop` / `equip` / `unequip`), so none of them is part of it, nor is the image path.
 * `slots` is 1 if not said; the weapon and clothing classes must match `type`
 * (`InventoryService` checks it).
 */
export const createItemSchema = createInsertSchema(itemTable, {
  name: (schema) => schema.trim().min(1).max(TEXT_LIMITS.name),
  description: (schema) => schema.max(TEXT_LIMITS.description),
  slots: (schema) => schema.min(1).max(INVENTORY_CAPACITY).optional()
}).omit({
  id: true,
  worldId: true,
  actorId: true,
  imagePath: true,
  equippedSlot: true
})

export const updateItemSchema = createItemSchema.partial()

export type Item = typeof itemTable.$inferSelect
export type CreateItem = z.infer<typeof createItemSchema>
export type UpdateItem = z.infer<typeof updateItemSchema>

/** A new row: what the service resolved from `CreateItem` plus the owner. */
export type NewItem = Omit<typeof itemTable.$inferInsert, 'id' | 'imagePath'>

/** What the repository can change: the item's own data, who carries it and where it is equipped. */
export type ItemPatch = UpdateItem & {
  actorId?: string | null
  equippedSlot?: EquipmentSlot | null
}
