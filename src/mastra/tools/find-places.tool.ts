import { createTool } from '@mastra/core/tools'
import { gameContextSchema } from '../context/game.context'
import { placeQuerySchema, placeSearchSchema } from '../context/point-of-interest.context'

export const findPlacesTool = createTool({
  id: 'find-places',
  description:
    'Looks up the places of the world (cities, villages, buildings, rooms: any place may be inside ' +
    'another) and returns their ids, type, description, where they sit (`path`, from the top down) ' +
    'and the actors directly in them. Search by `name` (part of it is enough), by `parentId` for ' +
    'what is inside a place, by exact `placeId`, or by `actorId` to learn where an actor is. With ' +
    'no filter it returns the places at the top of the world. Use it to get the id before moving ' +
    'someone, or to check what a place holds. It never creates or changes places.',
  inputSchema: placeQuerySchema,
  outputSchema: placeSearchSchema,
  requestContextSchema: gameContextSchema,
  execute: async (query, { requestContext }) =>
    requestContext.get('pointOfInterestRegistry').findPlaces(requestContext.get('worldId'), query)
})
