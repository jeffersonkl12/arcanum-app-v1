<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { onMounted } from 'vue'
import { useCampaign } from '@renderer/composable/campaign.composable'
import { useWorld } from '@renderer/composable/world.composable'
import { ActiveCampaignView, WorldHeaderView, WorldListView } from '@renderer/view/worlds'

const { search, genreFilter, loadWorlds } = useWorld()
const { loadCampaigns } = useCampaign()

onMounted(() => {
  void loadWorlds()
  // The campaigns give the count on each world and the campaign to continue.
  void loadCampaigns()
})

// The engine filters the list, so a new search or genre asks it again (typing waits a moment).
watchDebounced([search, genreFilter], () => void loadWorlds(), { debounce: 250 })
</script>

<template>
  <div class="flex flex-col gap-10">
    <WorldHeaderView />
    <ActiveCampaignView />
    <WorldListView />
  </div>
</template>
