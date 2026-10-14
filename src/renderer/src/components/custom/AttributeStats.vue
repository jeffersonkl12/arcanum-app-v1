<script setup lang="ts">
import DicePips from '@renderer/components/custom/DicePips.vue'
import {
  actorAttributeLimits,
  actorAttributeOptions,
  type ActorAttributes
} from '@renderer/constant/actor.constant'
import { rollNotation } from '@shared'

/**
 * The attribute scores of a character, read-only. A score is how many d6 a check with it rolls,
 * so each card shows it as that pool of dice.
 */
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
      <DicePips :value="attributes[attribute.key]" :max="actorAttributeLimits.max" />
      <span class="text-badge text-muted-foreground">
        {{ rollNotation(attributes[attribute.key]) }} por teste
      </span>
    </div>
  </div>
</template>
