import { z } from 'zod'
// Pure constants of the engine. Imported by relative path because this folder is also loaded by the
// Mastra CLI, which does not resolve the `@constant` alias.
import { ACTOR_AGES } from '../../main/constant/actor-age.constant'
import {
  ACTOR_ATTRIBUTES,
  ACTOR_ATTRIBUTE_LIMITS,
  type ActorAttribute
} from '../../main/constant/actor-attribute.constant'
import { ACTOR_GENDERS } from '../../main/constant/actor-gender.constant'
import { CHECK_OUTCOMES } from '../../main/constant/check-outcome.constant'
import { ROLL_MODES, type RollMode } from '../../main/constant/roll-mode.constant'
import { TEXT_LIMITS } from '../../main/constant/text-limit.constant'
import type { IItemRegistry } from './item.context'

const attributeScoreSchema = z
  .number()
  .int()
  .min(ACTOR_ATTRIBUTE_LIMITS.min)
  .max(ACTOR_ATTRIBUTE_LIMITS.max)

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
  profession: z.string().max(TEXT_LIMITS.shortText).optional(),
  appearance: z.string().max(TEXT_LIMITS.longText).optional(),
  personality: z.string().max(TEXT_LIMITS.longText).optional(),
  background: z.string().max(TEXT_LIMITS.longText).optional()
})

export type NpcDraft = z.infer<typeof npcDraftSchema>

export type CreatedNpc = NpcDraft & { id: string }

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

/** The part of the world the narrator needs in its prompt. */
export const worldBriefSchema = z.object({
  name: z.string(),
  genre: z.string(),
  description: z.string()
})

export type WorldBrief = z.infer<typeof worldBriefSchema>

/** One actor of the party, as the prompt shows it. Optional fields are `null` when unset. */
export const partyMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  isPlayer: z.boolean(),
  age: z.enum(ACTOR_AGES),
  gender: z.enum(ACTOR_GENDERS),
  hpCurrent: z.number().int(),
  hpMax: z.number().int(),
  strength: z.number().int(),
  dexterity: z.number().int(),
  intelligence: z.number().int(),
  goldPieces: z.number().int(),
  silverPieces: z.number().int(),
  bronzePieces: z.number().int(),
  profession: z.string().nullable(),
  appearance: z.string().nullable(),
  personality: z.string().nullable(),
  background: z.string().nullable(),
  /** Names only, what shapes the story: worn or wielded items, and the rest of what is carried. */
  equipped: z.array(z.string()),
  carried: z.array(z.string())
})

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
  diceChecker: z.custom<IDiceChecker>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as IDiceChecker).check === 'function',
    'diceChecker must implement IDiceChecker'
  )
})

export type GameContext = z.infer<typeof gameContextSchema>
