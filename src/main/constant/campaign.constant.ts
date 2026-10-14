import { TEXT_LIMITS } from './text-limit.constant'

export const CAMPAIGN_SUMMARY_LIMITS = {
  /** Characters of the whole summary. */
  max: TEXT_LIMITS.longText,
  /** Characters of one event: one or two sentences, a milestone and not a scene. */
  event: 300,
  /** Events in one call. */
  perCall: 5
} as const
