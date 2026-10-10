import type { Actor } from '@schema'
import type { IpcOutput } from '@shared'
import type { ChatSegment, GameChatMessage, PartyMemberCardModel } from './game.type'

type CampaignMessage = IpcOutput<'gameMaster:listHistory'>[number]

export function formatMessageTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

export function toChatSegments(text: string): ChatSegment[] {
  const trimmed = text.trim()
  if (trimmed.length === 0) return []

  const parts = trimmed
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.map((part) => {
    const isDialogue = /^[“"«']/.test(part) || /[—–-]\s*$/.test(part) || /[“"].*[”"]/.test(part)
    return {
      kind: isDialogue ? 'dialogue' : 'narration',
      text: part
    }
  })
}

export function toGameChatMessage(
  message: CampaignMessage,
  playerName: string,
  playerImagePath?: string
): GameChatMessage {
  const isPlayer = message.role === 'user'
  return {
    id: message.id,
    role: isPlayer ? 'player' : 'master',
    senderName: isPlayer ? playerName : 'Mestre',
    timeLabel: formatMessageTime(message.createdAt),
    imagePath: isPlayer ? playerImagePath : undefined,
    segments: toChatSegments(message.text)
  }
}

export function toPartyMemberCard(
  actor: Actor,
  hpCurrent: number,
  hpMax: number
): PartyMemberCardModel {
  const cultureBits = [actor.profession].filter((value): value is string => Boolean(value?.trim()))
  return {
    id: actor.id,
    name: actor.name,
    roleLabel: cultureBits.join(' • ') || (actor.isNpc ? 'NPC' : 'Jogador'),
    imagePath: actor.imagePath ?? undefined,
    hpCurrent,
    hpMax
  }
}

export function hpPercent(current: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((current / max) * 100)))
}

export function isCriticalHp(current: number, max: number): boolean {
  return max > 0 && current / max <= 0.35
}
