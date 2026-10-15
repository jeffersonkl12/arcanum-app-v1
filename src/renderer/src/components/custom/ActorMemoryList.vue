<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { MemoryWithActors } from '@schema'
import { Badge } from '@renderer/components/ui/badge'
import { Spinner } from '@renderer/components/ui/spinner'
import { memoryKindLabels } from '@renderer/constant/relationship.constant'
import { useRequest } from '@renderer/composable/request.composable'

/** Every memory an actor shares with others, newest first. */
const props = defineProps<{ actorId: string }>()

const { isLoading, request } = useRequest()
const memories = ref<MemoryWithActors[]>()

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

onMounted(async () => {
  memories.value = await request('memory:listByActor', props.actorId)
})
</script>

<template>
  <div v-if="!memories" class="flex items-center justify-center py-12">
    <Spinner v-if="isLoading" class="size-6 text-primary" />
  </div>

  <p v-else-if="memories.length === 0" class="py-8 text-center text-sm text-tertiary">
    Nenhuma memória registrada.
  </p>

  <div v-else class="flex flex-col gap-2">
    <div
      v-for="memory in memories"
      :key="memory.id"
      class="flex flex-col gap-1.5 rounded-lg border border-border bg-background px-3 py-2"
    >
      <p class="text-sm leading-normal text-foreground">{{ memory.summary }}</p>
      <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge
          class="h-auto rounded-full border-transparent bg-primary/15 px-2 py-0.5 text-badge font-bold tracking-wide text-primary uppercase"
        >
          {{ memoryKindLabels[memory.kind] }}
        </Badge>
        <span>Importância {{ memory.importance }}/5</span>
        <span>•</span>
        <span>{{ dateFormat.format(memory.createdAt) }}</span>
        <template v-if="memory.actors.length > 1">
          <span>•</span>
          <span class="truncate">{{ memory.actors.map((a) => a.name).join(', ') }}</span>
        </template>
      </div>
    </div>
  </div>
</template>
