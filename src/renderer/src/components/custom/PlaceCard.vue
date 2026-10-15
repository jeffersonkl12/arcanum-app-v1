<script setup lang="ts">
import { toImageUrl } from '@shared'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import type { PlaceCardModel } from '@renderer/composable/game.type'

defineProps<{
  place: PlaceCardModel
}>()

defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    type="button"
    class="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-3.5 text-left transition-colors hover:bg-secondary/60"
    @click="$emit('select')"
  >
    <div class="flex w-full items-center gap-3">
      <Avatar size="lg" class="rounded-lg after:border-transparent">
        <AvatarImage v-if="place.imagePath" :src="toImageUrl(place.imagePath)" :alt="place.name" />
        <AvatarFallback class="rounded-lg">{{ place.name.slice(0, 1) }}</AvatarFallback>
      </Avatar>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <p class="truncate text-sm font-bold text-foreground">{{ place.name }}</p>
        <p class="truncate text-xs text-muted-foreground">{{ place.type }}</p>
      </div>
    </div>
    <p v-if="place.parentLabel" class="truncate text-xs text-tertiary">
      Dentro de {{ place.parentLabel }}
    </p>
    <p class="text-xs text-muted-foreground">
      {{ place.npcCount }} {{ place.npcCount === 1 ? 'NPC' : 'NPCs' }}
      <template v-if="place.isCurrent"> • Você está aqui</template>
    </p>
  </button>
</template>
