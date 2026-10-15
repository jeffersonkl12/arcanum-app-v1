import type { ILanguageRepository } from '@repository/language.repository'
import type { CreateLanguage, Language, UpdateLanguage } from '@schema/language.schema'
import { BaseService, type ICrudService } from '@service/base.service'

export interface ILanguageService extends ICrudService<Language, CreateLanguage, UpdateLanguage> {
  listByWorld(worldId: string): Promise<Language[]>
}

/**
 * A language belongs to a culture of its world (`ConflictError` otherwise), and one still used by
 * an actor cannot be deleted.
 */
export class LanguageService
  extends BaseService<Language, CreateLanguage, UpdateLanguage>
  implements ILanguageService
{
  constructor(private readonly languageRepository: ILanguageRepository) {
    super(languageRepository, 'Language')
  }

  listByWorld(worldId: string): Promise<Language[]> {
    return this.languageRepository.listByWorld(worldId)
  }
}
