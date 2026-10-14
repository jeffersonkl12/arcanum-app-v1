import { computed, type ComputedRef, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import type { AiSettingView, UpdateAiSetting } from '@schema'
import type { IpcError } from '@shared'
import type { AiProviderCatalogEntry } from './ai-setting.type'
import { useRequest } from './request.composable'
import { useAiSettingStore } from '@renderer/store/ai-setting.store'

export function useAiSetting(): {
  setting: Ref<AiSettingView | undefined>
  catalog: Ref<AiProviderCatalogEntry[]>
  isLoading: Ref<boolean>
  saveError: Ref<IpcError | undefined>
  selectedProvider: ComputedRef<AiProviderCatalogEntry | undefined>
  loadAiSetting: () => Promise<void>
  saveAiSetting: (input: UpdateAiSetting) => Promise<AiSettingView | undefined>
  clearApiKey: () => Promise<AiSettingView | undefined>
  clearEmbeddingApiKey: () => Promise<AiSettingView | undefined>
} {
  const { setting, catalog } = storeToRefs(useAiSettingStore())
  const { isLoading, error, request } = useRequest()

  const selectedProvider = computed(() =>
    catalog.value.find((entry) => entry.id === setting.value?.provider)
  )

  async function loadAiSetting(): Promise<void> {
    const [view, entries] = await Promise.all([
      request('aiSetting:get'),
      request('aiSetting:catalog')
    ])
    if (view) setting.value = view
    if (entries) catalog.value = entries
  }

  async function saveAiSetting(input: UpdateAiSetting): Promise<AiSettingView | undefined> {
    const updated = await request('aiSetting:update', input)
    if (!updated) return undefined
    setting.value = updated
    toast.success('Configurações salvas')
    return updated
  }

  async function clearApiKey(): Promise<AiSettingView | undefined> {
    const updated = await request('aiSetting:clearApiKey')
    if (!updated) return undefined
    setting.value = updated
    toast.success('Chave de API removida')
    return updated
  }

  async function clearEmbeddingApiKey(): Promise<AiSettingView | undefined> {
    const updated = await request('aiSetting:clearEmbeddingApiKey')
    if (!updated) return undefined
    setting.value = updated
    toast.success('Chave de embeddings removida')
    return updated
  }

  return {
    setting,
    catalog,
    isLoading,
    saveError: error,
    selectedProvider,
    loadAiSetting,
    saveAiSetting,
    clearApiKey,
    clearEmbeddingApiKey
  }
}
