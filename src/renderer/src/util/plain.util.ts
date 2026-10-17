import { toRaw } from 'vue'

/**
 * A copy of `value` with every Vue reactive proxy removed. The context bridge and Electron's
 * structured clone refuse a `Proxy` ("An object could not be cloned"), and a form keeps its
 * drafts in refs.
 */
export function toPlain<T>(value: T): T {
  const raw: unknown = toRaw(value)
  if (Array.isArray(raw)) return raw.map(toPlain) as T
  if (raw !== null && typeof raw === 'object' && Object.getPrototypeOf(raw) === Object.prototype) {
    return Object.fromEntries(Object.entries(raw).map(([key, item]) => [key, toPlain(item)])) as T
  }
  return raw as T
}
