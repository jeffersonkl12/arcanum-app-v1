import { worldTable } from '@database/entity/world.entity'
import { sql } from 'drizzle-orm'
import { check, foreignKey, pgTable, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

/**
 * A place of the world, of any size: a city, a village, a church, a house, a room. A place may be
 * inside another one (`parentId`), as deep as the story needs (city > house > bedroom > bathroom);
 * a place with no parent is at the top of its own tree. The parent must be in the same world, and a
 * place that still has places inside cannot be deleted. Its name is unique in the world. That the tree has no cycle is checked by
 * `PointOfInterestService`, which the database cannot express.
 */
export const pointOfInterestTable = pgTable(
  'point_of_interest',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worldTable.id, { onDelete: 'cascade' }),
    // Null for a place at the top; moving a place elsewhere only changes this column.
    parentId: uuid('parent_id'),
    name: text('name').notNull(),
    // Free text ("city", "tavern", "bedroom"): what a place is has no rule attached to it.
    type: text('type').notNull(),
    description: text('description').notNull().default(''),
    // Relative to the images folder (`point-of-interest/<uuid>.png`); only ever written by the
    // image service: it is not part of the create/update schemas.
    imagePath: text('image_path')
  },
  (table) => [
    // Target of the composite foreign key below, which keeps a place and its parent in the same world.
    // Not enforced while `parent_id` is null.
    unique('point_of_interest_id_world_id_unique').on(table.id, table.worldId),
    foreignKey({
      name: 'point_of_interest_parent_world_fk',
      columns: [table.parentId, table.worldId],
      foreignColumns: [table.id, table.worldId]
    }),
    // A name is taken once per world, whatever the case ("Taverna" and "taverna" are the same place).
    // Per world, not global: a cloned world carries the same names as its source.
    uniqueIndex('point_of_interest_world_id_name_unique').on(
      table.worldId,
      sql`lower(${table.name})`
    ),
    check('point_of_interest_not_own_parent', sql`${table.parentId} <> ${table.id}`)
  ]
)
