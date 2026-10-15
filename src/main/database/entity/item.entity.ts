import {
  ACTOR_COIN_LIMITS,
  CLOTHING_CLASSES,
  EQUIPMENT_SLOTS,
  INVENTORY_CAPACITY,
  ITEM_TYPES,
  TEXT_LIMITS,
  WEAPON_CLASSES
} from '@constant'
import { actorTable } from '@database/entity/actor.entity'
import { worldTable } from '@database/entity/world.entity'
import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'

export const itemTypeEnum = pgEnum('item_type', ITEM_TYPES)
export const weaponClassEnum = pgEnum('weapon_class', WEAPON_CLASSES)
export const clothingClassEnum = pgEnum('clothing_class', CLOTHING_CLASSES)
export const equipmentSlotEnum = pgEnum('equipment_slot', EQUIPMENT_SLOTS)

/**
 * An item of a world. It exists in the world on its own and may be carried by an actor of that
 * world (`actorId`); an item with no carrier is simply somewhere in the world. The inventory is not
 * a table of its own: it is the items whose `actorId` is the actor, so an inventory belongs to
 * exactly one actor by construction (the capacity is `INVENTORY_CAPACITY` slots for everything it
 * carries). The durability is the same for every item (`ITEM_DURABILITY`), so it is not stored.
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
    type: itemTypeEnum('type').notNull(),
    // Every item takes at least one inventory slot.
    slots: integer('slots').notNull().default(1),
    // What the item is worth, in the same coins an actor carries; all zero means it has no value.
    goldPieces: integer('gold_pieces').notNull().default(ACTOR_COIN_LIMITS.default),
    silverPieces: integer('silver_pieces').notNull().default(ACTOR_COIN_LIMITS.default),
    bronzePieces: integer('bronze_pieces').notNull().default(ACTOR_COIN_LIMITS.default),
    // A weapon has its class and a piece of clothing its own; no other item has either.
    weaponClass: weaponClassEnum('weapon_class'),
    clothingClass: clothingClassEnum('clothing_class'),
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
    check(
      'item_description_length',
      sql`char_length(${table.description}) <= ${sql.raw(String(TEXT_LIMITS.description))}`
    ),
    check(
      'item_slots_range',
      sql`${table.slots} between 1 and ${sql.raw(String(INVENTORY_CAPACITY))}`
    ),
    check(
      'item_value_range',
      sql`${table.goldPieces} between ${sql.raw(String(ACTOR_COIN_LIMITS.min))} and ${sql.raw(String(ACTOR_COIN_LIMITS.max))}
        and ${table.silverPieces} between ${sql.raw(String(ACTOR_COIN_LIMITS.min))} and ${sql.raw(String(ACTOR_COIN_LIMITS.max))}
        and ${table.bronzePieces} between ${sql.raw(String(ACTOR_COIN_LIMITS.min))} and ${sql.raw(String(ACTOR_COIN_LIMITS.max))}`
    ),
    check(
      'item_weapon_fields',
      sql`(${table.type} = 'weapon') = (${table.weaponClass} is not null)`
    ),
    check(
      'item_clothing_fields',
      sql`(${table.type} = 'clothing') = (${table.clothingClass} is not null)`
    ),
    // A weapon is only equipped in a hand, a piece of clothing only on the body.
    check(
      'item_equipped_slot_matches',
      sql`${table.equippedSlot} is null
        or (${table.equippedSlot} in ('main_hand', 'off_hand') and ${table.type} = 'weapon')
        or (${table.equippedSlot} = 'body' and ${table.type} = 'clothing')`
    )
  ]
)
