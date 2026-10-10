import { ConflictError, NotFoundError } from '@error'
import type { IpcError } from '@shared'
import { ZodError } from 'zod'

/**
 * Turns whatever a handler threw into what the renderer may see. Rule violations and validation
 * failures are the user's to fix and keep their message; anything else is a bug, so it is logged
 * here and the renderer gets a generic message instead of internals.
 */
export function toIpcError(error: unknown): IpcError {
  if (error instanceof ZodError) {
    return {
      kind: 'invalid_input',
      message: 'The data sent is invalid',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    }
  }

  if (error instanceof NotFoundError) return { kind: 'not_found', message: error.message }
  if (error instanceof ConflictError) return { kind: 'conflict', message: error.message }

  console.error('Unexpected error in an IPC handler:', error)
  return { kind: 'internal', message: 'Something went wrong' }
}
