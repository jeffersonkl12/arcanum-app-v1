import { ConflictError } from '@error'
import type { INarratorGateway, CampaignMessage } from '@lib/narrator.lib'
import type { Actor } from '@schema/actor.schema'
import type { IActorService } from '@service/actor.service'
import type { IDiceCheckService } from '@service/dice-check.service'
import type { IPartyService } from '@service/party.service'
import type { IWorldService } from '@service/world.service'
import type {
  CreateNpcResult,
  INpcRegistry,
  NpcDraft,
  PartyMember,
  PartySnapshot
} from '../../mastra/context/game.context'

export interface IGameMasterService {
  /** Plays one turn of the world's campaign. Throws `NotFoundError` if the world does not exist. */
  takeTurn(worldId: string, playerMessage: string): Promise<string>
  /** The stored conversation of the world's campaign. Throws `NotFoundError` for a missing world. */
  listHistory(worldId: string): Promise<CampaignMessage[]>
}

/**
 * Entry point of the AI game master. The AI only proposes; this class hands it the engine through
 * `INpcRegistry`, which validates every NPC with the same rules as any other actor, and rolls its
 * checks through the dice check service.
 */
export class GameMasterService implements IGameMasterService {
  constructor(
    private readonly narrator: INarratorGateway,
    private readonly worldService: IWorldService,
    private readonly actorService: IActorService,
    private readonly partyService: IPartyService,
    private readonly diceCheckService: IDiceCheckService
  ) {}

  async takeTurn(worldId: string, playerMessage: string): Promise<string> {
    const world = await this.worldService.get(worldId)

    return this.narrator.narrate({
      worldId,
      world: { name: world.name, genre: world.genre, description: world.description },
      party: await this.loadParty(worldId),
      npcRegistry: this.createNpcRegistry(),
      diceChecker: this.diceCheckService,
      message: playerMessage
    })
  }

  async listHistory(worldId: string): Promise<CampaignMessage[]> {
    await this.worldService.get(worldId)

    return this.narrator.listMessages(worldId)
  }

  /** Read on every turn, so the prompt always shows the party as it is now. */
  private async loadParty(worldId: string): Promise<PartySnapshot> {
    const party = await this.partyService.findByWorld(worldId)
    if (!party) return { members: [] }

    return { members: (await this.partyService.listMembers(party.id)).map(toPartyMember) }
  }

  private createNpcRegistry(): INpcRegistry {
    return {
      createNpc: async (worldId: string, draft: NpcDraft): Promise<CreateNpcResult> => {
        try {
          const actor = await this.actorService.create({
            worldId,
            isNpc: true,
            name: draft.name,
            age: draft.age,
            gender: draft.gender,
            profession: draft.profession ?? null,
            appearance: draft.appearance ?? null,
            personality: draft.personality ?? null,
            background: draft.background ?? null
          })

          return { ok: true, npc: { ...draft, id: actor.id } }
        } catch (error) {
          // Only rule violations go back to the AI so it can fix the NPC; anything else is a bug.
          if (error instanceof ConflictError) return { ok: false, reason: error.message }
          throw error
        }
      }
    }
  }
}

function toPartyMember(actor: Actor): PartyMember {
  return {
    id: actor.id,
    name: actor.name,
    isPlayer: !actor.isNpc,
    age: actor.age,
    gender: actor.gender,
    profession: actor.profession,
    appearance: actor.appearance,
    personality: actor.personality,
    background: actor.background
  }
}
