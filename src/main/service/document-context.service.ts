import { DOCUMENT_SEARCH } from '@constant'
import type { WorldDocument } from '@schema/document.schema'
import type {
  ContextEntry,
  ContextSectionSpec,
  IContextWindowService
} from '@service/context-window.service'
import type { IDocumentService } from '@service/document.service'
import type { IContextSource } from '@service/live-context.service'
import { formatDocumentLine } from '@util/document.util'

/** After the memories (0 to 2): what the world says about itself changes less than what happened. */
const DOCUMENTS: ContextSectionSpec = { title: 'World documents', order: 3 }

export interface IDocumentContextService extends IContextSource {
  /**
   * Keeps documents in the prompt after they were looked up outside the turn's own search, as if
   * the player's message had found them.
   */
  keep(worldId: string, documents: readonly WorldDocument[]): void
}

/**
 * Brings the world's documents into the prompt's live context. On every turn it embeds the player's
 * message, finds the documents close in meaning to it and lists them; a document stays while the
 * conversation keeps touching its subject and goes after a few turns of silence about it. Only the
 * message is embedded: the documents were embedded when they were saved. With no key, or if the
 * search fails, the turn goes on without documents.
 */
export class DocumentContextService implements IDocumentContextService {
  constructor(
    private readonly documentService: IDocumentService,
    private readonly window: IContextWindowService
  ) {}

  async collect(worldId: string, playerMessage: string): Promise<ContextEntry[]> {
    if (!(await this.documentService.isAvailable())) return []

    try {
      const hits = await this.documentService.search(worldId, playerMessage, {
        limit: DOCUMENT_SEARCH.automaticLimit,
        minSimilarity: DOCUMENT_SEARCH.automaticMinSimilarity
      })

      return hits.map((hit) => toEntry(hit.document))
    } catch (error) {
      console.error('Could not search the documents for the turn:', error)
      return []
    }
  }

  keep(worldId: string, documents: readonly WorldDocument[]): void {
    this.window.touch(worldId, documents.map(toEntry))
  }
}

function toEntry(document: WorldDocument): ContextEntry {
  return {
    key: `document:${document.id}`,
    section: DOCUMENTS,
    text: formatDocumentLine(document)
  }
}
