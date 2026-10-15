// Pure, with relative imports only: it is plain numbers from plain data.
import type { ActorAge } from '../constant/actor-age.constant'
import { ACTOR_ATTRIBUTE_LIMITS, type ActorAttribute } from '../constant/actor-attribute.constant'
import { ACTOR_HP } from '../constant/actor-hp.constant'
import {
  DEFAULT_NPC_TIER,
  NPC_AGE_ADJUSTMENTS,
  NPC_FOCUS_SHIFT,
  NPC_TIER_STATS,
  type NpcTier
} from '../constant/npc-tier.constant'

export interface NpcTierInput {
  tier?: NpcTier
  age: ActorAge
  strongAt?: ActorAttribute[]
  weakAt?: ActorAttribute[]
}

export interface NpcStats {
  strength: number
  dexterity: number
  intelligence: number
  hpMax: number
}

const PHYSICAL: ActorAttribute[] = ['strength', 'dexterity']

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/** The scores and hit points of an NPC from its tier, age and the attributes it stands out in. */
export function resolveNpcStats(input: NpcTierInput): NpcStats {
  const base = NPC_TIER_STATS[input.tier ?? DEFAULT_NPC_TIER]
  const age = NPC_AGE_ADJUSTMENTS[input.age]

  const score = (attribute: ActorAttribute): number => {
    let value = base.attribute + age.allAttributes
    if (PHYSICAL.includes(attribute)) value += age.physical
    if (input.strongAt?.includes(attribute)) value += NPC_FOCUS_SHIFT
    if (input.weakAt?.includes(attribute)) value -= NPC_FOCUS_SHIFT

    return clamp(value, ACTOR_ATTRIBUTE_LIMITS.min, ACTOR_ATTRIBUTE_LIMITS.max)
  }

  return {
    strength: score('strength'),
    dexterity: score('dexterity'),
    intelligence: score('intelligence'),
    hpMax: clamp(base.hpMax + age.hpMax, ACTOR_HP.minMax, ACTOR_HP.max)
  }
}
