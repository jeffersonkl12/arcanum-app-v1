import type { Database } from '@database/client.database'
import { aiSettingTable } from '@database/entity/ai-setting.entity'
import { DEFAULT_AI_SETTING, DEFAULT_EMBEDDING_PROVIDER } from '@constant'
import type { IImageRepository } from '@repository/image.repository'
import type { StoredAiSetting } from '@schema/ai-setting.schema'

export interface IAiSettingRepository {
  /** The saved setting, or `undefined` while the player never changed it. */
  find(): Promise<StoredAiSetting | undefined>
  /** Creates the setting or replaces the one it has; the picture is not touched. */
  save(setting: Omit<StoredAiSetting, 'id' | 'imagePath'>): Promise<void>
}

export class AiSettingRepository implements IAiSettingRepository {
  constructor(private readonly database: Database) {}

  async find(): Promise<StoredAiSetting | undefined> {
    const [row] = await this.database.select().from(aiSettingTable)

    return row
  }

  async save(setting: Omit<StoredAiSetting, 'id' | 'imagePath'>): Promise<void> {
    await this.database
      .insert(aiSettingTable)
      .values({ id: true, ...setting })
      .onConflictDoUpdate({ target: aiSettingTable.id, set: setting })
  }
}

/**
 * The picture of the game master, in the single `ai_setting` row. It lets `ImageService` keep it like
 * any other entity's: the id it receives is ignored, because there is only one row. The row may not
 * exist yet (the player never saved a choice), so writing a picture creates it with the defaults.
 */
export class AiSettingImageRepository implements IImageRepository {
  constructor(private readonly database: Database) {}

  async findImagePath(): Promise<string | null> {
    const [row] = await this.database
      .select({ imagePath: aiSettingTable.imagePath })
      .from(aiSettingTable)

    return row?.imagePath ?? null
  }

  async setImagePath(_id: string, imagePath: string | null): Promise<boolean> {
    await this.database
      .insert(aiSettingTable)
      .values({
        id: true,
        ...DEFAULT_AI_SETTING,
        embeddingProvider: DEFAULT_EMBEDDING_PROVIDER,
        imagePath
      })
      .onConflictDoUpdate({ target: aiSettingTable.id, set: { imagePath } })

    return true
  }

  async listImagePaths(): Promise<string[]> {
    const imagePath = await this.findImagePath()

    return imagePath ? [imagePath] : []
  }
}
