<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useIsStreaming, useTriggerAction, type RenderNodeResult } from '@openuidev/vue-lang'
import { Dices } from '@lucide/vue'
import {
  ACTOR_ATTRIBUTES,
  ROLL_MODES,
  checkPoolSize,
  rollNotation,
  type ActorAttribute,
  type RollMode
} from '@shared'
import { Button } from '@renderer/components/ui/button'
import { Spinner } from '@renderer/components/ui/spinner'
import { actorAttributeOptions } from '@renderer/constant/actor.constant'
import { rollModeTag } from '@renderer/constant/dice.constant'
import { useDiceRoll } from '@renderer/composable/dice-roll.composable'
import { narratorActionsEnabledKey } from '@renderer/openui/narrator.context'
import { useGameStore } from '@renderer/store/game.store'
import { formatCheckMessage } from '@renderer/util/dice-check.util'

// <Renderer> also passes `renderNode`; it is declared so it does not end up as a DOM attribute.
const props = defineProps<{
  props: { label?: unknown; attribute?: unknown; mode?: unknown }
  renderNode: (value: unknown) => RenderNodeResult
}>()

const triggerAction = useTriggerAction()
const isStreaming = useIsStreaming()
const isEnabled = inject(narratorActionsEnabledKey, ref(false))
const { isRolling, rollCheck } = useDiceRoll()
const { actors } = storeToRefs(useGameStore())

// A check is rolled once: the outcome goes to the narrator, so rolling again would be a re-roll.
const hasRolled = ref(false)

// While the block is still being written a prop can be cut off or not valid yet.
const label = computed(() =>
  typeof props.props.label === 'string' ? props.props.label.trim() : ''
)
const mode = computed<RollMode>(
  () => ROLL_MODES.find((candidate) => candidate === props.props.mode) ?? 'normal'
)
const attribute = computed<ActorAttribute | undefined>(() =>
  ACTOR_ATTRIBUTES.find((candidate) => candidate === props.props.attribute)
)
const attributeLabel = computed(
  () => actorAttributeOptions.find((option) => option.key === attribute.value)?.label
)
// The player's character is the one who rolls; its score is how many dice the check throws.
const player = computed(() => actors.value.find((actor) => !actor.isNpc))
const pool = computed(() =>
  player.value && attribute.value
    ? checkPoolSize(player.value[attribute.value], mode.value)
    : undefined
)
const notation = computed(() => (pool.value === undefined ? '' : rollNotation(pool.value)))
const tag = computed(() => rollModeTag[mode.value])
const isDisabled = computed(
  () =>
    isStreaming.value ||
    !isEnabled.value ||
    isRolling.value ||
    hasRolled.value ||
    pool.value === undefined
)

async function roll(): Promise<void> {
  if (!player.value || !attribute.value || pool.value === undefined) return

  const result = await rollCheck(
    { actorId: player.value.id, attribute: attribute.value, mode: mode.value },
    pool.value
  )
  if (!result) return

  hasRolled.value = true
  triggerAction(formatCheckMessage(label.value, result))
}
</script>

<template>
  <div class="flex w-full flex-col items-center gap-2.5 py-2">
    <p v-if="label" class="text-center text-sm font-medium text-muted-foreground">
      {{ label }}
    </p>
    <p v-if="attributeLabel" class="text-meta tracking-wide text-tertiary uppercase">
      {{ attributeLabel }}
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
