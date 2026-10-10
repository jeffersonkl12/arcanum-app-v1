import { TEXT_LIMITS } from '@constant'
import { worldTable } from '@database/entity/world.entity'
import { createInsertSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

export const createWorldSchema = createInsertSchema(worldTable, {
  name: (schema) => schema.trim().min(1).max(TEXT_LIMITS.name),
  description: (schema) => schema.max(TEXT_LIMITS.longText)
}).omit({ id: true, imagePath: true })

export const updateWorldSchema = createWorldSchema.partial()

export type World = typeof worldTable.$inferSelect
export type CreateWorld = z.infer<typeof createWorldSchema>
export type UpdateWorld = z.infer<typeof updateWorldSchema>

export const worldFilterSchema = z.object({ isTemplate: z.boolean().optional() })

export type WorldFilter = z.infer<typeof worldFilterSchema>
