import { NotFoundError } from '@error'
import type { IActorRepository } from '@repository/actor.repository'
import type { IRelationshipRepository } from '@repository/relationship.repository'
import type { Relationship } from '@schema/relationship.schema'

export interface IRelationshipService {
  /** The stored values among the actors; a pair with no entry is neutral. */
  listAmong(actorIds: string[]): Promise<Relationship[]>
  /** What `fromActorId` feels about `toActorId` becomes `value`. */
  set(fromActorId: string, toActorId: string, value: number): Promise<Relationship>
  /** What `fromActorId` feels about `toActorId` moves by `delta`, stopping at -100 and 100. */
  shift(fromActorId: string, toActorId: string, delta: number): Promise<Relationship>
}

/**
 * Relationships between actors of one world, in either direction and between any two actors (player
 * and NPC, NPC and NPC). An unknown actor is a `NotFoundError`; actors of different worlds, the same
 * actor on both ends or a value out of range are a `ConflictError`.
 */
export class RelationshipService implements IRelationshipService {
  constructor(
    private readonly relationshipRepository: IRelationshipRepository,
    private readonly actorRepository: IActorRepository
  ) {}

  listAmong(actorIds: string[]): Promise<Relationship[]> {
    return this.relationshipRepository.listAmong(actorIds)
  }

  async set(fromActorId: string, toActorId: string, value: number): Promise<Relationship> {
    const worldId = await this.resolveWorld(fromActorId, toActorId)

    return this.relationshipRepository.upsert(worldId, fromActorId, toActorId, value)
  }

  async shift(fromActorId: string, toActorId: string, delta: number): Promise<Relationship> {
    const worldId = await this.resolveWorld(fromActorId, toActorId)

    return this.relationshipRepository.shift(worldId, fromActorId, toActorId, Math.round(delta))
  }

  /** The world both actors share; the database enforces it, this only finds it and names a missing actor. */
  private async resolveWorld(fromActorId: string, toActorId: string): Promise<string> {
    const [from, to] = await Promise.all([
      this.actorRepository.findById(fromActorId),
      this.actorRepository.findById(toActorId)
    ])
    if (!from) throw new NotFoundError('Actor', fromActorId)
    if (!to) throw new NotFoundError('Actor', toActorId)

    return from.worldId
  }
}
