import type { Database } from '@database/client.database'
import { languageTable } from '@database/entity/language.entity'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type { CreateLanguage, Language, UpdateLanguage } from '@schema/language.schema'
import { asc, eq } from 'drizzle-orm'

export interface ILanguageRepository extends IRepository<Language, CreateLanguage, UpdateLanguage> {
  listByWorld(worldId: string): Promise<Language[]>
}

export class LanguageRepository
  extends BaseRepository<Language, CreateLanguage, UpdateLanguage>
  implements ILanguageRepository
{
  constructor(database: Database) {
    super(database, languageTable)
  }

  listByWorld(worldId: string): Promise<Language[]> {
    return this.database
      .select()
      .from(languageTable)
      .where(eq(languageTable.worldId, worldId))
      .orderBy(asc(languageTable.name))
  }
}
