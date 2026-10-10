<script setup lang="ts">
import { computed } from 'vue'
import { CampaignCard } from '@renderer/components/custom'
import { Button } from '@renderer/components/ui/button'
import { useCampaign } from '@renderer/composable/campaign.composable'
import { useWorld } from '@renderer/composable/world.composable'
import { cn } from '@renderer/lib/utils'

const { campaigns, visibleCampaigns, worldFilter } = useCampaign()
const { worlds } = useWorld()

const worldFilters = computed(() => {
  const usedIds = new Set(campaigns.value.map((campaign) => campaign.worldId))
  return worlds.value.filter((world) => usedIds.has(world.id))
})
</script>

<template>
  <section class="flex flex-col gap-6">
    <div class="flex flex-wrap gap-2">
      <Button
        type="button"
        :variant="worldFilter === 'all' ? 'secondary' : 'outline'"
        :class="
          cn(
            'h-auto rounded-full px-4 py-1.5 text-meta font-medium',
            worldFilter === 'all'
              ? 'border-transparent'
              : 'bg-transparent text-tertiary hover:text-foreground'
          )
        "
        @click="worldFilter = 'all'"
      >
        Todos
      </Button>
      <Button
        v-for="world in worldFilters"
        :key="world.id"
        type="button"
        :variant="worldFilter === world.id ? 'secondary' : 'outline'"
        :class="
          cn(
            'h-auto rounded-full px-4 py-1.5 text-meta font-medium',
            worldFilter === world.id
              ? 'border-transparent'
              : 'bg-transparent text-tertiary hover:text-foreground'
          )
        "
        @click="worldFilter = world.id"
      >
        {{ world.name }}
      </Button>
    </div>
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
    </div>
  </section>
</template>
