<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue'
import { Button } from '@renderer/components/ui/button'

defineProps<{
  name: string
  description: string
}>()

defineEmits<{
  edit: []
  remove: []
}>()
</script>

<template>
  <div class="flex w-full items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p class="truncate font-body text-base font-bold text-foreground">{{ name }}</p>
      <p class="truncate text-sm text-muted-foreground">{{ description }}</p>
    </div>
    <div class="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="size-auto rounded-lg p-2 text-tertiary hover:text-foreground"
        @click="$emit('edit')"
      >
        <Pencil class="size-4.5" />
        <span class="sr-only">Editar {{ name }}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="size-auto rounded-lg p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        @click="$emit('remove')"
      >
        <Trash2 class="size-4.5" />
        <span class="sr-only">Excluir {{ name }}</span>
      </Button>
    </div>
  </div>
</template>
