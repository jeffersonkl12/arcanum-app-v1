import { TEXT_LIMITS } from '@constant'
import { pointOfInterestTable } from '@database/entity/point-of-interest.entity'
import { createInsertSchema } from 'drizzle-orm/zod'
import type { z } from 'zod'

/**
 * What the renderer sends to create a place. `parentId` is optional: without it the place is at the
 * top. The image path is never part of it (see `setImageSchema`).
 */
export const createPointOfInterestSchema = createInsertSchema(pointOfInterestTable, {
  name: (schema) => schema.trim().min(1).max(TEXT_LIMITS.name),
  type: (schema) => schema.trim().min(1).max(TEXT_LIMITS.shortText),
  description: (schema) => schema.max(TEXT_LIMITS.description)
}).omit({ id: true, imagePath: true })

/** The world of an existing place cannot change; `parentId: null` takes it to the top. */
export const updatePointOfInterestSchema = createPointOfInterestSchema
  .omit({ worldId: true })
  .partial()

export type PointOfInterest = typeof pointOfInterestTable.$inferSelect
export type CreatePointOfInterest = z.infer<typeof createPointOfInterestSchema>
export type UpdatePointOfInterest = z.infer<typeof updatePointOfInterestSchema>
