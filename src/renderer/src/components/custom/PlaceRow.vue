<script setup lang="ts">
import { ChevronDown, ChevronRight, Pencil, Trash2 } from '@lucide/vue'
import { toImageUrl } from '@shared'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Button } from '@renderer/components/ui/button'
import type { PlaceSummary } from '@renderer/composable/world.type'

defineProps<{
  place: PlaceSummary
  /** Whether the row can fold its children; off while searching, when the list is flat. */
  collapsible?: boolean
  collapsed?: boolean
}>()

defineEmits<{
  view: []
  toggle: []
  edit: []
  remove: []
}>()
</script>

<template>
  <div
    class="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3"
    :style="{ marginLeft: `${place.depth * 1.5}rem` }"
  >
    <Button
      v-if="collapsible && place.childCount > 0"
      type="button"
      variant="ghost"
      size="icon-sm"
      class="size-auto shrink-0 rounded-lg p-1 text-tertiary hover:text-foreground"
      :aria-expanded="!collapsed"
      @click="$emit('toggle')"
    >
      <component :is="collapsed ? ChevronRight : ChevronDown" class="size-5" />
      <span class="sr-only">
        {{ collapsed ? 'Mostrar' : 'Ocultar' }} lugares dentro de {{ place.name }}
      </span>
    </Button>
    <span v-else-if="collapsible" class="size-7 shrink-0" aria-hidden="true" />
    <button
      type="button"
      class="flex min-w-0 flex-1 items-center gap-4 text-left outline-none"
      @click="$emit('view')"
    >
      <Avatar class="size-12 rounded-lg after:border-transparent">
        <AvatarImage v-if="place.imagePath" :src="toImageUrl(place.imagePath)" :alt="place.name" />
        <AvatarFallback class="rounded-lg">{{ place.name.slice(0, 1) }}</AvatarFallback>
      </Avatar>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p class="truncate font-body text-base font-bold text-foreground">{{ place.name }}</p>
        <p class="truncate text-sm text-muted-foreground">
          {{ [place.type, ...place.path.slice(-1)].join(' • ') }}
        </p>
      </div>
      <span v-if="place.childCount > 0" class="shrink-0 text-sm text-muted-foreground">
        {{ place.childCount }} {{ place.childCount === 1 ? 'lugar' : 'lugares' }}
      </span>
    </button>
    <div class="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="size-auto rounded-lg p-2 text-tertiary hover:text-foreground"
        @click="$emit('edit')"
      >
        <Pencil class="size-4.5" />
        <span class="sr-only">Editar {{ place.name }}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="size-auto rounded-lg p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        @click="$emit('remove')"
      >
        <Trash2 class="size-4.5" />
        <span class="sr-only">Excluir {{ place.name }}</span>
      </Button>
    </div>
  </div>
</template>
