import type { Database } from '@database/client.database'
import { documentTable } from '@database/entity/document.entity'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type {
  CreateWorldDocument,
  WorldDocument,
  UpdateWorldDocument
} from '@schema/document.schema'
import { asc, eq } from 'drizzle-orm'

export interface IDocumentRepository extends IRepository<
  WorldDocument,
  CreateWorldDocument,
  UpdateWorldDocument
> {
  /** Every entry of the world, grouped by subject and then category. */
  listByWorld(worldId: string): Promise<WorldDocument[]>
}

export class DocumentRepository
  extends BaseRepository<WorldDocument, CreateWorldDocument, UpdateWorldDocument>
  implements IDocumentRepository
{
  constructor(database: Database) {
    super(database, documentTable)
  }

  listByWorld(worldId: string): Promise<WorldDocument[]> {
    return this.database
      .select()
      .from(documentTable)
      .where(eq(documentTable.worldId, worldId))
      .orderBy(asc(documentTable.subject), asc(documentTable.category))
  }
}
