import { z } from 'zod'
// Pure constants of the engine, imported by relative path (see `game.context.ts`).
import { CAMPAIGN_SUMMARY_LIMITS } from '../../main/constant/campaign.constant'

export { CAMPAIGN_SUMMARY_LIMITS }

/**
 * Changes the macro summary of the campaign, in one of two ways:
 *
 * - `append` adds new major events at the end, leaving everything already there untouched. It is the
 *   normal way, so the model never has to rewrite (and possibly lose) what is already recorded.
 * - `rewrite` replaces the whole summary. It is for when the summary is full: the model condenses it,
 *   keeping every major event, and the engine only checks the size.
 */
export const campaignSummaryChangeSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('append'),
    events: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(CAMPAIGN_SUMMARY_LIMITS.event)
          .describe('One major event as a short fact: who did what and what it changed.')
      )
      .min(1)
      .max(CAMPAIGN_SUMMARY_LIMITS.perCall)
  }),
  z.object({
    action: z.literal('rewrite'),
    summary: z
      .string()
      .trim()
      .min(1)
      .max(CAMPAIGN_SUMMARY_LIMITS.max)
      .describe('The whole summary, condensed, one event per line, oldest first.')
  })
])

export type CampaignSummaryChange = z.infer<typeof campaignSummaryChangeSchema>

export const campaignSummaryOutcomeSchema = z.object({
  ok: z.boolean(),
  /** Characters the summary has now. */
  length: z.number().int().optional(),
  /** Characters still free in it. */
  room: z.number().int().optional(),
  reason: z.string().optional().describe('Why the engine refused the change.')
})

export type CampaignSummaryOutcome = z.infer<typeof campaignSummaryOutcomeSchema>

/**
 * Port to the campaign's macro summary, implemented in the main process. The AI proposes the text;
 * the engine stores it, enforces the size and creates the campaign record if the world has none.
 */
export interface ICampaignRegistry {
  updateSummary(worldId: string, change: CampaignSummaryChange): Promise<CampaignSummaryOutcome>
}
