import { PARTY_LIMITS } from '@constant'
import { ConflictError, NotFoundError } from '@error'
import type { IActorRepository } from '@repository/actor.repository'
import type { IPartyRepository } from '@repository/party.repository'
import type { Actor } from '@schema/actor.schema'
import type { CreateParty, Party } from '@schema/party.schema'
import { BaseService, type ICrudService } from '@service/base.service'

export interface IPartyService extends ICrudService<Party, CreateParty, never> {
  findByWorld(worldId: string): Promise<Party | undefined>
  listMembers(partyId: string): Promise<Actor[]>
  addMember(partyId: string, actorId: string): Promise<Actor>
  removeMember(partyId: string, actorId: string): Promise<Actor>
  /** Takes every member to the place (`null`: nowhere in particular) at once and returns them. */
  move(partyId: string, pointOfInterestId: string | null): Promise<Actor[]>
}

/**
 * A world has at most one party, and only actors of the party's world can join it; both rules
 * surface as `ConflictError`, and so does moving the party to a place of another world. Deleting a party that still has members is also a `ConflictError`.
 * A party holds at most `PARTY_LIMITS.maxMembers` actors, the player included, and at most
 * `PARTY_LIMITS.maxNpcs` of them NPCs; a member over either limit is a `ConflictError` too.
 */
export class PartyService extends BaseService<Party, CreateParty, never> implements IPartyService {
  constructor(
    private readonly partyRepository: IPartyRepository,
    private readonly actorRepository: IActorRepository
  ) {
    super(partyRepository, 'Party')
  }

  findByWorld(worldId: string): Promise<Party | undefined> {
    return this.partyRepository.findByWorldId(worldId)
  }

  async listMembers(partyId: string): Promise<Actor[]> {
    await this.get(partyId)

    return this.actorRepository.listByParty(partyId)
  }

  async addMember(partyId: string, actorId: string): Promise<Actor> {
    await this.get(partyId)
    await this.assertRoomFor(partyId, actorId)

    return this.updateActorParty(actorId, partyId)
  }

  async removeMember(partyId: string, actorId: string): Promise<Actor> {
    const actor = await this.actorRepository.findById(actorId)

    if (actor?.partyId !== partyId) {
      throw new NotFoundError('Party member', actorId)
    }

    return this.updateActorParty(actorId, null)
  }

  async move(partyId: string, pointOfInterestId: string | null): Promise<Actor[]> {
    await this.get(partyId)

    return this.actorRepository.moveByParty(partyId, pointOfInterestId)
  }

  /** Whoever is already in the party is not counted again: adding them is a no-op, not a new seat. */
  private async assertRoomFor(partyId: string, actorId: string): Promise<void> {
    const [actor, members] = await Promise.all([
      this.actorRepository.findById(actorId),
      this.actorRepository.listByParty(partyId)
    ])
    if (!actor || members.some((member) => member.id === actorId)) return

    if (members.length >= PARTY_LIMITS.maxMembers) {
      throw new ConflictError(
        `The party is full: it holds at most ${PARTY_LIMITS.maxMembers} members, the player included`
      )
    }
    if (actor.isNpc && members.filter((member) => member.isNpc).length >= PARTY_LIMITS.maxNpcs) {
      throw new ConflictError(
        `The party already has ${PARTY_LIMITS.maxNpcs} NPCs, the most it can hold`
      )
    }
  }

  private async updateActorParty(actorId: string, partyId: string | null): Promise<Actor> {
    const actor = await this.actorRepository.update(actorId, { partyId })

    if (!actor) {
      throw new NotFoundError('Actor', actorId)
    }

    return actor
  }
}
