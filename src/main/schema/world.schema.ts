import { TEXT_LIMITS, WORLD_GENRES } from '@constant'
import { worldTable } from '@database/entity/world.entity'
import { createInsertSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

export const createWorldSchema = createInsertSchema(worldTable, {
  name: (schema) => schema.trim().min(1).max(TEXT_LIMITS.name),
  description: (schema) => schema.max(TEXT_LIMITS.longText)
}).omit({ id: true, imagePath: true, sourceWorldId: true })

export const updateWorldSchema = createWorldSchema.partial()

export type World = typeof worldTable.$inferSelect
export type CreateWorld = z.infer<typeof createWorldSchema>
export type UpdateWorld = z.infer<typeof updateWorldSchema>

/** Every field narrows the list; the ones left out do not filter. */
export const worldFilterSchema = z.object({
  isTemplate: z.boolean().optional(),
  /** Part of the name, ignoring case. */
  name: z.string().trim().max(TEXT_LIMITS.name).optional(),
  /** Any of these genres. */
  genres: z.array(z.enum(WORLD_GENRES)).optional(),
  /** Only the worlds cloned from this template. */
  sourceWorldId: z.uuid().optional()
})

export type WorldFilter = z.infer<typeof worldFilterSchema>
