import { defineRelations } from 'drizzle-orm'

/**
 * Relations of the relational query API (`db.query`). The keys are the names used in queries.
 * Pass the entity tables here as they are created (`defineRelations({ world: worldTable }, ...)`).
 */
export const relations = defineRelations({})
