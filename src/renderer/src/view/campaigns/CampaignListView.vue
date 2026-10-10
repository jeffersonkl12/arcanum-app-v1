<script setup lang="ts">
import { CampaignCard } from '@renderer/components/custom'
import { Button } from '@renderer/components/ui/button'
import { useCampaign } from '@renderer/composable/campaign.composable'
import { cn } from '@renderer/lib/utils'

const { visibleCampaigns, filterTemplates, templateFilter } = useCampaign()
</script>

<template>
  <section class="flex flex-col gap-6">
    <div class="flex flex-wrap gap-2">
      <Button
        type="button"
        :variant="templateFilter === 'all' ? 'secondary' : 'outline'"
        :class="
          cn(
            'h-auto rounded-full px-4 py-1.5 text-meta font-medium',
            templateFilter === 'all'
              ? 'border-transparent'
              : 'bg-transparent text-tertiary hover:text-foreground'
          )
        "
        @click="templateFilter = 'all'"
      >
        Todos
      </Button>
      <Button
        v-for="template in filterTemplates"
        :key="template.id"
        type="button"
        :variant="templateFilter === template.id ? 'secondary' : 'outline'"
        :class="
          cn(
            'h-auto rounded-full px-4 py-1.5 text-meta font-medium',
            templateFilter === template.id
              ? 'border-transparent'
              : 'bg-transparent text-tertiary hover:text-foreground'
          )
        "
        @click="templateFilter = template.id"
      >
        {{ template.name }}
      </Button>
    </div>
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <CampaignCard
        v-for="campaign in visibleCampaigns"
        :id="campaign.id"
        :key="campaign.id"
        :name="campaign.name"
        :genre="campaign.genre"
        :description="campaign.description"
        :status="campaign.status"
        :image-path="campaign.imagePath"
      />
    </div>
    <p v-if="visibleCampaigns.length === 0" class="text-sm text-tertiary">
      Nenhuma campanha encontrada.
    </p>
  </section>
</template>
