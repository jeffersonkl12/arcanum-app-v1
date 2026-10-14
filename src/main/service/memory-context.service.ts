import {
  CONTEXT_TTL_PINNED,
  MEMORY_IMPORTANCE,
  MEMORY_LIMITS,
  MEMORY_SEARCH,
  MEMORY_TTL_TURNS
} from '@constant'
import type { MemoryWithActors } from '@schema/memory.schema'
import type {
  ContextEntry,
  ContextSectionSpec,
  IContextWindowService
} from '@service/context-window.service'
import type { IContextSource } from '@service/live-context.service'
import type { IMemoryService } from '@service/memory.service'
import { formatMemoryLine } from '@util/memory.util'

const PINNED: ContextSectionSpec = { title: 'Defining memories', order: 0 }
const RECALLED: ContextSectionSpec = { title: 'Recalled memories', order: 1 }
const RECENT: ContextSectionSpec = { title: 'Recent memories', order: 2 }

export interface IMemoryContextService extends IContextSource {
  /** Keeps memories in the prompt after the AI looked them up, as if the search had found them. */
  keep(worldId: string, memories: readonly MemoryWithActors[]): void
}

/**
 * Brings the campaign's memories into the prompt's live context. Every turn it lists the defining
 * memories (they never leave), the latest ones, and the ones close in meaning to what the player
 * just said. The last are the only ones that depend on the embeddings, so with no key, or if the
 * search fails, the turn goes on with the rest.
 *
 * A memory counts as used when it shows up here, which is a proxy: it keeps a memory in the prompt
 * while the conversation keeps touching its subject, and lets it go when the conversation moves on.
 */
export class MemoryContextService implements IMemoryContextService {
  constructor(
    private readonly memoryService: IMemoryService,
    private readonly window: IContextWindowService
  ) {}

  async collect(worldId: string, playerMessage: string): Promise<ContextEntry[]> {
    const [pinned, recent, recalled] = await Promise.all([
      this.memoryService.listPinned(worldId, MEMORY_LIMITS.pinned),
      this.memoryService.listRecent(worldId, MEMORY_LIMITS.recent),
      this.recallFor(worldId, playerMessage)
    ])

    // A memory in several lists is shown once, under the first of them.
    const entries = new Map<string, ContextEntry>()
    for (const [memories, section] of [
      [pinned, PINNED],
      [recent, RECENT],
      [recalled, RECALLED]
    ] as const) {
      for (const memory of memories) {
        if (!entries.has(memory.id)) entries.set(memory.id, toEntry(memory, section))
      }
    }

    return [...entries.values()]
  }

  keep(worldId: string, memories: readonly MemoryWithActors[]): void {
    this.window.touch(
      worldId,
      memories.map((memory) => toEntry(memory, RECALLED))
    )
  }

  private async recallFor(worldId: string, playerMessage: string): Promise<MemoryWithActors[]> {
    if (!(await this.memoryService.isAvailable())) return []

    try {
      return await this.memoryService.search(worldId, playerMessage, {
        limit: MEMORY_LIMITS.recalled,
        minSimilarity: MEMORY_SEARCH.automaticMinSimilarity
      })
    } catch (error) {
      console.error('Could not search the memories for the turn:', error)
      return []
    }
  }
}

function toEntry(memory: MemoryWithActors, section: ContextSectionSpec): ContextEntry {
  return {
    key: `memory:${memory.id}`,
    section,
    text: formatMemoryLine(memory),
    order: memory.createdAt.getTime(),
    ttlTurns:
      memory.importance >= MEMORY_IMPORTANCE.pinned
        ? CONTEXT_TTL_PINNED
        : MEMORY_TTL_TURNS[memory.importance]
  }
}
