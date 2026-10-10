import { partyTable } from '@database/entity/party.entity'
import { createInsertSchema } from 'drizzle-orm/zod'
import type { z } from 'zod'

export const createPartySchema = createInsertSchema(partyTable).omit({ id: true })

export type Party = typeof partyTable.$inferSelect
export type CreateParty = z.infer<typeof createPartySchema>
