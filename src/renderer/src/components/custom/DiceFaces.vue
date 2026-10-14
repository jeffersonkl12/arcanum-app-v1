<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@renderer/lib/utils'

/**
 * The faces of a throw that already happened, in rolled order. With `keepHighest` only the highest
 * die counts (an attribute) and the others are dimmed; otherwise all of them count (health).
 */
const props = defineProps<{
  faces: readonly number[]
  keepHighest?: boolean
}>()

// A tie keeps the first of the equal dice, so exactly one die is highlighted.
const keptIndex = computed(() => props.faces.indexOf(Math.max(...props.faces)))

function isDimmed(index: number): boolean {
  return props.keepHighest === true && index !== keptIndex.value
}
</script>

<template>
  <div class="flex items-center justify-center gap-1" :aria-label="`Dados: ${faces.join(', ')}`">
    <span
      v-for="(face, index) in faces"
      :key="index"
      :class="
        cn(
          'flex size-5 items-center justify-center rounded-md border text-badge font-bold',
          isDimmed(index)
            ? 'border-border text-tertiary line-through opacity-50'
            : 'border-primary bg-primary/10 text-primary'
        )
      "
    >
      {{ face }}
    </span>
  </div>
</template>
