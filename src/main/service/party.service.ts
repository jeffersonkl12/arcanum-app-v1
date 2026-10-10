import { NotFoundError } from '@error'
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
}

/**
 * A world has at most one party, and only actors of the party's world can join it; both rules
 * surface as `ConflictError`. Deleting a party that still has members is also a `ConflictError`.
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

    return this.updateActorParty(actorId, partyId)
  }

  async removeMember(partyId: string, actorId: string): Promise<Actor> {
    const actor = await this.actorRepository.findById(actorId)

    if (actor?.partyId !== partyId) {
      throw new NotFoundError('Party member', actorId)
    }

    return this.updateActorParty(actorId, null)
  }

  private async updateActorParty(actorId: string, partyId: string | null): Promise<Actor> {
    const actor = await this.actorRepository.update(actorId, { partyId })

    if (!actor) {
      throw new NotFoundError('Actor', actorId)
    }

    return actor
  }
}
