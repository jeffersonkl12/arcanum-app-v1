<script setup lang="ts">
import { computed } from 'vue'
import { hpPercent, isCriticalHp } from '@renderer/composable/game.mapper'
import { Progress } from '@renderer/components/ui/progress'
import { cn } from '@renderer/lib/utils'

const props = withDefaults(
  defineProps<{
    current: number
    max: number
    label?: string
    /** `md` is a thicker bar, for the character sheet. */
    size?: 'sm' | 'md'
  }>(),
  { label: 'HP', size: 'sm' }
)

const percent = computed(() => hpPercent(props.current, props.max))
const critical = computed(() => isCriticalHp(props.current, props.max))
</script>

<template>
  <div class="flex w-full flex-col gap-2">
    <div class="flex w-full items-center justify-between gap-3">
      <span class="text-badge font-semibold tracking-wide text-tertiary uppercase">
        {{ label }}
      </span>
      <span class="text-badge font-semibold text-muted-foreground">
        {{ current }} / {{ max }}
      </span>
    </div>
    <Progress
      :model-value="percent"
      :aria-label="`${label}: ${current} de ${max}`"
      :class="
        cn(
          'bg-border',
          size === 'md' ? 'h-2' : 'h-1.5',
          critical && '[&_[data-slot=progress-indicator]]:bg-destructive'
        )
      "
    />
  </div>
</template>
