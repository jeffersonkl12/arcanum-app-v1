import { z } from 'zod'

/**
 * Dynamic context that stays in the system prompt for a while: a titled group of lines. The main
 * process decides what is in it and for how long (see `ContextWindowService`); the prompt only
 * renders what it is given, so anything that has to linger in the prompt reaches it this way.
 */
export const liveContextSectionSchema = z.object({
  title: z.string(),
  entries: z.array(z.string())
})

export type LiveContextSection = z.infer<typeof liveContextSectionSchema>

export const liveContextSchema = z.array(liveContextSectionSchema)
