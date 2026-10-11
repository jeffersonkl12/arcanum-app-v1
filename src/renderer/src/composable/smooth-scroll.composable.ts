import { onBeforeUnmount, shallowRef, watch, type Ref, type ShallowRef } from 'vue'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

/**
 * Smooth scrolling (Lenis) for one scroll container of the app. The container is its own content
 * (it scrolls its children), so `content` is the wrapper itself. Pass `enabled` to turn it off for a
 * while, for instance on a route whose container does not scroll.
 */
export function useSmoothScroll(
  target: Readonly<ShallowRef<HTMLElement | null>>,
  enabled: Readonly<Ref<boolean>> | undefined = undefined
): ShallowRef<Lenis | undefined> {
  const lenis = shallowRef<Lenis>()

  function destroy(): void {
    lenis.value?.destroy()
    lenis.value = undefined
  }

  watch(
    [target, () => enabled?.value ?? true],
    ([element, isEnabled]) => {
      destroy()
      if (!element || !isEnabled) return
      lenis.value = new Lenis({ wrapper: element, content: element, autoRaf: true })
    },
    { immediate: true, flush: 'post' }
  )

  onBeforeUnmount(destroy)

  return lenis
}
