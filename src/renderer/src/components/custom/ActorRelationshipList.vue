<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toImageUrl } from '@shared'
import type { ActorRelationship, Feeling } from '@schema'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Spinner } from '@renderer/components/ui/spinner'
import { relationshipLevelLabels } from '@renderer/constant/relationship.constant'
import { useRequest } from '@renderer/composable/request.composable'

/** What an actor feels about the others it has a bond with, and what they feel about it. */
const props = defineProps<{ actorId: string }>()

const { isLoading, request } = useRequest()
const relationships = ref<ActorRelationship[]>()

// The strongest bonds first, whichever direction they point.
const sorted = computed(() =>
  [...(relationships.value ?? [])].sort(
    (a, b) =>
      Math.max(Math.abs(b.feels.value), Math.abs(b.feltBy.value)) -
      Math.max(Math.abs(a.feels.value), Math.abs(a.feltBy.value))
  )
)

function feelingClass(feeling: Feeling): string {
  if (feeling.value > 0) return 'text-primary'
  if (feeling.value < 0) return 'text-destructive'
  return 'text-muted-foreground'
}

function formatValue(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

onMounted(async () => {
  relationships.value = await request('relationship:listByActor', props.actorId)
})
</script>

<template>
  <div v-if="!relationships" class="flex items-center justify-center py-12">
    <Spinner v-if="isLoading" class="size-6 text-primary" />
  </div>

  <p v-else-if="sorted.length === 0" class="py-8 text-center text-sm text-tertiary">
    Nenhuma relação ainda. Elas surgem conforme as interações da campanha.
  </p>

  <div v-else class="flex flex-col gap-2">
    <div
      v-for="relationship in sorted"
      :key="relationship.actorId"
      class="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
    >
      <Avatar class="size-9 rounded-lg after:border-transparent">
        <AvatarImage
          v-if="relationship.imagePath"
          :src="toImageUrl(relationship.imagePath)"
          :alt="relationship.name"
        />
        <AvatarFallback class="rounded-lg">{{ relationship.name.slice(0, 1) }}</AvatarFallback>
      </Avatar>
      <span class="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
        {{ relationship.name }}
      </span>
      <div class="flex shrink-0 flex-col gap-0.5 text-right text-xs">
        <span :class="feelingClass(relationship.feels)">
          Sente: {{ relationshipLevelLabels[relationship.feels.level] }} ({{
            formatValue(relationship.feels.value)
          }})
        </span>
        <span :class="feelingClass(relationship.feltBy)">
          É sentido: {{ relationshipLevelLabels[relationship.feltBy.level] }} ({{
            formatValue(relationship.feltBy.value)
          }})
        </span>
      </div>
    </div>
  </div>
</template>
