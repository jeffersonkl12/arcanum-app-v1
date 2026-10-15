import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CampaignNpcCandidate } from '@renderer/composable/campaign.type'
import type { NamedEntitySummary, PlaceSummary } from '@renderer/composable/world.type'

/** What the "new campaign" wizard offers from the chosen template, and what the player picked. */
export const useCampaignWizardStore = defineStore('campaign-wizard', () => {
  const isOpen = ref(false)
  /** Template the wizard should start on, when it was opened from that template's card. */
  const preferredTemplateId = ref<string>()
  const templateId = ref<string>()
  const languages = ref<NamedEntitySummary[]>([])
  const cultures = ref<NamedEntitySummary[]>([])
  const places = ref<PlaceSummary[]>([])
  const npcs = ref<CampaignNpcCandidate[]>([])
  const npcSearch = ref('')
  const partyMemberIds = ref<string[]>([])
  const isLoadingOptions = ref(false)

  return {
    isOpen,
    preferredTemplateId,
    templateId,
    languages,
    cultures,
    places,
    npcs,
    npcSearch,
    partyMemberIds,
    isLoadingOptions
  }
})
