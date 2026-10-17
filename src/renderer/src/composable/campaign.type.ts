import type { CreateActor, NewRelative } from '@schema'

export type CampaignStatus = 'in_progress'

export type CampaignPrologueMode = 'ai' | 'custom'

export type StartCampaignStep = 1 | 2 | 3

/** A campaign is a world that is not a template; `id` is that world's id. */
export interface CampaignSummary {
  id: string
  /** The template it was cloned from, `null` if that template was deleted. */
  sourceWorldId: string | null
  name: string
  genre: string
  description: string
  status: CampaignStatus
  imagePath?: string | null
}

/** A template a campaign can be started from. */
export interface TemplateOption {
  id: string
  name: string
}

export interface CampaignNpcCandidate {
  id: string
  name: string
  subtitle: string
  imagePath?: string | null
}

export interface StartCampaignCharacterDraft {
  name: string
  profession: string
  age: CreateActor['age']
  gender: CreateActor['gender']
  languageId?: string
  cultureId?: string
  /** A place of the template; its copy in the campaign is where the character starts. */
  pointOfInterestId: string
  appearance: string
  personality: string
  background: string
  /** Empty: the engine's default for a player. */
  hpMax?: number
  /** Empty: the engine's default score. */
  strength?: number
  dexterity?: number
  intelligence?: number
  goldPieces: number
  silverPieces: number
  bronzePieces: number
  /** Items of the template; their copies in the campaign go to the character's inventory. */
  inventoryItemIds: string[]
  /** Actors of the template; their copies in the campaign are the character's relatives. */
  relatives: NewRelative[]
  imageData?: Uint8Array
}

export interface StartCampaignDraft {
  templateId: string
  character: StartCampaignCharacterDraft
  partyMemberIds: string[]
  prologueMode: CampaignPrologueMode
  prologue: string
}
