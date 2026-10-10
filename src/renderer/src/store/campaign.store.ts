import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CampaignSummary, TemplateOption } from '@renderer/composable/campaign.type'

/** The campaigns (worlds that are not templates) the engine knows, and how the list is filtered. */
export const useCampaignStore = defineStore('campaign', () => {
  const campaigns = ref<CampaignSummary[]>([])
  const templateOptions = ref<TemplateOption[]>([])
  const search = ref('')
  /** `'all'` or the id of the template the campaigns come from. */
  const templateFilter = ref('all')

  return { campaigns, templateOptions, search, templateFilter }
})
