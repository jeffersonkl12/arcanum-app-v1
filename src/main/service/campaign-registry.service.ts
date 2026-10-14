import { CAMPAIGN_SUMMARY_LIMITS } from '@constant'
import { ConflictError, NotFoundError } from '@error'
import type { Campaign } from '@schema/campaign.schema'
import type { ICampaignService } from '@service/campaign.service'
import { appendCampaignEvents, campaignSummaryRoom } from '@util/campaign.util'
import type {
  CampaignSummaryChange,
  CampaignSummaryOutcome,
  ICampaignRegistry
} from '../../mastra/context/campaign.context'

/**
 * The AI's door to the campaign summary. It creates the campaign of the world on first use, and
 * answers a refusal (summary full, template world) as a `reason` the model can act on; anything
 * else is a bug and propagates.
 */
export class CampaignRegistryService implements ICampaignRegistry {
  constructor(private readonly campaignService: ICampaignService) {}

  async updateSummary(
    worldId: string,
    change: CampaignSummaryChange
  ): Promise<CampaignSummaryOutcome> {
    try {
      const campaign = await this.findOrCreate(worldId)
      const summary = this.nextSummary(campaign.summary, change)
      if (typeof summary !== 'string') return summary

      const saved = await this.campaignService.update(campaign.id, { summary })

      return { ok: true, length: saved.summary.length, room: campaignSummaryRoom(saved.summary) }
    } catch (error) {
      if (error instanceof ConflictError || error instanceof NotFoundError) {
        return { ok: false, reason: error.message }
      }
      throw error
    }
  }

  private async findOrCreate(worldId: string): Promise<Campaign> {
    return (
      (await this.campaignService.findByWorld(worldId)) ??
      (await this.campaignService.create({ worldId, summary: '' }))
    )
  }

  /** The text to store, or the refusal when an append does not fit. */
  private nextSummary(
    current: string,
    change: CampaignSummaryChange
  ): string | CampaignSummaryOutcome {
    if (change.action === 'rewrite') return change.summary

    const next = appendCampaignEvents(current, change.events)
    if (next.length <= CAMPAIGN_SUMMARY_LIMITS.max) return next

    return {
      ok: false,
      length: current.length,
      room: campaignSummaryRoom(current),
      reason:
        `The summary is full: it has ${current.length} of ${CAMPAIGN_SUMMARY_LIMITS.max} characters ` +
        "and these events do not fit. Call again with action 'rewrite': the whole summary condensed, " +
        'keeping every major event, plus the new ones.'
    }
  }
}
