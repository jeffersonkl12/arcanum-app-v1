<script setup lang="ts">
import { CampaignCard } from '@renderer/components/custom'
import { useCampaign } from '@renderer/composable/campaign.composable'

const { visibleCampaigns } = useCampaign()
</script>

<template>
  <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
    <CampaignCard
      v-for="campaign in visibleCampaigns"
      :id="campaign.id"
      :key="campaign.id"
      :world-id="campaign.worldId"
      :name="campaign.name"
      :genre="campaign.genre"
      :description="campaign.description"
      :status="campaign.status"
    />
  </section>
</template>
