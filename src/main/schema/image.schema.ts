import { z } from 'zod'

/** Sets (or replaces) the image of an entity with the bytes of the file. */
export const setImageSchema = z.object({
  id: z.uuid(),
  data: z.instanceof(Uint8Array)
})

export type SetImage = z.infer<typeof setImageSchema>
