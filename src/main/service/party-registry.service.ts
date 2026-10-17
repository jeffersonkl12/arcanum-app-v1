import { ConflictError, NotFoundError } from '@error'
import type { Actor } from '@schema/actor.schema'
import type { IActorService } from '@service/actor.service'
import type { IPartyService } from '@service/party.service'
import type {
  IPartyRegistry,
  PartyChangeOutcome,
  PartyChangeResult
} from '../../mastra/context/party.context'

/**
 * The AI's door to who travels with the player. It decides nothing: the limits and the world
 * scope are the party service's. What it adds is what an AI caller needs: each NPC is tried in
 * order with its own outcome (one refusal never loses the others), ids from the model must belong
 * to the world of the turn, and a rule breach is answered as a `reason` the model can act on.
 */
export class PartyRegistryService implements IPartyRegistry {
  constructor(
    private readonly partyService: IPartyService,
    private readonly actorService: IActorService
  ) {}

  async join(worldId: string, npcIds: string[]): Promise<PartyChangeResult> {
    const actors = await this.actorService.listByWorld(worldId)
    const party =
      (await this.partyService.findByWorld(worldId)) ??
      (await this.partyService.create({ worldId }))

    const results: PartyChangeOutcome[] = []
    for (const npcId of npcIds) {
      results.push(
        await this.change(actors, npcId, async () => {
          await this.partyService.addMember(party.id, npcId)
        })
      )
    }
    return { results, members: await this.memberNames(worldId) }
  }

  async leave(worldId: string, npcIds: string[]): Promise<PartyChangeResult> {
    const actors = await this.actorService.listByWorld(worldId)
    const party = await this.partyService.findByWorld(worldId)

    const results: PartyChangeOutcome[] = []
    for (const npcId of npcIds) {
      results.push(
        await this.change(actors, npcId, async () => {
          const member = actors.find((actor) => actor.id === npcId)
          // Not in the party already: nothing to take out, and nothing wrong.
          if (!party || member?.partyId !== party.id) return
          await this.partyService.removeMember(party.id, npcId)
        })
      )
    }
    return { results, members: await this.memberNames(worldId) }
  }

  private async change(
    actors: Actor[],
    npcId: string,
    apply: () => Promise<void>
  ): Promise<PartyChangeOutcome> {
    const actor = actors.find((item) => item.id === npcId)
    if (!actor) return { ok: false, actorId: npcId, reason: 'No such character in this world' }
    if (!actor.isNpc) {
      return {
        ok: false,
        actorId: npcId,
        name: actor.name,
        reason: "The player's character is always in the party"
      }
    }

    try {
      await apply()
      return { ok: true, actorId: npcId, name: actor.name }
    } catch (error) {
      if (error instanceof ConflictError || error instanceof NotFoundError) {
        return { ok: false, actorId: npcId, name: actor.name, reason: error.message }
      }
      throw error
    }
  }

  private async memberNames(worldId: string): Promise<string[]> {
    const party = await this.partyService.findByWorld(worldId)
    if (!party) return []

    const members = await this.partyService.listMembers(party.id)
    return [...members].sort((a, b) => Number(a.isNpc) - Number(b.isNpc)).map((m) => m.name)
  }
}
