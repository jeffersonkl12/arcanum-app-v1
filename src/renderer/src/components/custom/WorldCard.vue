<script setup lang="ts">
import { ref } from 'vue'
import { EllipsisVertical, Trash2 } from '@lucide/vue'
import { toImageUrl } from '@shared'
import { useRouter } from 'vue-router'
import { Badge } from '@renderer/components/ui/badge'
import ConfirmDialog from '@renderer/components/custom/ConfirmDialog.vue'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@renderer/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { useCampaign } from '@renderer/composable/campaign.composable'
import { useStartCampaign } from '@renderer/composable/start-campaign.composable'
import { useWorld } from '@renderer/composable/world.composable'

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
const { deleteWorld, isDeletingWorld } = useWorld()
const deleteConfirmOpen = ref(false)

async function confirmDelete(): Promise<void> {
  if (await deleteWorld(props.id)) deleteConfirmOpen.value = false
}

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
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="absolute top-3 right-3 size-8 rounded-full bg-black/70 text-foreground hover:bg-black/90"
            aria-label="Opções do mundo"
            @click.stop
          >
            <EllipsisVertical class="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-auto min-w-44" @click.stop>
          <DropdownMenuItem
            variant="destructive"
            class="gap-2 whitespace-nowrap"
            @select="deleteConfirmOpen = true"
          >
            <Trash2 />
            Excluir mundo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
    <ConfirmDialog
      v-model:open="deleteConfirmOpen"
      :title="`Excluir o mundo &quot;${name}&quot;?`"
      description="O mundo e tudo que pertence a ele (NPCs, itens, idiomas e culturas) serão apagados. As campanhas já iniciadas a partir dele são mantidas. Esta ação não pode ser desfeita."
      confirm-label="Excluir"
      confirm-variant="destructive"
      :confirming="isDeletingWorld"
      @confirm="void confirmDelete()"
    />
  </Card>
</template>
