export const campaignStatusLabel = {
  in_progress: 'Em Andamento'
} as const

export const startCampaignSteps = [
  { step: 1, title: 'Seu Personagem' },
  { step: 2, title: 'Grupo' },
  { step: 3, title: 'Prólogo' }
] as const

/** First turn of a campaign whose player left the opening scene to the narrator. */
export const AI_PROLOGUE_REQUEST =
  'Mestre, abra a campanha: descreva a cena inicial da nossa aventura e me convide a agir.'

/** Where the renderer remembers the campaign played last (UI state, not game state). */
export const LAST_CAMPAIGN_STORAGE_KEY = 'arcanum:last-campaign-id'
