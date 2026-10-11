<script setup lang="ts">
import { computed, provide } from 'vue'
import {
  BuiltinActionType,
  Renderer,
  type ActionEvent,
  type OpenUIError
} from '@openuidev/vue-lang'
import { narratorActionsEnabledKey } from '@renderer/openui/narrator.context'
import { narratorLibrary } from '@renderer/openui/narrator.library'

const props = defineProps<{
  /** OpenUI Lang, without the markdown fence: what the narrator wrote for this block. */
  source: string
  streaming?: boolean
  /** The player may pick a `Choice` or roll a `RollRequest` of this block. */
  interactive?: boolean
}>()

const emit = defineEmits<{
  /** The player picked an option: it is what they say next. */
  choose: [text: string]
}>()

provide(
  narratorActionsEnabledKey,
  computed(() => props.interactive === true && props.streaming !== true)
)

// Only "continue the conversation" is understood. Anything else the model could ask for (like
// opening a URL) is ignored: the vocabulary does not offer it.
function onAction(event: ActionEvent): void {
  if (event.type !== BuiltinActionType.ContinueConversation) return
  const text = event.humanFriendlyMessage.trim()
  if (text) emit('choose', text)
}

// The parser is permissive and renders what it can; a block with problems is the model straying
// from its prompt, which is worth knowing while developing.
function onError(errors: OpenUIError[]): void {
  if (errors.length > 0 && import.meta.env.DEV)
    console.warn('The narrator wrote a UI block with issues', errors)
}
</script>

<template>
  <Renderer
    :response="source"
    :library="narratorLibrary"
    :is-streaming="streaming === true"
    :on-action="onAction"
    :on-error="onError"
  />
</template>
