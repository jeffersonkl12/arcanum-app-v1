import type { IDocumentRepository } from '@repository/document.repository'
import type {
  CreateWorldDocument,
  WorldDocument,
  UpdateWorldDocument
} from '@schema/document.schema'
import { BaseService, type ICrudService } from '@service/base.service'

export interface IDocumentService extends ICrudService<
  WorldDocument,
  CreateWorldDocument,
  UpdateWorldDocument
> {
  listByWorld(worldId: string): Promise<WorldDocument[]>
}

/** The documents of a world: what its subjects are like, in short plain-text entries the player writes. */
export class DocumentService
  extends BaseService<WorldDocument, CreateWorldDocument, UpdateWorldDocument>
  implements IDocumentService
{
  constructor(private readonly documentRepository: IDocumentRepository) {
    super(documentRepository, 'Document')
  }

  listByWorld(worldId: string): Promise<WorldDocument[]> {
    return this.documentRepository.listByWorld(worldId)
  }
}
