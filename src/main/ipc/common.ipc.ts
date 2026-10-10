import { z } from 'zod'

export const idSchema = z.uuid()

/** Input of an update: the entity and the fields that change. */
export function updateInput<TPatch extends z.ZodType>(
  patch: TPatch
): z.ZodObject<{ id: z.ZodUUID; patch: TPatch }> {
  return z.object({ id: idSchema, patch })
}
