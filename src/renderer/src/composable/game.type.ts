import type { NarrationIssue } from '@shared'

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
  id: string
  role: 'master' | 'player'
  senderName: string
  timeLabel: string
  imagePath?: string
  segments: ChatSegment[]
  /** The narrator is still writing this message. */
  isStreaming?: boolean
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
  ageLabel: string
  genderLabel: string
  languageLabel: string
  cultureLabel: string
  appearance: string
  personality: string
  background: string
}
