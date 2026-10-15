import { ACTOR_HP } from './actor-hp.constant'

/**
 * How capable an NPC is, in words. The narrator picks the tier and the engine turns it into
 * attribute scores and hit points, so the numbers never depend on the narrator's mood.
 */
export const NPC_TIERS = ['frail', 'ordinary', 'trained', 'veteran', 'legendary'] as const

export type NpcTier = (typeof NPC_TIERS)[number]

export const DEFAULT_NPC_TIER: NpcTier = 'ordinary'

/**
 * Base score of every attribute and maximum hit points of each tier, before age and focus. Scores
 * stop at 5 on purpose: the 6 of a legend comes from the attribute it stands out in (`strongAt`).
 */
export const NPC_TIER_STATS: Record<NpcTier, { attribute: number; hpMax: number }> = {
  frail: { attribute: 3, hpMax: 4 },
  ordinary: { attribute: 4, hpMax: ACTOR_HP.defaultNpc },
  trained: { attribute: 4, hpMax: 9 },
  veteran: { attribute: 5, hpMax: 10 },
  legendary: { attribute: 5, hpMax: ACTOR_HP.max }
}

/** What each tier means, for the tool description. */
export const NPC_TIER_MEANINGS: Record<NpcTier, string> = {
  frail: 'sickly, untrained or very young: a beggar, a scribe, a child',
  ordinary: 'an average person: a shopkeeper, a farmer, a villager',
  trained: 'well practised in a craft or in fighting: a town guard, a smith, a hunter',
  veteran: 'seasoned and dangerous: a captain, a mercenary leader, a master of their art',
  legendary: 'among the best in the land: a champion, an archmage, a famed assassin'
}

/** Score each age adds to an attribute (physical ones only) and to the hit points. */
export const NPC_AGE_ADJUSTMENTS: Record<
  string,
  { physical: number; allAttributes: number; hpMax: number }
> = {
  baby: { physical: 0, allAttributes: -1, hpMax: -3 },
  child: { physical: 0, allAttributes: -1, hpMax: -3 },
  adolescent: { physical: 0, allAttributes: 0, hpMax: -1 },
  young_adult: { physical: 0, allAttributes: 0, hpMax: 0 },
  middle_aged: { physical: 0, allAttributes: 0, hpMax: 0 },
  old: { physical: -1, allAttributes: 0, hpMax: -1 },
  elder: { physical: -1, allAttributes: 0, hpMax: -2 }
}

/** Shift of an attribute the narrator marked as a strength or a weakness of the NPC. */
export const NPC_FOCUS_SHIFT = 1
