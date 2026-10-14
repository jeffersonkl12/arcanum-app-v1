import { MEMORY_LIMITS, MEMORY_SEARCH } from '@constant'
import { ConflictError } from '@error'
import type { IMemoryContextService } from '@service/memory-context.service'
import type { IMemoryService } from '@service/memory.service'
import type {
  IMemoryRegistry,
  MemoryDraft,
  MemoryOutcome,
  MemoryQuery,
  MemoryRecall
} from '../../mastra/context/memory.context'

/**
 * The AI's door to the characters' memory, the counterpart of the item registry. The rules (actors
 * of the world, no repeated event) are `IMemoryService`'s; what it adds is what an AI caller needs:
 *
 * - **Batches.** Each memory is tried in order and has its own outcome, so one refused entry never
 *   loses the others and the model can fix just that one.
 * - **Refusals as answers.** A broken rule, or a memory that cannot work right now (no key for the
 *   embeddings), becomes a `reason` the model can act on; anything else is a bug and propagates.
 * - **Lookups stay.** What the model asks for is kept in the prompt, as a memory the player's own
 *   words had found.
 */
export class MemoryRegistryService implements IMemoryRegistry {
  constructor(
    private readonly memoryService: IMemoryService,
    private readonly memoryContext: IMemoryContextService
  ) {}

  async remember(worldId: string, drafts: MemoryDraft[]): Promise<MemoryOutcome[]> {
    const outcomes: MemoryOutcome[] = []

    for (const draft of drafts) {
      try {
        const { status, memory } = await this.memoryService.remember({ ...draft, worldId })
        outcomes.push({ ok: true, status, memoryId: memory.id })
      } catch (error) {
        if (!(error instanceof ConflictError)) throw error
        outcomes.push({ ok: false, reason: error.message })
      }
    }

    return outcomes
  }

  async recall(worldId: string, { query, actorId, limit }: MemoryQuery): Promise<MemoryRecall> {
    try {
      const memories = await this.memoryService.search(worldId, query, {
        limit: limit ?? MEMORY_LIMITS.recalled,
        minSimilarity: MEMORY_SEARCH.deliberateMinSimilarity,
        actorId
      })
      this.memoryContext.keep(worldId, memories)

      return {
        ok: true,
        memories: memories.map((memory) => ({
          id: memory.id,
          summary: memory.summary,
          kind: memory.kind,
          importance: memory.importance,
          actors: memory.actors,
          whenIso: memory.createdAt.toISOString()
        }))
      }
    } catch (error) {
      if (!(error instanceof ConflictError)) throw error
      return { ok: false, reason: error.message, memories: [] }
    }
  }
}
