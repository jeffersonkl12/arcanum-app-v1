import { ConflictError } from '@error'

const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

/** Readable messages for the constraints that encode game rules. */
const CONSTRAINT_MESSAGES: Readonly<Record<string, string>> = {
  actor_world_id_player_unique: 'The world already has a player',
  party_world_id_unique: 'The world already has a party',
  actor_culture_world_fk: 'The culture does not exist in the actor world, or is still in use',
  actor_language_world_fk: 'The language does not exist in the actor world, or is still in use',
  actor_party_world_fk: 'The party does not exist in the actor world, or is still in use'
}

interface DatabaseErrorShape {
  code?: string
  constraint?: string
  detail?: string
}

/** Turns a constraint violation into a `ConflictError`; any other error is returned untouched. */
export function translateDatabaseError(error: unknown): unknown {
  const cause = (error as { cause?: DatabaseErrorShape } | null)?.cause

  if (cause?.code !== UNIQUE_VIOLATION && cause?.code !== FOREIGN_KEY_VIOLATION) {
    return error
  }

  const message =
    (cause.constraint && CONSTRAINT_MESSAGES[cause.constraint]) ??
    cause.detail ??
    'The operation violates a data constraint'

  return new ConflictError(message, { cause: error })
}
