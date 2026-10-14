import { MEMORY_IMPORTANCE, MEMORY_KINDS, MEMORY_LIMITS } from '@constant'
import { z } from 'zod'

/**
 * Something that happened which the actors involved remember. A memory belongs to all of them: when
 * two characters play poker, one record is enough for either to recall it.
 */
export const memorySchema = z.object({
  id: z.uuid(),
  worldId: z.uuid(),
  /** One short sentence with the facts, not narration. It is what gets embedded and searched. */
  summary: z.string().trim().min(1).max(MEMORY_LIMITS.summary),
  kind: z.enum(MEMORY_KINDS),
  importance: z.number().int().min(MEMORY_IMPORTANCE.min).max(MEMORY_IMPORTANCE.max),
  actorIds: z.array(z.uuid()).min(1).max(MEMORY_LIMITS.actors),
  createdAt: z.date()
})

export const createMemorySchema = memorySchema.omit({ id: true, createdAt: true })

export type Memory = z.infer<typeof memorySchema>
export type CreateMemory = z.infer<typeof createMemorySchema>

/** A memory with the names of the actors who share it; actors deleted since are left out. */
export interface MemoryWithActors extends Omit<Memory, 'actorIds'> {
  actors: { id: string; name: string }[]
}
