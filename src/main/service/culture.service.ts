import type { ICultureRepository } from '@repository/culture.repository'
import type { CreateCulture, Culture, UpdateCulture } from '@schema/culture.schema'
import { BaseService, type ICrudService } from '@service/base.service'

export interface ICultureService extends ICrudService<Culture, CreateCulture, UpdateCulture> {
  listByWorld(worldId: string): Promise<Culture[]>
}

/** A culture still used by an actor cannot be deleted (`ConflictError`). */
export class CultureService
  extends BaseService<Culture, CreateCulture, UpdateCulture>
  implements ICultureService
{
  constructor(private readonly cultureRepository: ICultureRepository) {
    super(cultureRepository, 'Culture')
  }

  listByWorld(worldId: string): Promise<Culture[]> {
    return this.cultureRepository.listByWorld(worldId)
  }
}
