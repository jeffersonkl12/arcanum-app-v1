import type { ArcanumApi } from '@shared'

declare global {
  interface Window {
    api: ArcanumApi
  }
}
