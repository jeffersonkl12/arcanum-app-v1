import { z } from 'zod'
// Pure constants of the engine, imported by relative path (see `game.context.ts`).
import { MEMORY_IMPORTANCE, MEMORY_KINDS, MEMORY_LIMITS } from '../../main/constant/memory.constant'

/** What the AI proposes to remember. The engine checks the actors and stores it. */
export const memoryDraftSchema = z.object({
  summary: z
    .string()
    .trim()
    .min(1)
    .max(MEMORY_LIMITS.summary)
    .describe(
      'The facts in one short sentence, not narration: who did or said what, to whom. ' +
        'Write it in the language of the story. Keep names and the detail that will be asked about later.'
    ),
  kind: z.enum(MEMORY_KINDS),
  importance: z
    .number()
    .int()
    .min(MEMORY_IMPORTANCE.min)
    .max(MEMORY_IMPORTANCE.max)
    .describe(
      `How much it weighs for those who remember it. 1: trivial (bought bread). 2: minor small talk or routine. ` +
        `3: notable (a shared meal, a useful tip). 4: major (a favor, a promise, a quarrel). ` +
        `${MEMORY_IMPORTANCE.max}: defining (a betrayal, a deep secret, a death) and never forgotten. ` +
        `Use ${MEMORY_IMPORTANCE.max} rarely.`
    ),
  actorIds: z
    .array(z.uuid())
    .min(1)
    .max(MEMORY_LIMITS.actors)
    .describe(
      'Ids of every actor who took part or witnessed it and will remember it, the player ' +
        'character included. A shared event is ONE memory with all of them.'
    )
})

export type MemoryDraft = z.infer<typeof memoryDraftSchema>

/** What happened to one memory of a batch. */
export const memoryOutcomeSchema = z.object({
  ok: z.boolean(),
  status: z
    .enum(['saved', 'duplicate'])
    .optional()
    .describe('`duplicate`: the same event was already remembered, nothing was added.'),
  memoryId: z.string().optional(),
  reason: z.string().optional().describe('Why the engine refused this entry.')
})

export type MemoryOutcome = z.infer<typeof memoryOutcomeSchema>

export const memoryQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(MEMORY_LIMITS.query)
    .describe('What to remember, as a phrase about the topic, person or event.'),
  actorId: z
    .uuid()
    .optional()
    .describe('Only memories this actor shares, to know what that character remembers.'),
  limit: z.number().int().min(1).max(MEMORY_LIMITS.recallMax).optional()
})

export type MemoryQuery = z.infer<typeof memoryQuerySchema>

/** A memory as the AI reads it. */
export const memoryViewSchema = z.object({
  id: z.string(),
  summary: z.string(),
  kind: z.enum(MEMORY_KINDS),
  importance: z.number().int(),
  actors: z.array(z.object({ id: z.string(), name: z.string() })),
  whenIso: z.string().describe('When it was recorded (real time), to tell older from newer.')
})

export type MemoryView = z.infer<typeof memoryViewSchema>

export const memoryRecallSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional(),
  memories: z.array(memoryViewSchema)
})

export type MemoryRecall = z.infer<typeof memoryRecallSchema>

/**
 * Port to the engine's character memory, implemented in the main process. Like the item registry,
 * it is the only way the AI touches memories: the engine checks that every actor belongs to the
 * world (the ids come from the model) and owns where and how they are stored.
 */
export interface IMemoryRegistry {
  /** Stores each memory in order; one refused entry never loses the others. */
  remember(worldId: string, drafts: MemoryDraft[]): Promise<MemoryOutcome[]>
  /** The memories closest in meaning to the query, best first. */
  recall(worldId: string, query: MemoryQuery): Promise<MemoryRecall>
}
