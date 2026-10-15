import { DOCUMENT_LIMITS } from '@constant'
import { documentTable } from '@database/entity/document.entity'
import { createInsertSchema } from 'drizzle-orm/zod'
import type { z } from 'zod'

export const createDocumentSchema = createInsertSchema(documentTable, {
  subject: (schema) => schema.trim().min(1).max(DOCUMENT_LIMITS.subject),
  category: (schema) => schema.trim().min(1).max(DOCUMENT_LIMITS.category),
  content: (schema) => schema.trim().min(1).max(DOCUMENT_LIMITS.content)
}).omit({ id: true })

/** The world of an existing entry cannot change. */
export const updateDocumentSchema = createDocumentSchema.omit({ worldId: true }).partial()

export type WorldDocument = typeof documentTable.$inferSelect
export type CreateWorldDocument = z.infer<typeof createDocumentSchema>
export type UpdateWorldDocument = z.infer<typeof updateDocumentSchema>
