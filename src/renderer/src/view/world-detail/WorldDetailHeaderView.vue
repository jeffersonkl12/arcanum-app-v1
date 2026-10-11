<script setup lang="ts">
import { ref } from 'vue'
import { Pencil, Trash2 } from '@lucide/vue'
import { RouterLink, useRouter } from 'vue-router'
import { ConfirmDialog, CreateWorldDialog } from '@renderer/components/custom'
import { useCampaign } from '@renderer/composable/campaign.composable'
import { Button } from '@renderer/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@renderer/components/ui/breadcrumb'
import { useWorld } from '@renderer/composable/world.composable'
import type { WorldDetail } from '@renderer/composable/world.type'

const { currentWorld } = useWorld()
const router = useRouter()
const { deleteCampaign, isDeleting } = useCampaign()
const deleteConfirmOpen = ref(false)
const open = ref(false)
const editingWorld = ref<WorldDetail | null>(null)

async function confirmDelete(): Promise<void> {
  const worldId = currentWorld.value?.id
  if (!worldId || !(await deleteCampaign(worldId))) return

  deleteConfirmOpen.value = false
  await router.push({ name: 'campaigns' })
}

function openEditWorld(): void {
  if (!currentWorld.value) return
  editingWorld.value = currentWorld.value
  open.value = true
}
</script>

<template>
  <header class="flex items-center justify-between gap-6">
    <Breadcrumb>
      <BreadcrumbList class="gap-2 text-sm sm:gap-2">
        <BreadcrumbItem>
          <BreadcrumbLink as-child>
            <RouterLink
              :to="{ name: 'worlds' }"
              class="font-normal text-tertiary hover:text-foreground"
            >
              Mundos
            </RouterLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator class="[&>svg]:size-4 [&>svg]:text-tertiary" />
        <BreadcrumbItem>
          <BreadcrumbPage class="font-semibold text-foreground">
            {{ currentWorld?.name }}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    <div class="flex items-center gap-3">
      <Button
        v-if="currentWorld && !currentWorld.isTemplate"
        type="button"
        variant="destructive"
        class="h-auto gap-2 rounded-lg px-4 py-2 text-sm font-normal"
        @click="deleteConfirmOpen = true"
      >
        <Trash2 class="size-4" />
        Excluir Campanha
      </Button>
      <Button
        type="button"
        variant="secondary"
        class="h-auto gap-2 rounded-lg px-4 py-2 text-sm font-normal"
        @click="openEditWorld"
      >
        <Pencil class="size-4" />
        Editar Mundo
      </Button>
      <CreateWorldDialog v-model:open="open" v-model:entity="editingWorld" :show-trigger="false" />
      <ConfirmDialog
        v-model:open="deleteConfirmOpen"
        :title="`Excluir a campanha &quot;${currentWorld?.name}&quot;?`"
        description="A campanha, seus personagens, NPCs e todas as mensagens da história serão apagados. Esta ação não pode ser desfeita."
        confirm-label="Excluir"
        confirm-variant="destructive"
        :confirming="isDeleting"
        @confirm="void confirmDelete()"
      />
    </div>
  </header>
</template>
