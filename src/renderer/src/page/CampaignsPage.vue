<script setup lang="ts">
import { onMounted } from 'vue'
import { useCampaign } from '@renderer/composable/campaign.composable'
import { CampaignHeaderView, CampaignListView } from '@renderer/view/campaigns'

const { loadCampaigns, loadTemplateOptions } = useCampaign()

onMounted(() => {
  void loadCampaigns()
  void loadTemplateOptions()
})
</script>

<template>
  <div class="flex flex-col gap-10">
    <CampaignHeaderView />
    <CampaignListView />
  </div>
</template>
