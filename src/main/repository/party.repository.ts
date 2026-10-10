import type { Database } from '@database/client.database'
import { partyTable } from '@database/entity/party.entity'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type { CreateParty, Party } from '@schema/party.schema'
import { eq } from 'drizzle-orm'

/** A party has nothing to edit (`never` patch): its members are changed through the actors. */
export interface IPartyRepository extends IRepository<Party, CreateParty, never> {
  findByWorldId(worldId: string): Promise<Party | undefined>
}

export class PartyRepository
  extends BaseRepository<Party, CreateParty, never>
  implements IPartyRepository
{
  constructor(database: Database) {
    super(database, partyTable)
  }

  async findByWorldId(worldId: string): Promise<Party | undefined> {
    const [party] = await this.database
      .select()
      .from(partyTable)
      .where(eq(partyTable.worldId, worldId))

    return party
  }
}
