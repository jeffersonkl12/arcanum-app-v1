import { RELATIONSHIP_LIMITS } from '@constant'
import type { Database } from '@database/client.database'
import { relationshipTable } from '@database/entity/relationship.entity'
import { translateDatabaseError } from '@database/error.database'
import type { Relationship } from '@schema/relationship.schema'
import { and, inArray, sql, type SQL } from 'drizzle-orm'

export interface IRelationshipRepository {
  /** The stored values among `actorIds` (both ends inside the list); pairs with no row are absent. */
  listAmong(actorIds: string[]): Promise<Relationship[]>
  /** Stores the value, replacing the previous one. Both actors must belong to `worldId`. */
  upsert(
    worldId: string,
    fromActorId: string,
    toActorId: string,
    value: number
  ): Promise<Relationship>
  /**
   * Adds `delta` to the stored value (neutral when there is none) inside the database itself, so two
   * shifts at once do not overwrite each other, and keeps the result inside the limits.
   */
  shift(
    worldId: string,
    fromActorId: string,
    toActorId: string,
    delta: number
  ): Promise<Relationship>
}

export class RelationshipRepository implements IRelationshipRepository {
  constructor(private readonly database: Database) {}

  listAmong(actorIds: string[]): Promise<Relationship[]> {
    // Drizzle rejects an empty `inArray`.
    if (actorIds.length === 0) return Promise.resolve([])

    return this.database
      .select()
      .from(relationshipTable)
      .where(
        and(
          inArray(relationshipTable.fromActorId, actorIds),
          inArray(relationshipTable.toActorId, actorIds)
        )
      )
  }

  async upsert(
    worldId: string,
    fromActorId: string,
    toActorId: string,
    value: number
  ): Promise<Relationship> {
    try {
      const [row] = await this.database
        .insert(relationshipTable)
        .values({ worldId, fromActorId, toActorId, value })
        .onConflictDoUpdate({
          target: [relationshipTable.fromActorId, relationshipTable.toActorId],
          set: { value }
        })
        .returning()

      return row
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }

  async shift(
    worldId: string,
    fromActorId: string,
    toActorId: string,
    delta: number
  ): Promise<Relationship> {
    const { min, max, default: neutral } = RELATIONSHIP_LIMITS
    const clamp = (value: SQL): SQL => sql`least(${max}::int, greatest(${min}::int, ${value}))`

    try {
      const [row] = await this.database
        .insert(relationshipTable)
        .values({ worldId, fromActorId, toActorId, value: clamp(sql`${neutral + delta}::int`) })
        .onConflictDoUpdate({
          target: [relationshipTable.fromActorId, relationshipTable.toActorId],
          set: { value: clamp(sql`${relationshipTable.value} + ${delta}`) }
        })
        .returning()

      return row
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }
}
