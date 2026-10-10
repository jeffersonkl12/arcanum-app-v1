import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import type { AiSettingView, UpdateAiSetting } from '@schema'
import type { IpcError, IpcOutput } from '@shared'
import { useRequest } from './request.composable'

export type AiProviderCatalogEntry = IpcOutput<'aiSetting:catalog'>[number]

const setting = ref<AiSettingView>()
const catalog = ref<AiProviderCatalogEntry[]>([])

export function useAiSetting(): {
  setting: Ref<AiSettingView | undefined>
  catalog: Ref<AiProviderCatalogEntry[]>
  isLoading: Ref<boolean>
  saveError: Ref<IpcError | undefined>
  selectedProvider: ComputedRef<AiProviderCatalogEntry | undefined>
  loadAiSetting: () => Promise<void>
  saveAiSetting: (input: UpdateAiSetting) => Promise<AiSettingView | undefined>
  clearApiKey: () => Promise<AiSettingView | undefined>
} {
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
    clearApiKey
  }
}
