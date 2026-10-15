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

/**
 * The shape the model sees. Providers such as DeepSeek and OpenAI reject a tool schema whose root is
 * not `type: "object"`, which a discriminated union (`oneOf`) is, so the tool takes a flat object and
 * `parseCampaignSummaryChange` turns it into the strict union.
 */
export const campaignSummaryToolInputSchema = z.object({
  action: z.enum(['append', 'rewrite']),
  events: z
    .array(z.string())
    .optional()
    .describe(
      `Only with action "append": 1 to ${CAMPAIGN_SUMMARY_LIMITS.perCall} major events, each a short ` +
        `fact (who did what and what it changed), up to ${CAMPAIGN_SUMMARY_LIMITS.event} characters.`
    ),
  summary: z
    .string()
    .optional()
    .describe(
      `Only with action "rewrite": the whole summary, condensed, one event per line, oldest first ` +
        `(up to ${CAMPAIGN_SUMMARY_LIMITS.max} characters).`
    )
})

export type CampaignSummaryToolInput = z.infer<typeof campaignSummaryToolInputSchema>

export function parseCampaignSummaryChange(
  input: CampaignSummaryToolInput
): { ok: true; change: CampaignSummaryChange } | { ok: false; reason: string } {
  const parsed = campaignSummaryChangeSchema.safeParse(input)
  if (parsed.success) return { ok: true, change: parsed.data }
  return {
    ok: false,
    reason: `Invalid input: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`
  }
}

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
