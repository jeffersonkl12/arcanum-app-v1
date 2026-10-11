<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue'
import { toImageUrl } from '@shared'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import type { ItemSummary } from '@renderer/composable/world.type'

defineProps<{
  item: ItemSummary
}>()

defineEmits<{
  view: []
  edit: []
  remove: []
}>()
</script>

<template>
  <div class="flex w-full items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
    <button
      type="button"
      class="flex min-w-0 flex-1 items-center gap-4 text-left outline-none"
      @click="$emit('view')"
    >
      <Avatar class="size-12 rounded-lg after:border-transparent">
        <AvatarImage v-if="item.imagePath" :src="toImageUrl(item.imagePath)" :alt="item.name" />
        <AvatarFallback class="rounded-lg">{{ item.name.slice(0, 1) }}</AvatarFallback>
      </Avatar>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p class="truncate font-body text-base font-bold text-foreground">{{ item.name }}</p>
        <p class="truncate text-sm text-muted-foreground">{{ item.tags.join(' • ') }}</p>
      </div>
      <Badge
        v-if="item.isCarried"
        class="h-auto shrink-0 rounded-full border-transparent bg-primary/15 px-3 py-1 text-badge font-bold tracking-wide text-primary uppercase"
      >
        {{ item.isEquipped ? 'Equipado' : 'Carregado' }}
      </Badge>
      <span class="w-20 shrink-0 text-right text-sm text-muted-foreground">
        {{ item.slots }} {{ item.slots === 1 ? 'espaço' : 'espaços' }}
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
        <span class="sr-only">Editar {{ item.name }}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="size-auto rounded-lg p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        @click="$emit('remove')"
      >
        <Trash2 class="size-4.5" />
        <span class="sr-only">Excluir {{ item.name }}</span>
      </Button>
    </div>
  </div>
</template>
