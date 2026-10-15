import { z } from 'zod'
// Pure constants of the engine. Imported by relative path because this folder is also loaded by the
// Mastra CLI, which does not resolve the `@constant` alias.
import { ACTOR_AGES } from '../../main/constant/actor-age.constant'
import {
  ACTOR_ATTRIBUTES,
  ACTOR_ATTRIBUTE_LIMITS,
  type ActorAttribute
} from '../../main/constant/actor-attribute.constant'
import { ACTOR_COIN_LIMITS } from '../../main/constant/actor-coin.constant'
import { ACTOR_GENDERS } from '../../main/constant/actor-gender.constant'
import { ACTOR_HP } from '../../main/constant/actor-hp.constant'
import { ACTOR_TEXT_LIMITS } from '../../main/constant/actor-text.constant'
import { CHECK_OUTCOMES } from '../../main/constant/check-outcome.constant'
import { ROLL_MODES, type RollMode } from '../../main/constant/roll-mode.constant'
import { TEXT_LIMITS } from '../../main/constant/text-limit.constant'
import type { ICampaignRegistry } from './campaign.context'
import type { ICoinRegistry } from './coin.context'
import type { IItemRegistry } from './item.context'
import type { ITradeRegistry } from './trade.context'
import { liveContextSchema } from './live-context.context'
import type { IMemoryRegistry } from './memory.context'
import type { INpcSceneRegistry } from './npc-scene.context'
import type { IPointOfInterestRegistry } from './point-of-interest.context'
import type { IRelationshipRegistry } from './relationship.context'

const attributeScoreSchema = z
  .number()
  .int()
  .min(ACTOR_ATTRIBUTE_LIMITS.min)
  .max(ACTOR_ATTRIBUTE_LIMITS.max)

const coinAmountSchema = z.number().int().min(ACTOR_COIN_LIMITS.min).max(ACTOR_COIN_LIMITS.max)

/** What the AI proposes for an NPC. The engine validates and persists it. */
export const npcDraftSchema = z.object({
  name: z.string().trim().min(1).max(TEXT_LIMITS.name),
  age: z.enum(ACTOR_AGES),
  gender: z.enum(ACTOR_GENDERS),
  strength: attributeScoreSchema
    .optional()
    .describe(
      `The d6 the NPC rolls in a check with it. Omit for an average person (${ACTOR_ATTRIBUTE_LIMITS.default}).`
    ),
  dexterity: attributeScoreSchema.optional(),
  intelligence: attributeScoreSchema.optional(),
  hpMax: z
    .number()
    .int()
    .min(ACTOR_HP.minMax)
    .max(ACTOR_HP.max)
    .optional()
    .describe(
      `Hit points, ${ACTOR_HP.minMax} to ${ACTOR_HP.max}; the NPC starts at full health. Omit for an average person (${ACTOR_HP.defaultNpc}).`
    ),
  goldPieces: coinAmountSchema
    .optional()
    .describe(
      `Money the NPC carries, the most valuable coin. Omit for none (${ACTOR_COIN_LIMITS.default}).`
    ),
  silverPieces: coinAmountSchema.optional(),
  bronzePieces: coinAmountSchema.optional(),
  profession: z.string().max(TEXT_LIMITS.shortText).optional(),
  appearance: z.string().max(ACTOR_TEXT_LIMITS.appearance).optional(),
  personality: z.string().max(ACTOR_TEXT_LIMITS.personality).optional(),
  background: z.string().max(ACTOR_TEXT_LIMITS.background).optional()
})

export type NpcDraft = z.infer<typeof npcDraftSchema>

/**
 * An NPC as the engine registered it, with the defaults it filled in (so the AI reports the real
 * attributes, health and money, not what it left out). Text fields that were not given are left out.
 */
export const npcViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.enum(ACTOR_AGES),
  gender: z.enum(ACTOR_GENDERS),
  hpMax: z.number().int(),
  strength: z.number().int(),
  dexterity: z.number().int(),
  intelligence: z.number().int(),
  goldPieces: z.number().int(),
  silverPieces: z.number().int(),
  bronzePieces: z.number().int(),
  profession: z.string().optional(),
  appearance: z.string().optional(),
  personality: z.string().optional(),
  background: z.string().optional()
})

export type CreatedNpc = z.infer<typeof npcViewSchema>

export type CreateNpcResult = { ok: true; npc: CreatedNpc } | { ok: false; reason: string }

/**
 * Port to the game engine, implemented in the main process. `src/mastra` never touches the
 * database: the engine owns the game state and the AI only goes through this interface.
 */
export interface INpcRegistry {
  createNpc(worldId: string, draft: NpcDraft): Promise<CreateNpcResult>
}

/** What the engine rolled for a check. The AI narrates it and never changes it. */
export const checkResultSchema = z.object({
  actorId: z.string(),
  attribute: z.enum(ACTOR_ATTRIBUTES),
  mode: z.enum(ROLL_MODES),
  dice: z.array(z.number().int()),
  outcome: z.enum(CHECK_OUTCOMES),
  succeeded: z.boolean()
})

export type CheckResult = z.infer<typeof checkResultSchema>

/** Who rolls a check, with which attribute, and in which circumstances. */
export interface CheckRequest {
  actorId: string
  attribute: ActorAttribute
  mode?: RollMode
}

export type RollCheckResult = { ok: true; result: CheckResult } | { ok: false; reason: string }

/**
 * Port to the engine's dice check: the actor rolls one d6 per point of the attribute (+1 with
 * advantage, -1 with disadvantage) and a 5 or 6 on any die is a success. The actor must belong to
 * the world.
 */
export interface IDiceChecker {
  check(worldId: string, request: CheckRequest): Promise<RollCheckResult>
}

/** A place next to the current one (above or inside it): name and type only, never the description. */
export const placeLabelSchema = z.object({ name: z.string(), type: z.string() })

/** The place the party is in, as the prompt shows it. Only this one carries a description. */
export const currentPlaceSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
  /** From the top of the world down to the place itself (the last one is the place). */
  path: z.array(placeLabelSchema),
  /** Whether the place sits inside another one, so the prompt shows the route only when it matters. */
  hasParent: z.boolean(),
  /**
   * Everything inside it, at any depth, as indented outline lines (`- Name (type)`, two spaces per
   * level, followed by the NPCs standing there when there are any), cut at a limit with a last line
   * saying how many were left out. Empty when it holds nothing.
   */
  inside: z.array(z.string()),
  /**
   * The NPCs standing in this very place, whether or not they are doing anything. The party is not
   * one. A short sheet each: no background.
   */
  npcs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      age: z.enum(ACTOR_AGES),
      gender: z.enum(ACTOR_GENDERS),
      culture: z.string().nullable(),
      language: z.string().nullable(),
      profession: z.string().nullable(),
      appearance: z.string().nullable(),
      personality: z.string().nullable()
    })
  )
})

export type CurrentPlace = z.infer<typeof currentPlaceSchema>

/** The part of the world the narrator needs in its prompt. */
export const worldBriefSchema = z.object({
  name: z.string(),
  genre: z.string(),
  description: z.string(),
  /** Where the party is now; `null` while it is nowhere in particular. */
  currentPlace: currentPlaceSchema.nullable()
})

export type WorldBrief = z.infer<typeof worldBriefSchema>

/**
 * What the narrator knows beyond the scene in front of it, as the prompt shows it. Today only the
 * macro summary of the campaign (empty until something major happens); more will come.
 */
export const knowledgeSchema = z.object({ campaignSummary: z.string() })

export type Knowledge = z.infer<typeof knowledgeSchema>

/** What a party member feels about another one, as the prompt shows it. */
export const partyRelationshipSchema = z.object({
  targetId: z.string(),
  targetName: z.string(),
  /** From -100 to 100. */
  value: z.number().int(),
  /** The band of the value (`friendly`, `enemy`, ...) and what it means for the narrator. */
  level: z.string(),
  meaning: z.string()
})

/** One actor of the party, as the prompt shows it. Optional fields are `null` when unset. */
export const partyMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  isPlayer: z.boolean(),
  age: z.enum(ACTOR_AGES),
  gender: z.enum(ACTOR_GENDERS),
  /** Names of its culture and language; `null` when it has none. */
  culture: z.string().nullable(),
  language: z.string().nullable(),
  hpCurrent: z.number().int(),
  hpMax: z.number().int(),
  strength: z.number().int(),
  dexterity: z.number().int(),
  intelligence: z.number().int(),
  /** The score in words (`strong`, `sharp`, ...), so the narrator can read it as a trait. */
  strengthLevel: z.string(),
  dexterityLevel: z.string(),
  intelligenceLevel: z.string(),
  goldPieces: z.number().int(),
  silverPieces: z.number().int(),
  bronzePieces: z.number().int(),
  profession: z.string().nullable(),
  appearance: z.string().nullable(),
  personality: z.string().nullable(),
  background: z.string().nullable(),
  /** Names only, what shapes the story: worn or wielded items, and the rest of what is carried. */
  equipped: z.array(z.string()),
  carried: z.array(z.string()),
  /** What this member feels about each of the others; empty when the party has only one member. */
  relationships: z.array(partyRelationshipSchema)
})

export type PartyRelationship = z.infer<typeof partyRelationshipSchema>

export type PartyMember = z.infer<typeof partyMemberSchema>

/** The world's party; `members` is empty while the world has no party or nobody joined it. */
export const partySchema = z.object({ members: z.array(partyMemberSchema) })

export type PartySnapshot = z.infer<typeof partySchema>

const modelRefSchema = z.object({
  id: z.templateLiteral([z.string().min(1), '/', z.string().min(1)]),
  apiKey: z.string().min(1).optional()
})

/**
 * Values the main process must provide on every agent call (`RequestContext`). It is how the engine
 * is injected into agents and tools, which keeps them free of singletons.
 */
export const gameContextSchema = z.object({
  worldId: z.string().min(1),
  /**
   * The model the player chose for the narrator (a global setting): a Mastra id (`provider/model`) and the
   * key saved in the app for its provider. Without a key Mastra reads the provider's environment variable.
   */
  narratorModel: modelRefSchema,
  /**
   * The cheap model of the same provider, with the same key, for the specialists and the memory
   * summarizer, so a single key in the app is all the whole game needs.
   */
  helperModel: modelRefSchema,
  world: worldBriefSchema,
  knowledge: knowledgeSchema,
  party: partySchema,
  npcRegistry: z.custom<INpcRegistry>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as INpcRegistry).createNpc === 'function',
    'npcRegistry must implement INpcRegistry'
  ),
  itemRegistry: z.custom<IItemRegistry>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as IItemRegistry).createItems === 'function',
    'itemRegistry must implement IItemRegistry'
  ),
  coinRegistry: z.custom<ICoinRegistry>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as ICoinRegistry).transferCoins === 'function',
    'coinRegistry must implement ICoinRegistry'
  ),
  tradeRegistry: z.custom<ITradeRegistry>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as ITradeRegistry).purchaseItems === 'function',
    'tradeRegistry must implement ITradeRegistry'
  ),
  pointOfInterestRegistry: z.custom<IPointOfInterestRegistry>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as IPointOfInterestRegistry).moveParty === 'function',
    'pointOfInterestRegistry must implement IPointOfInterestRegistry'
  ),
  memoryRegistry: z.custom<IMemoryRegistry>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as IMemoryRegistry).remember === 'function',
    'memoryRegistry must implement IMemoryRegistry'
  ),
  npcSceneRegistry: z.custom<INpcSceneRegistry>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as INpcSceneRegistry).engage === 'function',
    'npcSceneRegistry must implement INpcSceneRegistry'
  ),
  campaignRegistry: z.custom<ICampaignRegistry>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as ICampaignRegistry).updateSummary === 'function',
    'campaignRegistry must implement ICampaignRegistry'
  ),
  relationshipRegistry: z.custom<IRelationshipRegistry>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as IRelationshipRegistry).adjust === 'function',
    'relationshipRegistry must implement IRelationshipRegistry'
  ),
  /** Dynamic context that lingers in the prompt for a while (memories, ...), decided by the engine each turn. */
  liveContext: liveContextSchema,
  diceChecker: z.custom<IDiceChecker>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as IDiceChecker).check === 'function',
    'diceChecker must implement IDiceChecker'
  )
})

export type GameContext = z.infer<typeof gameContextSchema>
