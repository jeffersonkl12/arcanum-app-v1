import { DOCUMENT_SEARCH } from '@constant'
import { ConflictError } from '@error'
import type { IDocumentContextService } from '@service/document-context.service'
import type { IDocumentService } from '@service/document.service'
import type {
  DocumentIndex,
  DocumentQuery,
  DocumentRecall,
  IDocumentRegistry
} from '../../mastra/context/document.context'

/**
 * The AI's door to the world's documents, the counterpart of the memory registry. The search is
 * `IDocumentService`'s; what it adds is what an AI caller needs:
 *
 * - **Refusals as answers.** A search that cannot work right now (no key for the embeddings)
 *   becomes a `reason` the model can act on; anything else is a bug and propagates.
 * - **Lookups stay.** What the model asks for is kept in the prompt for a few turns.
 * - **An index.** The model cannot know what the player wrote, so it can list the subjects first.
 */
export class DocumentRegistryService implements IDocumentRegistry {
  constructor(
    private readonly documentService: IDocumentService,
    private readonly documentContext: IDocumentContextService
  ) {}

  async recall(
    worldId: string,
    { query, category, limit }: DocumentQuery
  ): Promise<DocumentRecall> {
    try {
      const hits = await this.documentService.search(worldId, query, {
        limit: limit ?? DOCUMENT_SEARCH.defaultLimit,
        minSimilarity: DOCUMENT_SEARCH.minSimilarity,
        category
      })
      const documents = hits.map((hit) => hit.document)
      this.documentContext.keep(worldId, documents)

      return {
        ok: true,
        documents: documents.map(({ id, subject, category: kind, content }) => ({
          id,
          subject,
          category: kind,
          content
        }))
      }
    } catch (error) {
      if (!(error instanceof ConflictError)) throw error
      return { ok: false, reason: error.message, documents: [] }
    }
  }

  async index(worldId: string): Promise<DocumentIndex> {
    const categories = new Map<string, Set<string>>()
    for (const { subject, category } of await this.documentService.listByWorld(worldId)) {
      categories.set(subject, (categories.get(subject) ?? new Set()).add(category))
    }

    const subjects = [...categories].map(([subject, kinds]) => ({
      subject,
      categories: [...kinds]
    }))

    return {
      subjects: subjects.slice(0, DOCUMENT_SEARCH.indexMax),
      truncated: subjects.length > DOCUMENT_SEARCH.indexMax
    }
  }
}
