<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue'
import { Button } from '@renderer/components/ui/button'
import type { DocumentSummary } from '@renderer/composable/world.type'

defineProps<{
  document: DocumentSummary
}>()

defineEmits<{
  edit: []
  remove: []
}>()
</script>

<template>
  <article class="flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-4">
    <header class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-1.5">
        <p class="truncate font-body text-base font-bold text-foreground">
          {{ document.subject }}
        </p>
        <span
          class="w-fit max-w-full truncate rounded-full bg-secondary px-2.5 py-0.5 text-badge font-medium text-muted-foreground"
        >
          {{ document.category }}
        </span>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="size-auto rounded-lg p-2 text-tertiary hover:text-foreground"
          @click="$emit('edit')"
        >
          <Pencil class="size-4.5" />
          <span class="sr-only">Editar {{ document.subject }}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="size-auto rounded-lg p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          @click="$emit('remove')"
        >
          <Trash2 class="size-4.5" />
          <span class="sr-only">Excluir {{ document.subject }}</span>
        </Button>
      </div>
    </header>
    <p class="text-sm whitespace-pre-line text-muted-foreground">{{ document.content }}</p>
  </article>
</template>
