import { TEXT_LIMITS } from '@constant'
import { campaignTable } from '@database/entity/campaign.entity'
import { createInsertSchema } from 'drizzle-orm/zod'
import type { z } from 'zod'

export const createCampaignSchema = createInsertSchema(campaignTable, {
  summary: (schema) => schema.max(TEXT_LIMITS.longText)
}).omit({ id: true })

/** The world is fixed once the campaign exists: only the summary changes. */
export const updateCampaignSchema = createCampaignSchema.omit({ worldId: true }).partial()

export type Campaign = typeof campaignTable.$inferSelect
export type CreateCampaign = z.infer<typeof createCampaignSchema>
export type UpdateCampaign = z.infer<typeof updateCampaignSchema>
