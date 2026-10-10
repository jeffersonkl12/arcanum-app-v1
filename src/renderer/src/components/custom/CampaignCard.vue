<script setup lang="ts">
import { Play } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@renderer/components/ui/card'
import type { CampaignStatus } from '@renderer/composable/campaign.type'
import { campaignStatusLabel } from '@renderer/constant/campaign.constant'

const props = defineProps<{
  id: string
  worldId: string
  name: string
  genre: string
  description: string
  status: CampaignStatus
}>()

const router = useRouter()

function manageCampaign(): void {
  void router.push({ name: 'world-detail', params: { worldId: props.worldId } })
}

function continueCampaign(): void {
  void router.push({ name: 'game', params: { worldId: props.worldId } })
}
</script>

<template>
  <Card
    class="w-full gap-0 overflow-hidden rounded-xl border border-border bg-card py-0 shadow-none ring-0"
  >
    <div class="relative h-35 bg-muted">
      <Badge
        class="absolute top-4 left-4 h-auto gap-1.5 rounded-full border-transparent bg-black/70 px-2.5 py-1 text-badge font-semibold text-foreground"
      >
        <span class="size-1.5 rounded-full bg-primary" />
        {{ campaignStatusLabel[status] }}
      </Badge>
    </div>
    <CardContent class="flex flex-col gap-4 p-6">
      <div class="flex flex-col gap-1">
        <CardTitle class="font-heading text-2xl font-bold">{{ name }}</CardTitle>
        <p class="text-sm text-muted-foreground">{{ genre }}</p>
      </div>
      <CardDescription class="text-meta leading-normal">{{ description }}</CardDescription>
      <div class="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          class="h-auto gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-foreground/90"
          @click="continueCampaign"
        >
          <Play class="size-4 fill-primary-foreground" />
          Continuar
        </Button>
        <Button
          type="button"
          variant="outline"
          class="h-auto rounded-lg bg-transparent px-4 py-2 text-sm font-normal"
          @click="manageCampaign"
        >
          Gerenciar
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
