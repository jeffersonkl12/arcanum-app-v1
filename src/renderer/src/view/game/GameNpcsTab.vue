<script setup lang="ts">
import { computed, ref } from 'vue'
import NpcCard from '@renderer/components/custom/NpcCard.vue'
import { Input } from '@renderer/components/ui/input'
import { NativeSelect } from '@renderer/components/ui/native-select'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { useGame } from '@renderer/composable/game.composable'
import { placePathLabel, toPartyMemberCard } from '@renderer/composable/game.mapper'
import type { NpcCardModel } from '@renderer/composable/game.type'

type NpcSort = 'name-asc' | 'name-desc' | 'hp-asc' | 'hp-desc' | 'place'

const { places, actors, openCharacterSheet } = useGame()

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

const search = ref('')
const placeFilter = ref('')
const groupFilter = ref<'all' | 'party' | 'outside'>('all')
const sort = ref<NpcSort>('name-asc')

const cards = computed<NpcCardModel[]>(() =>
  actors.value
    .filter((actor) => actor.isNpc)
    .map((actor) => ({
      ...toPartyMemberCard(actor),
      placeId: actor.pointOfInterestId,
      placeLabel: placePathLabel(actor.pointOfInterestId, places.value),
      inParty: actor.partyId !== null
    }))
)

/** Only the places where some NPC is, since filtering by any other would give an empty list. */
const placeOptions = computed(() => {
  const ids = new Set(cards.value.map((card) => card.placeId))
  return places.value
    .filter((place) => ids.has(place.id))
    .map((place) => ({ id: place.id, label: placePathLabel(place.id, places.value) }))
    .sort((a, b) => collator.compare(a.label, b.label))
})

function hpRatio(card: NpcCardModel): number {
  return card.hpMax > 0 ? card.hpCurrent / card.hpMax : 0
}

const shown = computed(() => {
  const term = search.value.trim().toLocaleLowerCase()
  const list = cards.value.filter(
    (card) =>
      (!placeFilter.value || card.placeId === placeFilter.value) &&
      (groupFilter.value === 'all' || card.inParty === (groupFilter.value === 'party')) &&
      (!term || `${card.name} ${card.roleLabel}`.toLocaleLowerCase().includes(term))
  )
  return list.sort((a, b) => {
    switch (sort.value) {
      case 'name-desc':
        return collator.compare(b.name, a.name)
      case 'hp-asc':
        return hpRatio(a) - hpRatio(b) || collator.compare(a.name, b.name)
      case 'hp-desc':
        return hpRatio(b) - hpRatio(a) || collator.compare(a.name, b.name)
      case 'place':
        return collator.compare(a.placeLabel, b.placeLabel) || collator.compare(a.name, b.name)
      default:
        return collator.compare(a.name, b.name)
    }
  })
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex flex-col gap-2 border-b border-border p-4">
      <Input v-model="search" placeholder="Buscar NPC..." />
      <div class="grid grid-cols-2 gap-2">
        <NativeSelect v-model="placeFilter" class="w-full" aria-label="Filtrar por lugar">
          <option value="">Todos os lugares</option>
          <option v-for="option in placeOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </NativeSelect>
        <NativeSelect v-model="groupFilter" class="w-full" aria-label="Filtrar por grupo">
          <option value="all">Todos</option>
          <option value="party">No grupo</option>
          <option value="outside">Fora do grupo</option>
        </NativeSelect>
      </div>
      <NativeSelect v-model="sort" class="w-full" aria-label="Ordenar NPCs">
        <option value="name-asc">Nome (A–Z)</option>
        <option value="name-desc">Nome (Z–A)</option>
        <option value="hp-asc">Vida (menor primeiro)</option>
        <option value="hp-desc">Vida (maior primeiro)</option>
        <option value="place">Lugar</option>
      </NativeSelect>
    </div>
    <ScrollArea class="min-h-0 flex-1">
      <div class="flex flex-col gap-3 p-4">
        <NpcCard
          v-for="card in shown"
          :key="card.id"
          :npc="card"
          @select="openCharacterSheet(card.id)"
        />
        <p v-if="shown.length === 0" class="text-sm text-tertiary">Nenhum NPC encontrado.</p>
      </div>
    </ScrollArea>
  </div>
</template>
