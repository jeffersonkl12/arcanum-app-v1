import { DOCUMENT_INDEX } from '@constant'
import type { IEmbedder } from '@lib/embedder.lib'
import type { DocumentHit, IDocumentRepository } from '@repository/document.repository'
import type {
  CreateWorldDocument,
  UpdateWorldDocument,
  WorldDocument
} from '@schema/document.schema'
import { BaseService, type ICrudService } from '@service/base.service'
import { toDocumentEmbeddingText } from '@util/document.util'

export interface DocumentSearchOptions {
  limit: number
  /** Cosine similarity a document needs to be returned at all. */
  minSimilarity: number
  /** Only documents of this category. */
  category?: string
}

export interface IDocumentService extends ICrudService<
  WorldDocument,
  CreateWorldDocument,
  UpdateWorldDocument
> {
  listByWorld(worldId: string): Promise<WorldDocument[]>
  /** Whether documents can be searched by meaning now (the embeddings need a key). */
  isAvailable(): Promise<boolean>
  /**
   * The documents of the world closest in meaning to the query, most similar first. Catches up the
   * ones that have no embedding yet before it looks. Needs embeddings.
   */
  search(worldId: string, query: string, options: DocumentSearchOptions): Promise<DocumentHit[]>
  /** Embeds the documents of the world that have no embedding from the current provider. */
  indexPending(worldId: string): Promise<void>
}

/**
 * The documents of a world: what its subjects are like, in short plain-text entries the player
 * writes. The database holds them and their embeddings (pgvector, one table per embedding
 * provider), and the embedding goes with the document, so it can never outlive it.
 *
 * Writing a document never depends on the embeddings: with no key, or if the call fails, the
 * document is saved and simply has no embedding, and `indexPending` embeds it later, which also
 * covers the player switching provider. An edit drops the old embeddings (they describe a text that
 * is gone) before it makes the new one, so a failure leaves the document unindexed, not stale.
 */
export class DocumentService
  extends BaseService<WorldDocument, CreateWorldDocument, UpdateWorldDocument>
  implements IDocumentService
{
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly embedder: IEmbedder
  ) {
    super(documentRepository, 'Document')
  }

  listByWorld(worldId: string): Promise<WorldDocument[]> {
    return this.documentRepository.listByWorld(worldId)
  }

  isAvailable(): Promise<boolean> {
    return this.embedder.isAvailable()
  }

  override async create(input: CreateWorldDocument): Promise<WorldDocument> {
    const document = await super.create(input)
    await this.index(document)

    return document
  }

  override async update(id: string, patch: UpdateWorldDocument): Promise<WorldDocument> {
    const document = await super.update(id, patch)
    if (changesText(patch)) await this.index(document)

    return document
  }

  async search(
    worldId: string,
    query: string,
    { limit, minSimilarity, category }: DocumentSearchOptions
  ): Promise<DocumentHit[]> {
    await this.indexPending(worldId)

    const provider = await this.embedder.provider()
    const [vector] = await this.embedder.embed([query])
    const hits = await this.documentRepository.search(provider, {
      worldId,
      vector,
      category,
      limit
    })

    return hits.filter((hit) => hit.similarity >= minSimilarity)
  }

  async indexPending(worldId: string): Promise<void> {
    if (!(await this.embedder.isAvailable())) return

    try {
      const provider = await this.embedder.provider()
      const pending = await this.documentRepository.listUnindexed(provider, worldId)

      for (let start = 0; start < pending.length; start += DOCUMENT_INDEX.batchSize) {
        const batch = pending.slice(start, start + DOCUMENT_INDEX.batchSize)
        const vectors = await this.embedder.embed(batch.map(toDocumentEmbeddingText))

        for (const [position, document] of batch.entries()) {
          await this.documentRepository.saveEmbedding(provider, document.id, vectors[position])
        }
      }
    } catch (error) {
      // Searching goes on with what is already indexed.
      console.error('Could not index the documents of the world:', error)
    }
  }

  /** Replaces the embeddings of a document with one of its current text; never throws. */
  private async index(document: WorldDocument): Promise<void> {
    try {
      if (!(await this.embedder.isAvailable())) {
        await this.documentRepository.deleteEmbeddings(document.id)
        return
      }

      const provider = await this.embedder.provider()
      const [vector] = await this.embedder.embed([toDocumentEmbeddingText(document)])
      await this.documentRepository.replaceEmbedding(provider, document.id, vector)
    } catch (error) {
      console.error('Could not index the document:', error)
      await this.documentRepository.deleteEmbeddings(document.id).catch(() => undefined)
    }
  }
}

/** Whether the patch touches what the embedding is made from. */
function changesText({ subject, category, content }: UpdateWorldDocument): boolean {
  return subject !== undefined || category !== undefined || content !== undefined
}
