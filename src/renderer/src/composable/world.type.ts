export interface WorldSummary {
  id: string
  name: string
  description: string
  genre: string
  campaignCount: number
}

export interface WorldDetail {
  id: string
  name: string
  description: string
  genre: string
  imagePath?: string | null
}

export interface ActorSummary {
  id: string
  name: string
  subtitle: string
  imagePath?: string | null
}

export interface NamedEntitySummary {
  id: string
  name: string
  description: string
}

export interface ActiveCampaign {
  id: string
  title: string
}

export type WorldEntityTab = 'npcs' | 'languages' | 'cultures'
