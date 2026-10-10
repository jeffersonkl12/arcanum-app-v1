<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useIsStreaming, useTriggerAction, type RenderNodeResult } from '@openuidev/vue-lang'
import { Button } from '@renderer/components/ui/button'
import { narratorChoicesEnabledKey } from '@renderer/openui/narrator.context'

// <Renderer> also passes `renderNode`; it is declared so it does not end up as a DOM attribute.
const props = defineProps<{
  props: { options?: unknown[] }
  renderNode: (value: unknown) => RenderNodeResult
}>()

const triggerAction = useTriggerAction()
const isStreaming = useIsStreaming()
const isEnabled = inject(narratorChoicesEnabledKey, ref(false))

// While the block is still being written an option can be cut off or not a string yet.
const options = computed(() =>
  (props.props.options ?? []).filter(
    (option): option is string => typeof option === 'string' && option.trim().length > 0
  )
)
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Button
      v-for="option in options"
      :key="option"
      type="button"
      variant="outline"
      class="h-auto rounded-full bg-transparent px-4 py-2 text-left text-sm font-medium whitespace-normal"
      :disabled="isStreaming || !isEnabled"
      @click="triggerAction(option)"
    >
      {{ option }}
    </Button>
  </div>
</template>
