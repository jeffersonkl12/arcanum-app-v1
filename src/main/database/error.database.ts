import { ConflictError } from '@error'

const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'
const CHECK_VIOLATION = '23514'

/** Readable messages for the constraints that encode game rules. */
const CONSTRAINT_MESSAGES: Readonly<Record<string, string>> = {
  actor_world_id_player_unique: 'The world already has a player',
  party_world_id_unique: 'The world already has a party',
  campaign_world_id_unique: 'The world already has a campaign',
  actor_culture_world_fk: 'The culture does not exist in the actor world, or is still in use',
  actor_language_world_fk: 'The language does not exist in the actor world, or is still in use',
  actor_party_world_fk: 'The party does not exist in the actor world, or is still in use',
  actor_hp_max_range: 'The maximum health must be between 2 and 12',
  actor_hp_current_range: 'The current health must be between 0 and the maximum',
  actor_attributes_range: 'Strength, dexterity and intelligence must be between 1 and 6',
  actor_coins_range: 'Gold, silver and bronze pieces must be between 0 and 999999999',
  relationship_from_actor_world_fk: 'Both actors of a relationship must exist in the same world',
  relationship_to_actor_world_fk: 'Both actors of a relationship must exist in the same world',
  relationship_not_self: 'An actor has no relationship with itself',
  relationship_value_range: 'A relationship must be between -100 and 100',
  item_actor_world_fk: 'The actor does not exist in the item world, or still carries items',
  item_equipped_needs_actor: 'Only an item that is carried can be equipped',
  item_actor_id_equipped_slot_unique: 'That place is already taken by another equipped item',
  item_tiny_slots: 'A tiny item takes no inventory slots and any other takes at least one',
  item_weapon_fields: 'A weapon needs both its class and its damage die',
  item_wear_fields: 'A piece of clothing needs both its wear slot and its armor bonus',
  item_armor_bonus_range: 'The armor bonus must be between 0 and 3',
  item_not_weapon_and_wearable: 'An item cannot be both a weapon and a piece of clothing',
  item_equipped_slot_matches: 'The item cannot be equipped in that place'
}

interface DatabaseErrorShape {
  code?: string
  constraint?: string
  detail?: string
}

/** Turns a constraint violation into a `ConflictError`; any other error is returned untouched. */
export function translateDatabaseError(error: unknown): unknown {
  const cause = (error as { cause?: DatabaseErrorShape } | null)?.cause

  const isConstraintViolation =
    cause?.code === UNIQUE_VIOLATION ||
    cause?.code === FOREIGN_KEY_VIOLATION ||
    cause?.code === CHECK_VIOLATION
  if (!cause || !isConstraintViolation) {
    return error
  }

  const message =
    (cause.constraint && CONSTRAINT_MESSAGES[cause.constraint]) ??
    cause.detail ??
    'The operation violates a data constraint'

  return new ConflictError(message, { cause: error })
}
