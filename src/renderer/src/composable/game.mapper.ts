import type { Actor } from '@schema'
import type { IpcOutput, NarrationSegment } from '@shared'
import { actorAgeOptions, actorGenderOptions } from '@renderer/constant/actor.constant'
import type {
  CharacterSheet,
  ChatSegment,
  GameChatMessage,
  PartyMemberCardModel
} from './game.type'
import type { NamedEntitySummary } from './world.type'

type CampaignMessage = IpcOutput<'gameMaster:listHistory'>[number]

export function formatMessageTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

/** Splits plain prose into paragraphs; a paragraph that quotes or is spoken is a dialogue. */
export function proseToChatSegments(text: string): ChatSegment[] {
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

/**
 * The blocks of a narrator reply, in the order it was written: prose goes through
 * `proseToChatSegments`, a UI block stays whole for the OpenUI renderer. Never both over the same
 * text.
 */
export function toChatSegments(segments: NarrationSegment[]): ChatSegment[] {
  return segments.flatMap((segment): ChatSegment[] =>
    segment.type === 'prose'
      ? proseToChatSegments(segment.text)
      : [{ kind: 'ui', source: segment.source, issues: segment.issues }]
  )
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
    segments: isPlayer ? proseToChatSegments(message.text) : toChatSegments(message.segments)
  }
}

export function toPartyMemberCard(actor: Actor): PartyMemberCardModel {
  return {
    id: actor.id,
    name: actor.name,
    roleLabel: actor.profession?.trim() || (actor.isNpc ? 'NPC' : 'Jogador'),
    imagePath: actor.imagePath ?? undefined,
    hpCurrent: actor.hpCurrent,
    hpMax: actor.hpMax
  }
}

export function hpPercent(current: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((current / max) * 100)))
}

export function isCriticalHp(current: number, max: number): boolean {
  return max > 0 && current / max <= 0.35
}

export function actorAgeLabel(age: Actor['age']): string {
  return actorAgeOptions.find((option) => option.value === age)?.label ?? age
}

export function actorGenderLabel(gender: Actor['gender']): string {
  return actorGenderOptions.find((option) => option.value === gender)?.label ?? gender
}

export function toCharacterSheet(
  actor: Actor,
  languages: NamedEntitySummary[],
  cultures: NamedEntitySummary[]
): CharacterSheet {
  const languageName = languages.find((item) => item.id === actor.languageId)?.name
  const cultureName = cultures.find((item) => item.id === actor.cultureId)?.name
  const roleBits = [actor.profession?.trim(), cultureName].filter((value): value is string =>
    Boolean(value)
  )

  return {
    id: actor.id,
    name: actor.name,
    roleLabel: roleBits.join(' • ') || (actor.isNpc ? 'NPC' : 'Jogador'),
    badgeLabel: actor.isNpc ? 'NPC' : 'JOGADOR',
    isNpc: actor.isNpc,
    imagePath: actor.imagePath ?? undefined,
    hpCurrent: actor.hpCurrent,
    hpMax: actor.hpMax,
    ageLabel: actorAgeLabel(actor.age),
    genderLabel: actorGenderLabel(actor.gender),
    languageLabel: languageName?.trim() || '—',
    cultureLabel: cultureName?.trim() || '—',
    appearance: actor.appearance?.trim() || '—',
    personality: actor.personality?.trim() || '—',
    background: actor.background?.trim() || '—'
  }
}
