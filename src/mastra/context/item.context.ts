import { z } from 'zod'
// Pure constants of the engine, imported by relative path (see `game.context.ts`).
import { EQUIPMENT_SLOTS } from '../../main/constant/inventory.constant'
import {
  ARMOR_BONUS,
  ITEM_MAX_SLOTS,
  WEAPON_CLASSES,
  WEAPON_DICE,
  WEAR_SLOTS
} from '../../main/constant/item.constant'
import { TEXT_LIMITS } from '../../main/constant/text-limit.constant'

/** Most entries one batch call takes, so a single call cannot flood the engine or the context. */
export const MAX_ITEMS_PER_CALL = 20

/** The fields that describe an item. The engine reconciles them (a tiny item takes no slots). */
const itemFieldsSchema = z.object({
  name: z.string().trim().min(1).max(TEXT_LIMITS.name),
  description: z.string().max(TEXT_LIMITS.longText).optional(),
  isTiny: z.boolean().optional().describe('Tiny items (a coin, a key) take no inventory slot.'),
  slots: z
    .number()
    .int()
    .min(1)
    .max(ITEM_MAX_SLOTS)
    .optional()
    .describe('Inventory slots taken; 1 if omitted. Ignored for a tiny item.'),
  isConsumable: z.boolean().optional(),
  weaponClass: z
    .enum(WEAPON_CLASSES)
    .optional()
    .describe('Makes it a weapon (needs `damageDie`). Light: one hand. Heavy and ranged: both.'),
  damageDie: z.enum(WEAPON_DICE).optional().describe('Weapons only, together with `weaponClass`.'),
  wearSlot: z
    .enum(WEAR_SLOTS)
    .optional()
    .describe('Makes it a piece of clothing (needs `armorBonus`).'),
  armorBonus: z
    .number()
    .int()
    .min(ARMOR_BONUS.min)
    .max(ARMOR_BONUS.max)
    .optional()
    .describe('Clothing only: 0 is common clothing, 3 is the most protection allowed.')
})

/** A new item. Without `ownerId` it just lies somewhere in the world. */
export const itemDraftSchema = itemFieldsSchema.extend({
  ownerId: z
    .uuid()
    .optional()
    .describe('Id of the actor (NPC or party member) that carries it. Omit for a loose item.'),
  equip: z
    .boolean()
    .optional()
    .describe('Equip it right away. Only weapons and clothing, and only with an `ownerId`.')
})

export type ItemDraft = z.infer<typeof itemDraftSchema>

/** What changes in an item; `null` clears an optional field (a sword that stops being a weapon). */
export const itemPatchSchema = itemFieldsSchema.partial().extend({
  description: z.string().max(TEXT_LIMITS.longText).nullable().optional(),
  weaponClass: z.enum(WEAPON_CLASSES).nullable().optional(),
  damageDie: z.enum(WEAPON_DICE).nullable().optional(),
  wearSlot: z.enum(WEAR_SLOTS).nullable().optional(),
  armorBonus: z.number().int().min(ARMOR_BONUS.min).max(ARMOR_BONUS.max).nullable().optional()
})

export type ItemPatch = z.infer<typeof itemPatchSchema>

export const itemUpdateSchema = z.object({ itemId: z.uuid(), patch: itemPatchSchema })

export type ItemUpdate = z.infer<typeof itemUpdateSchema>

export const itemTransferSchema = z.object({
  itemId: z.uuid(),
  toActorId: z
    .uuid()
    .nullable()
    .describe('Id of the actor that receives the item, or null to leave it loose in the world.')
})

export type ItemTransfer = z.infer<typeof itemTransferSchema>

export const itemEquipSchema = z.object({
  itemId: z.uuid(),
  equipped: z.boolean().describe('true to equip, false to take it off (it stays carried).')
})

export type ItemEquip = z.infer<typeof itemEquipSchema>

/** An item as the AI reads it. Fields that do not apply to the item are left out. */
export const itemViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  slots: z.number().int(),
  isConsumable: z.boolean().optional(),
  weaponClass: z.enum(WEAPON_CLASSES).optional(),
  damageDie: z.enum(WEAPON_DICE).optional(),
  wearSlot: z.enum(WEAR_SLOTS).optional(),
  armorBonus: z.number().int().optional(),
  carriedBy: z.string().optional().describe('Id of the actor that carries it; absent if loose.'),
  equippedSlot: z.enum(EQUIPMENT_SLOTS).optional()
})

export type ItemView = z.infer<typeof itemViewSchema>

/**
 * What happened to one entry of a batch. A batch never stops at a failure: every entry is tried,
 * and the outcomes come back in the order of the request.
 */
export const itemOutcomeSchema = z.object({
  ok: z.boolean(),
  itemId: z.string().optional(),
  item: itemViewSchema.optional().describe('The item as it is now; absent for a deletion.'),
  reason: z.string().optional().describe('Why the engine refused this entry.'),
  warning: z.string().optional().describe('The entry worked in part (for example, not equipped).')
})

export type ItemOutcome = z.infer<typeof itemOutcomeSchema>

/** An actor's inventory, or the loose items of the world when no actor was asked for. */
export const inventoryViewSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional(),
  capacity: z.number().int().optional(),
  usedSlots: z.number().int().optional(),
  armorBonus: z.number().int().optional(),
  items: z.array(itemViewSchema)
})

export type InventoryView = z.infer<typeof inventoryViewSchema>

/**
 * Port to the game engine's items, implemented in the main process. Like `INpcRegistry`, it is the
 * only way the AI touches items: every rule (slots, capacity, hands, ownership) is the engine's.
 * Every id is checked to belong to `worldId`, because the ids come from the model.
 */
export interface IItemRegistry {
  createItems(worldId: string, drafts: ItemDraft[]): Promise<ItemOutcome[]>
  updateItems(worldId: string, updates: ItemUpdate[]): Promise<ItemOutcome[]>
  deleteItems(worldId: string, itemIds: string[]): Promise<ItemOutcome[]>
  transferItems(worldId: string, transfers: ItemTransfer[]): Promise<ItemOutcome[]>
  equipItems(worldId: string, changes: ItemEquip[]): Promise<ItemOutcome[]>
  /** The inventory of `actorId`, or the items nobody carries in the world when omitted. */
  getInventory(worldId: string, actorId?: string): Promise<InventoryView>
  /** Full details of the items matching the query: by id, or by (part of) the name. */
  findItems(worldId: string, query: ItemQuery): Promise<InventoryView>
}

/** Either `itemId`, or `name` optionally narrowed to what one actor carries. */
export const itemQuerySchema = z
  .object({
    itemId: z.uuid().optional().describe('Exact item, when you already know its id.'),
    name: z.string().trim().min(1).optional().describe('Part of the name; ignores case and accents.'),
    actorId: z.uuid().optional().describe('With `name`: only look in what this actor carries.')
  })
  .refine((query) => query.itemId || query.name, 'Give an itemId or a name')

export type ItemQuery = z.infer<typeof itemQuerySchema>
