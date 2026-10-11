<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useIsStreaming, useTriggerAction, type RenderNodeResult } from '@openuidev/vue-lang'
import { Dices } from '@lucide/vue'
import { ROLL_MODES, rollNotation, type RollMode } from '@shared'
import { Button } from '@renderer/components/ui/button'
import { Spinner } from '@renderer/components/ui/spinner'
import { rollModeTag } from '@renderer/constant/dice.constant'
import { useDiceRoll } from '@renderer/composable/dice-roll.composable'
import { narratorActionsEnabledKey } from '@renderer/openui/narrator.context'
import { formatCheckMessage } from '@renderer/util/dice-check.util'

// <Renderer> also passes `renderNode`; it is declared so it does not end up as a DOM attribute.
const props = defineProps<{
  props: { label?: unknown; mode?: unknown }
  renderNode: (value: unknown) => RenderNodeResult
}>()

const triggerAction = useTriggerAction()
const isStreaming = useIsStreaming()
const isEnabled = inject(narratorActionsEnabledKey, ref(false))
const { isRolling, rollCheck } = useDiceRoll()

// A check is rolled once: the outcome goes to the narrator, so rolling again would be a re-roll.
const hasRolled = ref(false)

// While the block is still being written a prop can be cut off or not valid yet.
const label = computed(() =>
  typeof props.props.label === 'string' ? props.props.label.trim() : ''
)
const mode = computed<RollMode>(
  () => ROLL_MODES.find((candidate) => candidate === props.props.mode) ?? 'normal'
)
const notation = computed(() => rollNotation(mode.value))
const tag = computed(() => rollModeTag[mode.value])
const isDisabled = computed(
  () => isStreaming.value || !isEnabled.value || isRolling.value || hasRolled.value
)

async function roll(): Promise<void> {
  const result = await rollCheck(mode.value)
  if (!result) return

  hasRolled.value = true
  triggerAction(formatCheckMessage(label.value, mode.value, result))
}
</script>

<template>
  <div class="flex w-full flex-col items-center gap-2.5 py-2">
    <p v-if="label" class="text-center text-sm font-medium text-muted-foreground">
      {{ label }}
    </p>
    <Button
      type="button"
      size="lg"
      class="h-auto gap-3 rounded-full px-7 py-3 text-base font-bold shadow-lg"
      :disabled="isDisabled"
      @click="roll"
    >
      <Spinner v-if="isRolling" class="size-5" />
      <Dices v-else class="size-5" />
      <span class="font-mono tracking-wider">{{ notation }}</span>
      <span
        v-if="tag"
        class="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold"
      >
        {{ tag }}
      </span>
    </Button>
  </div>
</template>
