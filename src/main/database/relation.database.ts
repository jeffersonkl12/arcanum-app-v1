import { actorTable, cultureTable, languageTable, partyTable, worldTable } from '@database/entity'
import { defineRelations } from 'drizzle-orm'

/**
 * Relations of the relational query API (`db.query`). The keys are the names used in queries.
 * Everything hangs from `world`; the foreign keys between the other entities also enforce that
 * both sides belong to the same world.
 */
export const relations = defineRelations(
  {
    world: worldTable,
    actor: actorTable,
    culture: cultureTable,
    language: languageTable,
    party: partyTable
  },
  (r) => ({
    world: {
      actors: r.many.actor({ from: r.world.id, to: r.actor.worldId }),
      cultures: r.many.culture({ from: r.world.id, to: r.culture.worldId }),
      languages: r.many.language({ from: r.world.id, to: r.language.worldId }),
      party: r.one.party({ from: r.world.id, to: r.party.worldId })
    },
    actor: {
      world: r.one.world({ from: r.actor.worldId, to: r.world.id, optional: false }),
      culture: r.one.culture({ from: r.actor.cultureId, to: r.culture.id }),
      language: r.one.language({ from: r.actor.languageId, to: r.language.id }),
      party: r.one.party({ from: r.actor.partyId, to: r.party.id })
    },
    culture: {
      world: r.one.world({ from: r.culture.worldId, to: r.world.id, optional: false }),
      actors: r.many.actor({ from: r.culture.id, to: r.actor.cultureId })
    },
    language: {
      world: r.one.world({ from: r.language.worldId, to: r.world.id, optional: false }),
      actors: r.many.actor({ from: r.language.id, to: r.actor.languageId })
    },
    party: {
      world: r.one.world({ from: r.party.worldId, to: r.world.id, optional: false }),
      members: r.many.actor({ from: r.party.id, to: r.actor.partyId })
    }
  })
)
