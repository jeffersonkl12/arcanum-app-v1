import { MEMORY_IMPORTANCE, MEMORY_SEARCH } from '@constant'
import type { MemoryWithActors } from '@schema/memory.schema'

/** A stored memory and how close its summary is to the query (cosine similarity, 1 is identical). */
export interface MemoryHit<TMemory> {
  memory: TMemory
  similarity: number
}

/**
 * Orders hits by relevance with a boost for importance, so a betrayal that is a little less on
 * topic still beats a loaf of bread that is a little more. Similarity decides first: the boost is
 * bounded by `importanceWeight`, so an off-topic memory cannot climb over a close one by weight alone.
 */
export function rankMemoryHits<TMemory extends { importance: number }>(
  hits: readonly MemoryHit<TMemory>[]
): MemoryHit<TMemory>[] {
  const span = MEMORY_IMPORTANCE.max - MEMORY_IMPORTANCE.min

  const score = ({ memory, similarity }: MemoryHit<TMemory>): number =>
    similarity +
    MEMORY_SEARCH.importanceWeight * ((memory.importance - MEMORY_IMPORTANCE.min) / span)

  return [...hits].sort((a, b) => score(b) - score(a))
}

/** The line a memory takes in the prompt: who shares it, what kind, how much it weighs, what happened. */
export function formatMemoryLine(memory: MemoryWithActors): string {
  const who = memory.actors.map((actor) => actor.name).join(', ')

  return `${who} [${memory.kind}, importance ${memory.importance}/${MEMORY_IMPORTANCE.max}]: ${memory.summary}`
}
