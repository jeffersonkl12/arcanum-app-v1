import { TEXT_LIMITS } from '@constant'
import { languageTable } from '@database/entity/language.entity'
import { createInsertSchema } from 'drizzle-orm/zod'
import type { z } from 'zod'

export const createLanguageSchema = createInsertSchema(languageTable, {
  name: (schema) => schema.trim().min(1).max(TEXT_LIMITS.name),
  description: (schema) => schema.max(TEXT_LIMITS.longText)
}).omit({ id: true })

/** The world of an existing language cannot change. */
export const updateLanguageSchema = createLanguageSchema.omit({ worldId: true }).partial()

export type Language = typeof languageTable.$inferSelect
export type CreateLanguage = z.infer<typeof createLanguageSchema>
export type UpdateLanguage = z.infer<typeof updateLanguageSchema>
