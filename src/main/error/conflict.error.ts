/** The operation breaks a data rule (duplicate, wrong world, entity still in use...). */
export class ConflictError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ConflictError'
  }
}
