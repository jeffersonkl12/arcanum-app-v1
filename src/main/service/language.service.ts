import type { ILanguageRepository } from '@repository/language.repository'
import type { CreateLanguage, Language, UpdateLanguage } from '@schema/language.schema'
import { BaseService, type ICrudService } from '@service/base.service'

export interface ILanguageService extends ICrudService<Language, CreateLanguage, UpdateLanguage> {
  listByWorld(worldId: string): Promise<Language[]>
}

/** A language still used by an actor cannot be deleted (`ConflictError`). */
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
