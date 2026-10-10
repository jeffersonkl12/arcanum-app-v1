import type { Database } from '@database/client.database'
import { eq, isNotNull } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'

/** Any entity table that has an `image_path` column. */
export type ImageOwnerTable = PgTable & { id: PgColumn; imagePath: PgColumn }

export interface IImageRepository {
  /** The image path of an entity: `null` when it has none, `undefined` when the entity does not exist. */
  findImagePath(id: string): Promise<string | null | undefined>
  /** Returns whether the entity exists. */
  setImagePath(id: string, imagePath: string | null): Promise<boolean>
  /** Every image path in use by the entity. */
  listImagePaths(): Promise<string[]>
}

/**
 * The `image_path` column of one entity table. The column is kept out of the entity's own
 * create/update schemas on purpose, so the renderer can never point an entity at an arbitrary path;
 * only the image service writes it, through here.
 */
export class ImageRepository implements IImageRepository {
  constructor(
    private readonly database: Database,
    private readonly table: ImageOwnerTable
  ) {}

  async findImagePath(id: string): Promise<string | null | undefined> {
    const [row] = await this.database
      .select({ imagePath: this.table.imagePath })
      .from(this.table)
      .where(eq(this.table.id, id))

    return row?.imagePath as string | null | undefined
  }

  async setImagePath(id: string, imagePath: string | null): Promise<boolean> {
    const rows = await this.database
      .update(this.table)
      .set({ imagePath })
      .where(eq(this.table.id, id))
      .returning({ id: this.table.id })

    return rows.length > 0
  }

  async listImagePaths(): Promise<string[]> {
    const rows = await this.database
      .select({ imagePath: this.table.imagePath })
      .from(this.table)
      .where(isNotNull(this.table.imagePath))

    return rows.map((row) => row.imagePath as string)
  }
}
