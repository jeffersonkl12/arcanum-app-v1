import { idSchema, updateInput } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { createCampaignSchema, updateCampaignSchema } from '@schema'
import type { ICampaignService } from '@service/campaign.service'

export function createCampaignRoutes(campaignService: ICampaignService): RoutesOf<'campaign'> {
  return {
    'campaign:findByWorld': route(idSchema, (worldId) => campaignService.findByWorld(worldId)),
    'campaign:get': route(idSchema, (id) => campaignService.get(id)),
    'campaign:create': route(createCampaignSchema, (input) => campaignService.create(input)),
    'campaign:update': route(updateInput(updateCampaignSchema), ({ id, patch }) =>
      campaignService.update(id, patch)
    )
  }
}
