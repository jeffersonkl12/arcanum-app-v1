import { ACTOR_AGES, ACTOR_GENDERS, ACTOR_HP } from '@constant'
import { cultureTable } from '@database/entity/culture.entity'
import { languageTable } from '@database/entity/language.entity'
import { partyTable } from '@database/entity/party.entity'
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
  unique,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'

export const actorAgeEnum = pgEnum('actor_age', ACTOR_AGES)
export const actorGenderEnum = pgEnum('actor_gender', ACTOR_GENDERS)

/** A character of the world: the player (`isNpc = false`) or an NPC. */
export const actorTable = pgTable(
  'actor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worldTable.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    age: actorAgeEnum('age').notNull(),
    gender: actorGenderEnum('gender').notNull(),
    cultureId: uuid('culture_id'),
    languageId: uuid('language_id'),
    profession: text('profession'),
    appearance: text('appearance'),
    personality: text('personality'),
    background: text('background'),
    // Relative to the images folder (`actor/<uuid>.png`), never absolute, and only ever written by the
    // image service: it is not part of the create/update schemas.
    imagePath: text('image_path'),
    // The database default is only a floor: `ActorService` gives a new actor the default of its role
    // (`ACTOR_HP`), and a new actor starts at full health unless it says otherwise.
    hpMax: integer('hp_max').notNull().default(ACTOR_HP.defaultNpc),
    hpCurrent: integer('hp_current').notNull().default(ACTOR_HP.defaultNpc),
    isNpc: boolean('is_npc').notNull().default(true),
    partyId: uuid('party_id')
  },
  (table) => [
    // Composite foreign keys (id + world) make it impossible to link an actor to another world's
    // culture, language or party. They are not enforced while the optional column is null.
    foreignKey({
      name: 'actor_culture_world_fk',
      columns: [table.cultureId, table.worldId],
      foreignColumns: [cultureTable.id, cultureTable.worldId]
    }),
    foreignKey({
      name: 'actor_language_world_fk',
      columns: [table.languageId, table.worldId],
      foreignColumns: [languageTable.id, languageTable.worldId]
    }),
    foreignKey({
      name: 'actor_party_world_fk',
      columns: [table.partyId, table.worldId],
      foreignColumns: [partyTable.id, partyTable.worldId]
    }),
    // Target of the composite foreign key of `item`, which keeps an item and its carrier in the same world.
    unique('actor_id_world_id_unique').on(table.id, table.worldId),
    // A world has at most one player (the only actor that is not an NPC).
    uniqueIndex('actor_world_id_player_unique')
      .on(table.worldId)
      .where(sql`${table.isNpc} = false`),
    // Health never goes below zero or above the maximum, and the maximum is at least 1.
    check(
      'actor_hp_max_range',
      sql`${table.hpMax} between ${sql.raw(String(ACTOR_HP.minMax))} and ${sql.raw(String(ACTOR_HP.max))}`
    ),
    check('actor_hp_current_range', sql`${table.hpCurrent} between 0 and ${table.hpMax}`)
  ]
)
