import { ConflictError, NotFoundError } from '@error'
import type { ICampaignRepository } from '@repository/campaign.repository'
import type { IWorldRepository } from '@repository/world.repository'
import type { Campaign, CreateCampaign, UpdateCampaign } from '@schema/campaign.schema'
import { BaseService, type ICrudService } from '@service/base.service'

export interface ICampaignService extends ICrudService<Campaign, CreateCampaign, UpdateCampaign> {
  findByWorld(worldId: string): Promise<Campaign | undefined>
}

/**
 * A campaign belongs to a world that exists and is not a template (`NotFoundError` /
 * `ConflictError`), and a world has at most one (`ConflictError`).
 */
export class CampaignService
  extends BaseService<Campaign, CreateCampaign, UpdateCampaign>
  implements ICampaignService
{
  constructor(
    private readonly campaignRepository: ICampaignRepository,
    private readonly worldRepository: IWorldRepository
  ) {
    super(campaignRepository, 'Campaign')
  }

  override async create(input: CreateCampaign): Promise<Campaign> {
    const world = await this.worldRepository.findById(input.worldId)

    if (!world) throw new NotFoundError('World', input.worldId)
    if (world.isTemplate) throw new ConflictError('A template world cannot have a campaign')

    return super.create(input)
  }

  findByWorld(worldId: string): Promise<Campaign | undefined> {
    return this.campaignRepository.findByWorldId(worldId)
  }
}
