import type { Actor, World } from '@schema'
import { worldGenreLabel } from '@renderer/constant/world-genre.constant'
import type { CampaignNpcCandidate, CampaignSummary, TemplateOption } from './campaign.type'
import { toActorSummary } from './world.mapper'
import type { NamedEntitySummary } from './world.type'

export function toCampaignSummary(world: World): CampaignSummary {
  return {
    id: world.id,
    sourceWorldId: world.sourceWorldId,
    name: world.name,
    genre: worldGenreLabel(world.genre),
    description: world.description,
    // Proposed: the engine has no campaign status yet, so every campaign is in progress.
    status: 'in_progress',
    imagePath: world.imagePath
  }
}

export function toTemplateOption(world: World): TemplateOption {
  return { id: world.id, name: world.name }
}

export function toCampaignNpcCandidate(
  actor: Actor,
  cultures: NamedEntitySummary[]
): CampaignNpcCandidate {
  const { id, name, subtitle, imagePath } = toActorSummary(actor, cultures)
  return { id, name, subtitle, imagePath }
}
