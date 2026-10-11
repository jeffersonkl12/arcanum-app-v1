import {
  ARMOR_BONUS,
  EQUIPMENT_SLOTS,
  ITEM_MAX_SLOTS,
  WEAPON_CLASSES,
  WEAPON_DICE,
  WEAR_SLOTS
} from '@constant'
import { actorTable } from '@database/entity/actor.entity'
import { worldTable } from '@database/entity/world.entity'
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'

export const weaponClassEnum = pgEnum('weapon_class', WEAPON_CLASSES)
export const weaponDieEnum = pgEnum('weapon_die', WEAPON_DICE)
export const wearSlotEnum = pgEnum('wear_slot', WEAR_SLOTS)
export const equipmentSlotEnum = pgEnum('equipment_slot', EQUIPMENT_SLOTS)

/**
 * An item of a world. It exists in the world on its own and may be carried by an actor of that
 * world (`actorId`); an item with no carrier is simply somewhere in the world. The inventory is not
 * a table of its own: it is the items whose `actorId` is the actor, so an inventory belongs to
 * exactly one actor by construction (the capacity is `INVENTORY_CAPACITY`). The durability is the
 * same for every item (`ITEM_DURABILITY`), so it is not stored.
 */
export const itemTable = pgTable(
  'item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worldTable.id, { onDelete: 'cascade' }),
    // The carrier; null while the item is not in any inventory. `ActorService` releases the items
    // of an actor before deleting it, so they stay in the world.
    actorId: uuid('actor_id'),
    name: text('name').notNull(),
    description: text('description'),
    // Relative to the images folder (`item/<uuid>.png`); only ever written by the image service.
    imagePath: text('image_path'),
    // A tiny item takes no inventory slots; any other takes at least one.
    isTiny: boolean('is_tiny').notNull().default(false),
    slots: integer('slots').notNull().default(1),
    isConsumable: boolean('is_consumable').notNull().default(false),
    // A weapon has both its class and its damage die; a piece of clothing both its wear slot and
    // its armor bonus. An item is not both.
    weaponClass: weaponClassEnum('weapon_class'),
    damageDie: weaponDieEnum('damage_die'),
    wearSlot: wearSlotEnum('wear_slot'),
    armorBonus: integer('armor_bonus'),
    // Where the item is equipped; null while it is only carried (or not carried at all).
    equippedSlot: equipmentSlotEnum('equipped_slot')
  },
  (table) => [
    // Composite foreign key (id + world): an item can only be carried by an actor of its own world.
    // Not enforced while `actor_id` is null.
    foreignKey({
      name: 'item_actor_world_fk',
      columns: [table.actorId, table.worldId],
      foreignColumns: [actorTable.id, actorTable.worldId]
    }),
    // Only a carried item can be equipped.
    check(
      'item_equipped_needs_actor',
      sql`${table.equippedSlot} is null or ${table.actorId} is not null`
    ),
    // One equipped item per place of the body or hand.
    uniqueIndex('item_actor_id_equipped_slot_unique')
      .on(table.actorId, table.equippedSlot)
      .where(sql`${table.equippedSlot} is not null`),
    check('item_slots_range', sql`${table.slots} between 0 and ${sql.raw(String(ITEM_MAX_SLOTS))}`),
    check(
      'item_tiny_slots',
      sql`(${table.isTiny} and ${table.slots} = 0) or (not ${table.isTiny} and ${table.slots} >= 1)`
    ),
    check('item_weapon_fields', sql`(${table.weaponClass} is null) = (${table.damageDie} is null)`),
    check('item_wear_fields', sql`(${table.wearSlot} is null) = (${table.armorBonus} is null)`),
    check(
      'item_armor_bonus_range',
      sql`${table.armorBonus} is null or ${table.armorBonus} between ${sql.raw(String(ARMOR_BONUS.min))} and ${sql.raw(String(ARMOR_BONUS.max))}`
    ),
    check(
      'item_not_weapon_and_wearable',
      sql`${table.weaponClass} is null or ${table.wearSlot} is null`
    ),
    // A weapon is only equipped in a hand, a piece of clothing only in its own place.
    check(
      'item_equipped_slot_matches',
      sql`${table.equippedSlot} is null
        or (${table.equippedSlot} in ('main_hand', 'off_hand') and ${table.weaponClass} is not null)
        or (${table.wearSlot} is not null and ${table.equippedSlot}::text = ${table.wearSlot}::text)`
    )
  ]
)
