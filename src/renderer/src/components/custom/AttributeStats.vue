<script setup lang="ts">
import { actorAttributeOptions, type ActorAttributes } from '@renderer/constant/actor.constant'

/** The attribute scores of a character, read-only. */
defineProps<{
  attributes: ActorAttributes
}>()
</script>

<template>
  <div class="grid grid-cols-3 gap-3">
    <div
      v-for="attribute in actorAttributeOptions"
      :key="attribute.key"
      class="flex flex-col items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-2.5"
    >
      <span class="text-badge font-semibold tracking-wide text-tertiary uppercase">
        {{ attribute.label }}
      </span>
      <span class="text-2xl font-bold text-foreground">{{ attributes[attribute.key] }}</span>
    </div>
  </div>
</template>
