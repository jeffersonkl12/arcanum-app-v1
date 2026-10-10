import { computed, type ComputedRef, type Ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { LAST_CAMPAIGN_STORAGE_KEY } from '@renderer/constant/campaign.constant'
import { toCampaignSummary, toTemplateOption } from './campaign.mapper'
import type { CampaignSummary, TemplateOption } from './campaign.type'
import { useRequest } from './request.composable'
import { useCampaignStore } from '@renderer/store/campaign.store'

// Shared by every caller, and kept across restarts. Which campaign was played last is a
// preference of the UI, so it lives in the renderer; the campaigns themselves come from the engine.
const lastCampaignId = useStorage<string | null>(LAST_CAMPAIGN_STORAGE_KEY, null)

export function useCampaign(): {
  campaigns: Ref<CampaignSummary[]>
  templateOptions: Ref<TemplateOption[]>
  search: Ref<string>
  templateFilter: Ref<string>
  visibleCampaigns: ComputedRef<CampaignSummary[]>
  /** The templates that have at least one campaign, for the filter chips. */
  filterTemplates: ComputedRef<TemplateOption[]>
  /** The campaign played last, if it still exists. */
  activeCampaign: ComputedRef<CampaignSummary | undefined>
  isLoading: Ref<boolean>
  loadCampaigns: () => Promise<void>
  loadTemplateOptions: () => Promise<TemplateOption[]>
  rememberCampaign: (campaignId: string) => void
} {
  const { campaigns, templateOptions, search, templateFilter } = storeToRefs(useCampaignStore())
  const { isLoading, request } = useRequest()

  const visibleCampaigns = computed(() => {
    const term = search.value.trim().toLocaleLowerCase()
    return campaigns.value.filter((campaign) => {
      const matchesTemplate =
        templateFilter.value === 'all' || campaign.sourceWorldId === templateFilter.value
      if (!matchesTemplate) return false
      if (term.length === 0) return true
      return (
        campaign.name.toLocaleLowerCase().includes(term) ||
        campaign.genre.toLocaleLowerCase().includes(term) ||
        campaign.description.toLocaleLowerCase().includes(term)
      )
    })
  })

  const filterTemplates = computed(() => {
    const sources = new Set(campaigns.value.map((campaign) => campaign.sourceWorldId))
    return templateOptions.value.filter((template) => sources.has(template.id))
  })

  const activeCampaign = computed(() =>
    campaigns.value.find((campaign) => campaign.id === lastCampaignId.value)
  )

  async function loadCampaigns(): Promise<void> {
    const list = await request('world:list', { isTemplate: false })
    if (!list) return

    campaigns.value = list.map(toCampaignSummary)
    // A template that no longer has campaigns cannot stay selected as a filter.
    if (
      templateFilter.value !== 'all' &&
      !campaigns.value.some((campaign) => campaign.sourceWorldId === templateFilter.value)
    ) {
      templateFilter.value = 'all'
    }
  }

  async function loadTemplateOptions(): Promise<TemplateOption[]> {
    const list = await request('world:list', { isTemplate: true })
    if (list) templateOptions.value = list.map(toTemplateOption)
    return templateOptions.value
  }

  function rememberCampaign(campaignId: string): void {
    lastCampaignId.value = campaignId
  }

  return {
    campaigns,
    templateOptions,
    search,
    templateFilter,
    visibleCampaigns,
    filterTemplates,
    activeCampaign,
    isLoading,
    loadCampaigns,
    loadTemplateOptions,
    rememberCampaign
  }
}
