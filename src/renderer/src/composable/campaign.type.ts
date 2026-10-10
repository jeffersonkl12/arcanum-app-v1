export type CampaignStatus = 'in_progress'

export type CampaignPrologueMode = 'ai' | 'custom'

export type StartCampaignStep = 1 | 2 | 3

export interface CampaignSummary {
  id: string
  worldId: string
  name: string
  genre: string
  description: string
  status: CampaignStatus
  imagePath?: string | null
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
  age?: string
  gender?: string
  languageId?: string
  cultureId?: string
  appearance: string
  personality: string
  background: string
}

export interface StartCampaignDraft {
  worldId: string
  worldName: string
  character: StartCampaignCharacterDraft
  partyMemberIds: string[]
  prologueMode: CampaignPrologueMode
  prologue: string
}
