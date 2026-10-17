import { z } from 'zod'
// Pure constants of the engine, imported by relative path (see `game.context.ts`).
import { PARTY_LIMITS } from '../../main/constant/party.constant'

export const partyNpcIdsSchema = z.object({
  npcIds: z
    .array(z.uuid())
    .min(1)
    .max(PARTY_LIMITS.maxNpcs)
    .describe("Ids of NPCs (never the player's character).")
})

/** What happened to one NPC the AI put into or took out of the party. */
export const partyChangeOutcomeSchema = z.object({
  ok: z.boolean(),
  actorId: z.string(),
  name: z.string().optional(),
  reason: z.string().optional().describe('Why the engine refused this NPC.')
})

export type PartyChangeOutcome = z.infer<typeof partyChangeOutcomeSchema>

export const partyChangeResultSchema = z.object({
  results: z.array(partyChangeOutcomeSchema),
  /** Names of everyone in the party after the change, the player's character first. */
  members: z.array(z.string())
})

export type PartyChangeResult = z.infer<typeof partyChangeResultSchema>

/** How the AI puts NPCs in and out of the party. The engine owns who is in and how many fit. */
export interface IPartyRegistry {
  join(worldId: string, npcIds: string[]): Promise<PartyChangeResult>
  leave(worldId: string, npcIds: string[]): Promise<PartyChangeResult>
}
