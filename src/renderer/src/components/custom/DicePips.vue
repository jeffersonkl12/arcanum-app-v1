<script setup lang="ts">
import { cn } from '@renderer/lib/utils'

/**
 * A score drawn as a pool of dice: `max` small squares, the first `value` of them filled. An
 * attribute is how many d6 a check rolls, so this is the pool the player will throw.
 */
defineProps<{
  value?: number
  max: number
}>()
</script>

<template>
  <div class="flex items-center justify-center gap-1" aria-hidden="true">
    <span
      v-for="index in max"
      :key="index"
      :class="cn('size-2 rounded-[3px]', index <= (value ?? 0) ? 'bg-primary' : 'bg-border')"
    />
  </div>
</template>
