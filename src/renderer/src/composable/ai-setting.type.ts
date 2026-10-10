import type { IpcOutput } from '@shared'

export type AiProviderCatalogEntry = IpcOutput<'aiSetting:catalog'>[number]
