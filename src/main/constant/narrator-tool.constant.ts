/**
 * The narrator's tools that only read the game: running a turn again that used nothing else leaves
 * the engine as it was. Any other tool rolls dice or changes state, so that turn cannot be redone.
 * They are the keys of `tools` in the narrator agent, which is what the history stores.
 */
export const READ_ONLY_NARRATOR_TOOLS: readonly string[] = [
  'getInventoryTool',
  'findItemsTool',
  'findPlacesTool',
  'recallMemoriesTool'
]
