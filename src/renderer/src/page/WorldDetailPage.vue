<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  WorldDetailHeaderView,
  WorldEntitiesView,
  WorldSummaryView
} from '@renderer/view/world-detail'
import { useWorld } from '@renderer/composable/world.composable'

const route = useRoute()
const { loadWorld, isLoadingDetail, isNotFound, currentWorld } = useWorld()

watch(
  () => route.params.worldId,
  (worldId) => {
    if (typeof worldId === 'string') void loadWorld(worldId)
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex min-h-full flex-col gap-8">
    <p v-if="isLoadingDetail" class="text-sm text-muted-foreground">Carregando mundo...</p>
    <p v-else-if="isNotFound" class="text-sm text-muted-foreground">Mundo não encontrado.</p>
    <template v-else-if="currentWorld">
      <WorldDetailHeaderView />
      <WorldSummaryView />
      <WorldEntitiesView />
    </template>
  </div>
</template>
