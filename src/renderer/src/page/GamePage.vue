<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CharacterSheetDialog from '@renderer/components/custom/CharacterSheetDialog.vue'
import ConfirmDialog from '@renderer/components/custom/ConfirmDialog.vue'
import CreateNpcDialog from '@renderer/components/custom/CreateNpcDialog.vue'
import { useGame } from '@renderer/composable/game.composable'
import { GameChatView, GameHeaderView, GamePartyView } from '@renderer/view/game'

const route = useRoute()
const {
  loadGame,
  playPendingOpening,
  isNotFound,
  isLoading,
  session,
  sheetOpen,
  selectedSheet,
  editOpen,
  editingActor,
  isDeletingSheet,
  deleteSelectedCharacter,
  requestEditCharacter,
  applyCharacterSaved
} = useGame()

const deleteConfirmOpen = ref(false)

const deleteDescription = computed(() => {
  const name = selectedSheet.value?.name
  if (!name) return 'Esta ação não pode ser desfeita.'
  return `Tem certeza que deseja apagar ${name}? Esta ação não pode ser desfeita.`
})

watch(
  () => route.params.worldId,
  async (worldId) => {
    if (typeof worldId !== 'string') return
    await loadGame(worldId)
    // A campaign that was just created starts with its prologue.
    await playPendingOpening()
  },
  { immediate: true }
)

function requestDeleteCharacter(): void {
  if (!selectedSheet.value || isDeletingSheet.value) return
  deleteConfirmOpen.value = true
}

async function confirmDeleteCharacter(): Promise<void> {
  await deleteSelectedCharacter()
  deleteConfirmOpen.value = false
}
</script>

<template>
  <p v-if="isNotFound" class="p-12 text-sm text-muted-foreground">Campanha não encontrada.</p>
  <p v-else-if="!session && isLoading" class="p-12 text-sm text-muted-foreground">
    Carregando campanha...
  </p>
  <div v-else-if="session" class="flex h-full min-h-0 w-full">
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <GameHeaderView />
      <GameChatView />
    </div>
    <GamePartyView />
    <CharacterSheetDialog
      v-model:open="sheetOpen"
      :sheet="selectedSheet"
      :deleting="isDeletingSheet"
      @delete="requestDeleteCharacter"
      @edit="void requestEditCharacter()"
    />
    <CreateNpcDialog
      v-model:open="editOpen"
      v-model:entity="editingActor"
      :show-trigger="false"
      @saved="void applyCharacterSaved()"
    />
    <ConfirmDialog
      v-model:open="deleteConfirmOpen"
      title="Apagar personagem"
      :description="deleteDescription"
      confirm-label="Apagar"
      cancel-label="Cancelar"
      confirm-variant="destructive"
      :confirming="isDeletingSheet"
      @confirm="void confirmDeleteCharacter()"
    />
  </div>
</template>
