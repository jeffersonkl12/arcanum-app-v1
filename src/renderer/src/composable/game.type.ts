import type { NarrationIssue } from '@shared'
import type { ActorAttributes, ActorCoins } from '@renderer/constant/actor.constant'

export type ChatSegmentKind = 'narration' | 'dialogue'

/**
 * One block of a chat message: a plain paragraph (the player's), the narrator's prose as Markdown,
 * or a UI block the narrator wrote.
 */
export type ChatSegment =
  | { kind: ChatSegmentKind; text: string }
  | { kind: 'markdown'; text: string }
  | { kind: 'ui'; source: string; issues: NarrationIssue[] }

export interface GameChatMessage {
  /** The id in the campaign. A message just played is `local-*` until the history is read again. */
  id: string
  /** Identity in the list: it does not change when `id` does, so the message is not redrawn. */
  key: string
  role: 'master' | 'player'
  senderName: string
  timeLabel: string
  imagePath?: string
  segments: ChatSegment[]
  /** The narrator is still writing this message. */
  isStreaming?: boolean
  /** What the player thought of this reply: `1` up, `-1` down. */
  rating?: 1 | -1 | null
  /** The last reply, from a turn that changed nothing in the game, so it can be written again. */
  canRegenerate?: boolean
}

export interface PartyMemberCardModel {
  id: string
  name: string
  roleLabel: string
  imagePath?: string
  hpCurrent: number
  hpMax: number
}

export interface GameSession {
  worldId: string
  worldName: string
  playerName: string
  playerImagePath?: string
}

export interface CharacterSheet {
  id: string
  name: string
  roleLabel: string
  badgeLabel: string
  isNpc: boolean
  imagePath?: string
  hpCurrent: number
  hpMax: number
  attributes: ActorAttributes
  coins: ActorCoins
  ageLabel: string
  genderLabel: string
  languageLabel: string
  cultureLabel: string
  appearance: string
  personality: string
  background: string
}
