import { z } from 'zod'
// Pure constants of the engine. Imported by relative path because this folder is also loaded by the
// Mastra CLI, which does not resolve the `@constant` alias.
import { ACTOR_AGES } from '../../main/constant/actor-age.constant'
import { ACTOR_GENDERS } from '../../main/constant/actor-gender.constant'
import { CHECK_OUTCOMES } from '../../main/constant/check-outcome.constant'
import { ROLL_MODES, type RollMode } from '../../main/constant/roll-mode.constant'
import { TEXT_LIMITS } from '../../main/constant/text-limit.constant'

/** What the AI proposes for an NPC. The engine validates and persists it. */
export const npcDraftSchema = z.object({
  name: z.string().trim().min(1).max(TEXT_LIMITS.name),
  age: z.enum(ACTOR_AGES),
  gender: z.enum(ACTOR_GENDERS),
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
  mode: z.enum(ROLL_MODES),
  dice: z.array(z.number().int()),
  highest: z.number().int(),
  outcome: z.enum(CHECK_OUTCOMES),
  succeeded: z.boolean()
})

export type CheckResult = z.infer<typeof checkResultSchema>

/** Port to the engine's dice check (2d6 normally, 3d6 with advantage, 1d6 with disadvantage). */
export interface IDiceChecker {
  check(mode?: RollMode): CheckResult
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
  profession: z.string().nullable(),
  appearance: z.string().nullable(),
  personality: z.string().nullable(),
  background: z.string().nullable()
})

export type PartyMember = z.infer<typeof partyMemberSchema>

/** The world's party; `members` is empty while the world has no party or nobody joined it. */
export const partySchema = z.object({ members: z.array(partyMemberSchema) })

export type PartySnapshot = z.infer<typeof partySchema>

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
  narratorModel: z.object({
    id: z.templateLiteral([z.string().min(1), '/', z.string().min(1)]),
    apiKey: z.string().min(1).optional()
  }),
  world: worldBriefSchema,
  party: partySchema,
  npcRegistry: z.custom<INpcRegistry>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as INpcRegistry).createNpc === 'function',
    'npcRegistry must implement INpcRegistry'
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
