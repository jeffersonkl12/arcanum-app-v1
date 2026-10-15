import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema } from '../context/game.context'
import {
  MAX_PLACES_CREATED_PER_CALL,
  placeCreationOutcomeSchema,
  placeDraftSchema
} from '../context/point-of-interest.context'

export const createPlacesTool = createTool({
  id: 'create-places',
  description:
    'Registers new places in the world, in a single call: a city, a village, a tavern, a house, a ' +
    'room. Any place may be inside another one. Give each place a `name`, a `type` (a word or ' +
    'two) and a short `description`. Put it inside an existing place with `parentId` (get ids with ' +
    '`find-places`), or inside a place created earlier in this same call with `parentIndex` (its ' +
    'position in `places`, from 0), so a tavern and its rooms go in one call; leave both out for a ' +
    'place at the top of the world. A place that fails (a parent that does not exist, say) does ' +
    'not stop the others, but one that depends on it fails too. Register only places worth tracking: ' +
    'a specific place the party will stay in or come back to (a tavern, a house, a tower, a library), ' +
    'never streets, squares, alleys or other places it merely passes through. Use it only for a place the story ' +
    'introduces and that does not exist yet: look it up with `find-places` first. Returns one ' +
    'result per place, in order, with the ids. Names are unique in the world: a name that is already ' +
    'taken is refused.',
  inputSchema: z.object({
    places: z.array(placeDraftSchema).min(1).max(MAX_PLACES_CREATED_PER_CALL)
  }),
  outputSchema: z.object({ results: z.array(placeCreationOutcomeSchema) }),
  requestContextSchema: gameContextSchema,
  execute: async ({ places }, { requestContext }) => ({
    results: await requestContext
      .get('pointOfInterestRegistry')
      .createPlaces(requestContext.get('worldId'), places)
  })
})
