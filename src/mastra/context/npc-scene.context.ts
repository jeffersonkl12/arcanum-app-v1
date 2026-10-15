import { z } from 'zod'
// Pure constants of the engine, imported by relative path (see `game.context.ts`).
import { NPC_SCENE } from '../../main/constant/npc-scene.constant'

export const npcSceneIdsSchema = z.object({
  npcIds: z
    .array(z.uuid())
    .min(1)
    .max(NPC_SCENE.maxActive)
    .describe('Ids of NPCs (not of the party and not of the player).')
})

/** What happened to one NPC the AI engaged. */
export const npcEngageOutcomeSchema = z.object({
  ok: z.boolean(),
  actorId: z.string(),
  name: z.string().optional(),
  /** Everything about the NPC as it is now, the background included. Also shown in the prompt from the next turn on. */
  sheet: z.string().optional(),
  reason: z.string().optional().describe('Why the engine refused this NPC.')
})

export type NpcEngageOutcome = z.infer<typeof npcEngageOutcomeSchema>

export const npcEngageResultSchema = z.object({
  results: z.array(npcEngageOutcomeSchema),
  /** NPCs that left the scene to make room, the one engaged for longest first. */
  releasedForRoom: z.array(z.string())
})

export type NpcEngageResult = z.infer<typeof npcEngageResultSchema>

export const npcReleaseResultSchema = z.object({
  released: z.array(z.string()).describe('Names of the NPCs that are no longer engaged.'),
  stillEngaged: z.array(z.string()).describe('Names of the NPCs that remain engaged.')
})

export type NpcReleaseResult = z.infer<typeof npcReleaseResultSchema>

/** How the AI puts NPCs in and out of the scene. The engine owns who is engaged and for how long. */
export interface INpcSceneRegistry {
  engage(worldId: string, npcIds: string[]): Promise<NpcEngageResult>
  release(worldId: string, npcIds: string[]): Promise<NpcReleaseResult>
}
