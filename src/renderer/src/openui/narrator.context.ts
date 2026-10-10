import type { InjectionKey, Ref } from 'vue'

/**
 * Whether the player may pick one of the narrator's `Choices` right now. The components of the
 * library only receive what the model wrote, so this is how the chat tells them.
 */
export const narratorChoicesEnabledKey: InjectionKey<Ref<boolean>> = Symbol(
  'narrator-choices-enabled'
)
