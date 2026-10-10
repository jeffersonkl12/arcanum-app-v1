import { createWorldSchema } from '@schema/world.schema'
import { z } from 'zod'

export const cloneWorldSchema = z.object({
  sourceWorldId: z.uuid(),
  /** Name of the copy; the source world's name when omitted. */
  name: createWorldSchema.shape.name.optional()
})

export type CloneWorld = z.infer<typeof cloneWorldSchema>
