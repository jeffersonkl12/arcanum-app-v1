<script setup lang="ts">
import { ref } from 'vue'
import { EllipsisVertical, Play, Trash2 } from '@lucide/vue'
import { toImageUrl } from '@shared'
import { useRouter } from 'vue-router'
import ConfirmDialog from '@renderer/components/custom/ConfirmDialog.vue'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@renderer/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { useCampaign } from '@renderer/composable/campaign.composable'
import type { CampaignStatus } from '@renderer/composable/campaign.type'
import { campaignStatusLabel } from '@renderer/constant/campaign.constant'

const props = defineProps<{
  /** The id of the campaign, which is a world. */
  id: string
  name: string
  genre: string
  description: string
  status: CampaignStatus
  imagePath?: string | null
}>()

const router = useRouter()
const { deleteCampaign, isDeleting } = useCampaign()
const deleteConfirmOpen = ref(false)

async function confirmDelete(): Promise<void> {
  if (await deleteCampaign(props.id)) deleteConfirmOpen.value = false
}

function manageCampaign(): void {
  void router.push({ name: 'world-detail', params: { worldId: props.id } })
}

function continueCampaign(): void {
  void router.push({ name: 'game', params: { worldId: props.id } })
}
</script>

<template>
  <Card
    class="w-full gap-0 overflow-hidden rounded-lg border border-border bg-card py-0 shadow-none ring-0"
  >
    <div class="relative h-44 bg-muted">
      <img
        v-if="imagePath"
        :src="toImageUrl(imagePath)"
        :alt="name"
        class="size-full object-cover"
      />
      <Badge
        class="absolute top-4 left-4 h-auto gap-1.5 rounded-full border-transparent bg-black/70 px-2.5 py-1 text-badge font-semibold text-foreground"
      >
        <span class="size-1.5 rounded-full bg-primary" />
        {{ campaignStatusLabel[status] }}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="absolute top-3 right-3 size-8 rounded-full bg-black/70 text-foreground hover:bg-black/90"
            aria-label="Opções da campanha"
          >
            <EllipsisVertical class="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-auto min-w-44">
          <DropdownMenuItem
            variant="destructive"
            class="gap-2 whitespace-nowrap"
            @select="deleteConfirmOpen = true"
          >
            <Trash2 />
            Excluir campanha
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <CardContent class="flex flex-col gap-3 p-5">
      <div class="flex flex-col gap-1">
        <CardTitle class="font-heading text-xl font-bold">{{ name }}</CardTitle>
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
    <ConfirmDialog
      v-model:open="deleteConfirmOpen"
      :title="`Excluir a campanha &quot;${name}&quot;?`"
      description="A campanha, seus personagens, NPCs e todas as mensagens da história serão apagados. Esta ação não pode ser desfeita."
      confirm-label="Excluir"
      confirm-variant="destructive"
      :confirming="isDeleting"
      @confirm="void confirmDelete()"
    />
  </Card>
</template>
