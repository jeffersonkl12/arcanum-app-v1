import type { EmbeddingProvider } from '@constant'
import type { Database } from '@database/client.database'
import { documentEmbeddingTables, documentTable } from '@database/entity/document.entity'
import { translateDatabaseError } from '@database/error.database'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type {
  CreateWorldDocument,
  UpdateWorldDocument,
  WorldDocument
} from '@schema/document.schema'
import { and, asc, cosineDistance, eq, getTableColumns, isNull, sql } from 'drizzle-orm'

export interface DocumentSearch {
  worldId: string
  vector: number[]
  limit: number
  /** Only documents of this category. */
  category?: string
}

/** A stored document and how close its text is to the query (cosine similarity, 1 is identical). */
export interface DocumentHit {
  document: WorldDocument
  similarity: number
}

export interface IDocumentRepository extends IRepository<
  WorldDocument,
  CreateWorldDocument,
  UpdateWorldDocument
> {
  /** Every document of the world, grouped by subject and then category. */
  listByWorld(worldId: string): Promise<WorldDocument[]>
  /** The documents of the world with no embedding from `provider` yet. */
  listUnindexed(provider: EmbeddingProvider, worldId: string): Promise<WorldDocument[]>
  /**
   * Makes `vector` the only embedding of the document: the ones of every provider are dropped first,
   * because they were made from a text that may have changed.
   */
  replaceEmbedding(provider: EmbeddingProvider, documentId: string, vector: number[]): Promise<void>
  /** Stores the embedding of a document that has none from `provider`, or replaces that one. */
  saveEmbedding(provider: EmbeddingProvider, documentId: string, vector: number[]): Promise<void>
  /** Drops the embeddings of the document, whichever provider made them. */
  deleteEmbeddings(documentId: string): Promise<void>
  /** The documents closest to the vector among the ones `provider` embedded, most similar first. */
  search(provider: EmbeddingProvider, query: DocumentSearch): Promise<DocumentHit[]>
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

  listUnindexed(provider: EmbeddingProvider, worldId: string): Promise<WorldDocument[]> {
    const embeddings = documentEmbeddingTables[provider]

    return this.database
      .select(getTableColumns(documentTable))
      .from(documentTable)
      .leftJoin(embeddings, eq(embeddings.documentId, documentTable.id))
      .where(and(eq(documentTable.worldId, worldId), isNull(embeddings.documentId)))
  }

  async replaceEmbedding(
    provider: EmbeddingProvider,
    documentId: string,
    vector: number[]
  ): Promise<void> {
    try {
      await this.database.transaction(async (tx) => {
        for (const table of Object.values(documentEmbeddingTables)) {
          await tx.delete(table).where(eq(table.documentId, documentId))
        }
        await tx.insert(documentEmbeddingTables[provider]).values({ documentId, embedding: vector })
      })
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }

  async saveEmbedding(
    provider: EmbeddingProvider,
    documentId: string,
    vector: number[]
  ): Promise<void> {
    const table = documentEmbeddingTables[provider]

    try {
      await this.database
        .insert(table)
        .values({ documentId, embedding: vector })
        .onConflictDoUpdate({ target: table.documentId, set: { embedding: vector } })
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }

  async deleteEmbeddings(documentId: string): Promise<void> {
    for (const table of Object.values(documentEmbeddingTables)) {
      await this.database.delete(table).where(eq(table.documentId, documentId))
    }
  }

  async search(
    provider: EmbeddingProvider,
    { worldId, vector, limit, category }: DocumentSearch
  ): Promise<DocumentHit[]> {
    const embeddings = documentEmbeddingTables[provider]
    const distance = cosineDistance(embeddings.embedding, vector)

    const rows = await this.database
      .select({
        document: getTableColumns(documentTable),
        similarity: sql<number>`1 - (${distance})`
      })
      .from(embeddings)
      .innerJoin(documentTable, eq(embeddings.documentId, documentTable.id))
      .where(
        and(
          eq(documentTable.worldId, worldId),
          category ? eq(documentTable.category, category) : undefined
        )
      )
      .orderBy(distance)
      .limit(limit)

    return rows.map(({ document, similarity }) => ({ document, similarity: Number(similarity) }))
  }
}
