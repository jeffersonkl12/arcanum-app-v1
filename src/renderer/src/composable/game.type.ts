export type ChatSegmentKind = 'narration' | 'dialogue'

export interface ChatSegment {
  kind: ChatSegmentKind
  text: string
}

export interface GameChatMessage {
  id: string
  role: 'master' | 'player'
  senderName: string
  timeLabel: string
  imagePath?: string
  segments: ChatSegment[]
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
