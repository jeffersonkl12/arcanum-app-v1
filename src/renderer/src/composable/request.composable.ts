import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import type { IpcChannel, IpcError, IpcInputArgs, IpcOutput } from '@shared'
import { translateIpcError } from '@renderer/util/ipc-error.util'

export function useRequest(): {
  isLoading: ComputedRef<boolean>
  error: Ref<IpcError | undefined>
  request: <TChannel extends IpcChannel>(
    channel: TChannel,
    ...input: IpcInputArgs<TChannel>
  ) => Promise<IpcOutput<TChannel> | undefined>
  execute: <TChannel extends IpcChannel>(
    channel: TChannel,
    ...input: IpcInputArgs<TChannel>
  ) => Promise<boolean>
} {
  // A counter, because calls started together must not clear the flag when the first one ends.
  const pending = ref(0)
  const isLoading = computed(() => pending.value > 0)
  const error = ref<IpcError>()

  /**
   * Calls the engine. A failure becomes a toast, except `invalid_input`: the form shows those per
   * field through `error.issues`.
   */
  async function request<TChannel extends IpcChannel>(
    channel: TChannel,
    ...input: IpcInputArgs<TChannel>
  ): Promise<IpcOutput<TChannel> | undefined> {
    pending.value++
    error.value = undefined
    try {
      const response = await window.api.invoke(channel, ...input)
      if (response.ok) return response.data
      error.value = response.error
      if (response.error.kind !== 'invalid_input') toast.error(translateIpcError(response.error))
      return undefined
    } finally {
      pending.value--
    }
  }

  /** For channels with no output (`void`), where `request` cannot tell success from failure. */
  async function execute<TChannel extends IpcChannel>(
    channel: TChannel,
    ...input: IpcInputArgs<TChannel>
  ): Promise<boolean> {
    await request(channel, ...input)
    return error.value === undefined
  }

  return { isLoading, error, request, execute }
}
