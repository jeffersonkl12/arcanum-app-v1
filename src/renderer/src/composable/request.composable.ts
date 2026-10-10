import { ref, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import type { IpcChannel, IpcError, IpcInputArgs, IpcOutput } from '@shared'

export function useRequest(): {
  isLoading: Ref<boolean>
  error: Ref<IpcError | undefined>
  request: <TChannel extends IpcChannel>(
    channel: TChannel,
    ...input: IpcInputArgs<TChannel>
  ) => Promise<IpcOutput<TChannel> | undefined>
} {
  const isLoading = ref(false)
  const error = ref<IpcError>()

  async function request<TChannel extends IpcChannel>(
    channel: TChannel,
    ...input: IpcInputArgs<TChannel>
  ): Promise<IpcOutput<TChannel> | undefined> {
    isLoading.value = true
    error.value = undefined
    try {
      const response = await window.api.invoke(channel, ...input)
      if (response.ok) return response.data
      error.value = response.error
      if (response.error.kind !== 'invalid_input') toast.error(response.error.message)
      return undefined
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, request }
}
