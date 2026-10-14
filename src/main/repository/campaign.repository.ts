import type { Database } from '@database/client.database'
import { campaignTable } from '@database/entity/campaign.entity'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type { Campaign, CreateCampaign, UpdateCampaign } from '@schema/campaign.schema'
import { eq } from 'drizzle-orm'

export interface ICampaignRepository extends IRepository<Campaign, CreateCampaign, UpdateCampaign> {
  findByWorldId(worldId: string): Promise<Campaign | undefined>
}

export class CampaignRepository
  extends BaseRepository<Campaign, CreateCampaign, UpdateCampaign>
  implements ICampaignRepository
{
  constructor(database: Database) {
    super(database, campaignTable)
  }

  async findByWorldId(worldId: string): Promise<Campaign | undefined> {
    const [campaign] = await this.database
      .select()
      .from(campaignTable)
      .where(eq(campaignTable.worldId, worldId))

    return campaign
  }
}
