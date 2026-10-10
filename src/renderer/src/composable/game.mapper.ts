import type { Actor } from '@schema'
import type { IpcOutput } from '@shared'
import { actorAgeOptions, actorGenderOptions } from '@renderer/constant/actor.constant'
import type {
  CharacterSheet,
  ChatSegment,
  GameChatMessage,
  PartyMemberCardModel
} from './game.type'
import type { ActorSummary, NamedEntitySummary } from './world.type'

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

export function actorAgeLabel(age: Actor['age']): string {
  return actorAgeOptions.find((option) => option.value === age)?.label ?? age
}

export function actorGenderLabel(gender: Actor['gender']): string {
  return actorGenderOptions.find((option) => option.value === gender)?.label ?? gender
}

export function toCharacterSheet(
  actor: Actor,
  hpCurrent: number,
  hpMax: number,
  languageName?: string,
  cultureName?: string
): CharacterSheet {
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
    hpCurrent,
    hpMax,
    ageLabel: actorAgeLabel(actor.age),
    genderLabel: actorGenderLabel(actor.gender),
    languageLabel: languageName?.trim() || '—',
    cultureLabel: cultureName?.trim() || '—',
    appearance: actor.appearance?.trim() || '—',
    personality: actor.personality?.trim() || '—',
    background: actor.background?.trim() || '—'
  }
}

function displayToForm(value: string): string {
  return value === '—' ? '' : value
}

function resolveNamedId(label: string, items: NamedEntitySummary[]): string | undefined {
  const trimmed = displayToForm(label).trim()
  if (!trimmed) return undefined
  const exact = items.find((item) => item.name === trimmed)
  if (exact) return exact.id
  const first = trimmed.split(',')[0]?.trim()
  return items.find((item) => item.name === first)?.id
}

/** Rebuilds an edit form model from a sheet when only labels are available (mock party). */
export function characterSheetToActorSummary(
  sheet: CharacterSheet,
  languages: NamedEntitySummary[],
  cultures: NamedEntitySummary[]
): ActorSummary {
  const profession = sheet.roleLabel.split('•')[0]?.trim() ?? ''
  const age =
    actorAgeOptions.find((option) => option.label === sheet.ageLabel)?.value ?? 'young_adult'
  const gender =
    actorGenderOptions.find((option) => option.label === sheet.genderLabel)?.value ?? 'male'

  return {
    id: sheet.id,
    name: sheet.name,
    subtitle: sheet.roleLabel,
    imagePath: sheet.imagePath,
    profession,
    age,
    gender,
    languageId: resolveNamedId(sheet.languageLabel, languages) ?? null,
    cultureId: resolveNamedId(sheet.cultureLabel, cultures) ?? null,
    appearance: displayToForm(sheet.appearance),
    personality: displayToForm(sheet.personality),
    background: displayToForm(sheet.background)
  }
}

export function actorSummaryToCharacterSheet(
  actor: ActorSummary,
  hpCurrent: number,
  hpMax: number,
  options: {
    badgeLabel: string
    isNpc: boolean
    languageName?: string
    cultureName?: string
  }
): CharacterSheet {
  return {
    id: actor.id,
    name: actor.name,
    roleLabel: actor.subtitle,
    badgeLabel: options.badgeLabel,
    isNpc: options.isNpc,
    imagePath: actor.imagePath ?? undefined,
    hpCurrent,
    hpMax,
    ageLabel: actorAgeLabel(actor.age),
    genderLabel: actorGenderLabel(actor.gender),
    languageLabel: options.languageName?.trim() || '—',
    cultureLabel: options.cultureName?.trim() || '—',
    appearance: actor.appearance?.trim() || '—',
    personality: actor.personality?.trim() || '—',
    background: actor.background?.trim() || '—'
  }
}
