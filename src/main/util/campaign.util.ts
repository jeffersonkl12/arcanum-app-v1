import { CAMPAIGN_SUMMARY_LIMITS } from '@constant'

/** The summary with one event per line, oldest first, each line a bullet. */
export function appendCampaignEvents(summary: string, events: readonly string[]): string {
  const lines = events.map((event) => `- ${event.trim()}`)

  return [summary.trim(), ...lines].filter((part) => part.length > 0).join('\n')
}

/** Characters still free in the summary. */
export function campaignSummaryRoom(summary: string): number {
  return Math.max(0, CAMPAIGN_SUMMARY_LIMITS.max - summary.length)
}
