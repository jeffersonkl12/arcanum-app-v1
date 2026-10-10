import type { Database } from '@database/client.database'
import { translateDatabaseError } from '@database/error.database'
import { eq } from 'drizzle-orm'
import type { PgColumn, PgInsertValue, PgTable } from 'drizzle-orm/pg-core'

/** Operations every entity repository offers. */
export interface IRepository<TRow, TNew, TPatch> {
  findById(id: string): Promise<TRow | undefined>
  create(input: TNew): Promise<TRow>
  /** Returns `undefined` when the row does not exist. An empty patch changes nothing. */
  update(id: string, patch: TPatch): Promise<TRow | undefined>
  /** Returns whether a row was deleted. */
  delete(id: string): Promise<boolean>
}

type EntityTable = PgTable & { id: PgColumn }

/**
 * CRUD by `id` shared by the entity repositories. Constraint violations surface as `ConflictError`.
 * Drizzle cannot type a query over a generic table, so the row types come from the schemas and the
 * casts stay inside this class.
 */
export abstract class BaseRepository<TRow, TNew, TPatch extends object> implements IRepository<
  TRow,
  TNew,
  TPatch
> {
  constructor(
    protected readonly database: Database,
    protected readonly table: EntityTable
  ) {}

  async findById(id: string): Promise<TRow | undefined> {
    const [row] = await this.database.select().from(this.table).where(eq(this.table.id, id))

    return row as TRow | undefined
  }

  async create(input: TNew): Promise<TRow> {
    try {
      const [row] = await this.database
        .insert(this.table)
        .values(input as PgInsertValue<EntityTable>)
        .returning()

      return row as TRow
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }

  async update(id: string, patch: TPatch): Promise<TRow | undefined> {
    const hasChanges = Object.values(patch).some((value) => value !== undefined)

    if (!hasChanges) {
      return this.findById(id)
    }

    try {
      const [row] = await this.database
        .update(this.table)
        .set(patch)
        .where(eq(this.table.id, id))
        .returning()

      return row as TRow | undefined
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const rows = await this.database
        .delete(this.table)
        .where(eq(this.table.id, id))
        .returning({ id: this.table.id })

      return rows.length > 0
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }
}
