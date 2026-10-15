import { TEXT_LIMITS } from '@constant'
import { cultureTable } from '@database/entity/culture.entity'
import { createInsertSchema } from 'drizzle-orm/zod'
import type { z } from 'zod'

export const createCultureSchema = createInsertSchema(cultureTable, {
  name: (schema) => schema.trim().min(1).max(TEXT_LIMITS.name)
}).omit({ id: true })

/** The world of an existing culture cannot change. */
export const updateCultureSchema = createCultureSchema.omit({ worldId: true }).partial()

export type Culture = typeof cultureTable.$inferSelect
export type CreateCulture = z.infer<typeof createCultureSchema>
export type UpdateCulture = z.infer<typeof updateCultureSchema>
