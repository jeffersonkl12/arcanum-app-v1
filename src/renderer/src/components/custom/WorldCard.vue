<script setup lang="ts">
import { toImageUrl } from '@shared'
import { useRouter } from 'vue-router'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@renderer/components/ui/card'
import { useCampaign } from '@renderer/composable/campaign.composable'
import { useStartCampaign } from '@renderer/composable/start-campaign.composable'

const props = defineProps<{
  id: string
  name: string
  description: string
  genre: string
  campaignCount: number
  imagePath?: string | null
}>()

const router = useRouter()
const { templateFilter } = useCampaign()
const { openWizard } = useStartCampaign()

function openWorld(): void {
  void router.push({ name: 'world-detail', params: { worldId: props.id } })
}

/** Shows the campaigns played in this world. */
function openCampaigns(): void {
  templateFilter.value = props.id
  void router.push({ name: 'campaigns' })
}
</script>

<template>
  <Card
    class="w-full cursor-pointer gap-0 overflow-hidden rounded-lg border border-border bg-card py-0 shadow-none ring-0"
    @click="openWorld"
  >
    <div class="relative h-44 bg-muted">
      <img
        v-if="imagePath"
        :src="toImageUrl(imagePath)"
        :alt="name"
        class="size-full object-cover"
      />
      <Badge
        class="absolute top-4 left-4 h-auto rounded-full border-transparent bg-black/60 px-2.5 py-1 text-badge font-semibold text-foreground"
      >
        {{ genre }}
      </Badge>
    </div>
    <CardContent class="flex flex-col gap-3 p-5">
      <CardTitle class="font-heading text-xl font-bold">{{ name }}</CardTitle>
      <CardDescription class="leading-normal">{{ description }}</CardDescription>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-meta text-tertiary"
          >{{ props.campaignCount }}
          {{ props.campaignCount === 1 ? 'Campanha' : 'Campanhas' }}</span
        >
        <Button
          v-if="campaignCount > 0"
          type="button"
          variant="secondary"
          class="h-auto rounded-lg px-3 py-1.5 text-meta font-semibold"
          @click.stop="openCampaigns"
        >
          Entrar
        </Button>
        <Button
          v-else
          type="button"
          class="h-auto rounded-lg px-3 py-1.5 text-meta font-semibold hover:bg-primary-hover"
          @click.stop="openWizard(props.id)"
        >
          Iniciar Campanha
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
