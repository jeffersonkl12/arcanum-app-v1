import type { Database } from '@database/client.database'
import { aiSettingTable } from '@database/entity/ai-setting.entity'
import type { StoredAiSetting } from '@schema/ai-setting.schema'

export interface IAiSettingRepository {
  /** The saved setting, or `undefined` while the player never changed it. */
  find(): Promise<StoredAiSetting | undefined>
  /** Creates the setting or replaces the one it has. */
  save(setting: Omit<StoredAiSetting, 'id'>): Promise<void>
}

export class AiSettingRepository implements IAiSettingRepository {
  constructor(private readonly database: Database) {}

  async find(): Promise<StoredAiSetting | undefined> {
    const [row] = await this.database.select().from(aiSettingTable)

    return row
  }

  async save(setting: Omit<StoredAiSetting, 'id'>): Promise<void> {
    await this.database
      .insert(aiSettingTable)
      .values({ id: true, ...setting })
      .onConflictDoUpdate({ target: aiSettingTable.id, set: setting })
  }
}
