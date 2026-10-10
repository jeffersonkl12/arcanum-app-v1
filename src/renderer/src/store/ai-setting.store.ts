import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AiSettingView } from '@schema'
import type { AiProviderCatalogEntry } from '@renderer/composable/ai-setting.type'

/** The AI setting as the engine reports it. The API key itself never reaches the renderer. */
export const useAiSettingStore = defineStore('ai-setting', () => {
  const setting = ref<AiSettingView>()
  const catalog = ref<AiProviderCatalogEntry[]>([])

  return { setting, catalog }
})
