import type { CreateActor } from '@schema'

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
  appearance: string
  personality: string
  background: string
  /** Empty: the engine's default for a player. */
  hpMax?: number
  /** Empty: the engine's default score. */
  strength?: number
  dexterity?: number
  intelligence?: number
  imageData?: Uint8Array
}

export interface StartCampaignDraft {
  templateId: string
  character: StartCampaignCharacterDraft
  partyMemberIds: string[]
  prologueMode: CampaignPrologueMode
  prologue: string
}
