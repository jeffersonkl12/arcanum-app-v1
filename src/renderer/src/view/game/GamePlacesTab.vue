<script setup lang="ts">
import { computed, ref } from 'vue'
import PlaceDetailDialog from '@renderer/components/custom/PlaceDetailDialog.vue'
import PlaceCard from '@renderer/components/custom/PlaceCard.vue'
import { Input } from '@renderer/components/ui/input'
import { NativeSelect } from '@renderer/components/ui/native-select'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { toPlaceSummaries } from '@renderer/composable/world.mapper'
import { useGame } from '@renderer/composable/game.composable'
import type { PlaceCardModel } from '@renderer/composable/game.type'

type PlaceSort = 'name-asc' | 'name-desc' | 'type' | 'npcs'

const { places, actors, currentPlace } = useGame()

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

const search = ref('')
const typeFilter = ref('')
const sort = ref<PlaceSort>('name-asc')

const cards = computed<PlaceCardModel[]>(() =>
  places.value.map((place) => ({
    id: place.id,
    name: place.name,
    type: place.type,
    imagePath: place.imagePath ?? undefined,
    parentLabel: places.value.find((item) => item.id === place.parentId)?.name ?? '',
    npcCount: actors.value.filter((actor) => actor.isNpc && actor.pointOfInterestId === place.id)
      .length,
    isCurrent: currentPlace.value?.id === place.id
  }))
)

const summaries = computed(() => toPlaceSummaries(places.value))
const viewingId = ref<string>()
const detailOpen = ref(false)
const viewing = computed(() => summaries.value.find((place) => place.id === viewingId.value))
const inside = computed(() => summaries.value.filter((place) => place.parentId === viewingId.value))

function viewPlace(placeId: string): void {
  viewingId.value = placeId
  detailOpen.value = true
}

const types = computed(() =>
  [...new Set(cards.value.map((card) => card.type))].sort(collator.compare)
)

const shown = computed(() => {
  const term = search.value.trim().toLocaleLowerCase()
  const list = cards.value.filter(
    (card) =>
      (!typeFilter.value || card.type === typeFilter.value) &&
      (!term || `${card.name} ${card.type} ${card.parentLabel}`.toLocaleLowerCase().includes(term))
  )
  return list.sort((a, b) => {
    switch (sort.value) {
      case 'name-desc':
        return collator.compare(b.name, a.name)
      case 'type':
        return collator.compare(a.type, b.type) || collator.compare(a.name, b.name)
      case 'npcs':
        return b.npcCount - a.npcCount || collator.compare(a.name, b.name)
      default:
        return collator.compare(a.name, b.name)
    }
  })
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex flex-col gap-2 border-b border-border p-4">
      <Input v-model="search" placeholder="Buscar lugar..." />
      <div class="grid grid-cols-2 gap-2">
        <NativeSelect v-model="typeFilter" class="w-full" aria-label="Filtrar por tipo">
          <option value="">Todos os tipos</option>
          <option v-for="type in types" :key="type" :value="type">{{ type }}</option>
        </NativeSelect>
        <NativeSelect v-model="sort" class="w-full" aria-label="Ordenar lugares">
          <option value="name-asc">Nome (A–Z)</option>
          <option value="name-desc">Nome (Z–A)</option>
          <option value="type">Tipo</option>
          <option value="npcs">Mais NPCs</option>
        </NativeSelect>
      </div>
    </div>
    <ScrollArea class="min-h-0 flex-1">
      <div class="flex flex-col gap-3 p-4">
        <PlaceCard
          v-for="card in shown"
          :key="card.id"
          :place="card"
          @select="viewPlace(card.id)"
        />
        <p v-if="shown.length === 0" class="text-sm text-tertiary">Nenhum lugar encontrado.</p>
      </div>
    </ScrollArea>
    <PlaceDetailDialog v-model:open="detailOpen" :place="viewing" :inside="inside" readonly />
  </div>
</template>
