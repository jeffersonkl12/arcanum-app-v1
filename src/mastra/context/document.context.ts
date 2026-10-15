import { z } from 'zod'
// Pure constants of the engine, imported by relative path (see `game.context.ts`).
import { DOCUMENT_LIMITS, DOCUMENT_SEARCH } from '../../main/constant/document.constant'

export const documentQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(DOCUMENT_SEARCH.query)
    .describe(
      'What to look up, as a phrase about the subject or the question (e.g. "how Casa Lobam makes money").'
    ),
  category: z
    .string()
    .trim()
    .min(1)
    .max(DOCUMENT_LIMITS.category)
    .optional()
    .describe('Only documents of this category, exactly as `list-documents` shows it.'),
  limit: z.number().int().min(1).max(DOCUMENT_SEARCH.maxLimit).optional()
})

export type DocumentQuery = z.infer<typeof documentQuerySchema>

/** A document as the AI reads it. */
export const documentViewSchema = z.object({
  id: z.string(),
  subject: z.string(),
  category: z.string(),
  content: z.string()
})

export type DocumentView = z.infer<typeof documentViewSchema>

export const documentRecallSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional(),
  documents: z.array(documentViewSchema)
})

export type DocumentRecall = z.infer<typeof documentRecallSchema>

/** What the world's documents are about: each subject with the categories written about it. */
export const documentIndexSchema = z.object({
  subjects: z.array(z.object({ subject: z.string(), categories: z.array(z.string()) })),
  /** More subjects exist than the list holds; search to reach them. */
  truncated: z.boolean()
})

export type DocumentIndex = z.infer<typeof documentIndexSchema>

/**
 * Port to the world's documents, implemented in the main process. Like the memory registry, it is
 * the only way the AI reaches them: the engine owns where they are stored and how they are found,
 * and decides which world they are read from.
 */
export interface IDocumentRegistry {
  /** The documents closest in meaning to the query, best first. */
  recall(worldId: string, query: DocumentQuery): Promise<DocumentRecall>
  /** The subjects the world has documents about, with their categories. */
  index(worldId: string): Promise<DocumentIndex>
}
