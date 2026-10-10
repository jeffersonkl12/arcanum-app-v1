<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import CharacterSheetDialog from '@renderer/components/custom/CharacterSheetDialog.vue'
import { useGame } from '@renderer/composable/game.composable'
import { GameChatView, GameHeaderView, GamePartyView } from '@renderer/view/game'

const route = useRoute()
const {
  loadGame,
  sheetOpen,
  selectedSheet,
  isSheetLoading,
  isDeletingSheet,
  deleteSelectedCharacter,
  requestEditCharacter
} = useGame()

watch(
  () => route.params.worldId,
  (worldId) => {
    if (typeof worldId === 'string') void loadGame(worldId)
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex h-full min-h-0 w-full">
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <GameHeaderView />
      <GameChatView />
    </div>
    <GamePartyView />
    <CharacterSheetDialog
      v-model:open="sheetOpen"
      :sheet="selectedSheet"
      :loading="isSheetLoading"
      :deleting="isDeletingSheet"
      @delete="void deleteSelectedCharacter()"
      @edit="requestEditCharacter"
    />
  </div>
</template>
