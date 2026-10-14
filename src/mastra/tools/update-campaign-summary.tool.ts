import { createTool } from '@mastra/core/tools'
import { gameContextSchema } from '../context/game.context'
import {
  campaignSummaryChangeSchema,
  campaignSummaryOutcomeSchema
} from '../context/campaign.context'

export const updateCampaignSummaryTool = createTool({
  id: 'update-campaign-summary',
  description:
    'Records in the campaign summary (the "Knowledge and info" section of your prompt) a MAJOR event ' +
    'of the plot: a big deal struck, a betrayal uncovered, a conspiracy revealed, a ruined or won ' +
    'fortune, a death, a faction turned friend or foe, a goal reached or abandoned. It is the ' +
    'long-term thread of the whole story, which must stay coherent through days of travel and small ' +
    'quests. Do NOT use it for scenes, routine actions, travel, side quests or anything that changes ' +
    'nothing in the big picture (memories and the conversation cover those). Use action "append" ' +
    'with the new events, as short facts, oldest first; it never touches what is already recorded. ' +
    'Only when the engine answers that the summary is full, call again with action "rewrite" and ' +
    'the whole summary condensed, keeping every major event. Returns whether it worked, the length ' +
    'now and the room left.',
  inputSchema: campaignSummaryChangeSchema,
  outputSchema: campaignSummaryOutcomeSchema,
  requestContextSchema: gameContextSchema,
  execute: async (change, { requestContext }) =>
    requestContext.get('campaignRegistry').updateSummary(requestContext.get('worldId'), change)
})
