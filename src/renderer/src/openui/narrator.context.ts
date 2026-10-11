import type { InjectionKey, Ref } from 'vue'

/**
 * Whether the player may act on what the narrator offers right now: pick one of its `Choices` or
 * roll a `RollRequest`. The components of the library only receive what the model wrote, so this
 * is how the chat tells them.
 */
export const narratorActionsEnabledKey: InjectionKey<Ref<boolean>> = Symbol(
  'narrator-actions-enabled'
)
