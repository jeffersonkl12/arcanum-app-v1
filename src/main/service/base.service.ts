import { NotFoundError } from '@error'
import type { IRepository } from '@repository/base.repository'

/** Operations every entity service offers. Reads and writes of a missing entity throw `NotFoundError`. */
export interface ICrudService<TRow, TNew, TPatch> {
  create(input: TNew): Promise<TRow>
  get(id: string): Promise<TRow>
  update(id: string, patch: TPatch): Promise<TRow>
  delete(id: string): Promise<void>
}

export abstract class BaseService<TRow, TNew, TPatch extends object> implements ICrudService<
  TRow,
  TNew,
  TPatch
> {
  constructor(
    protected readonly repository: IRepository<TRow, TNew, TPatch>,
    private readonly entityName: string
  ) {}

  create(input: TNew): Promise<TRow> {
    return this.repository.create(input)
  }

  async get(id: string): Promise<TRow> {
    return this.orThrow(id, await this.repository.findById(id))
  }

  async update(id: string, patch: TPatch): Promise<TRow> {
    return this.orThrow(id, await this.repository.update(id, patch))
  }

  async delete(id: string): Promise<void> {
    if (!(await this.repository.delete(id))) {
      throw new NotFoundError(this.entityName, id)
    }
  }

  private orThrow(id: string, row: TRow | undefined): TRow {
    if (row === undefined) {
      throw new NotFoundError(this.entityName, id)
    }

    return row
  }
}
