export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} "${id}" was not found`)
    this.name = 'NotFoundError'
  }
}
