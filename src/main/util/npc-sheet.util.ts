// Pure, with relative imports only: it is plain text from plain data.
import { formatRelative, type PromptRelative } from './kinship.util'

/** What the prompt shows of an NPC engaged in the scene: all of it, background included. */
export interface NpcSheet {
  id: string
  name: string
  age: string
  gender: string
  culture: string | null
  language: string | null
  profession: string | null
  appearance: string | null
  personality: string | null
  background: string | null
  hpCurrent: number
  hpMax: number
  strength: number
  dexterity: number
  intelligence: number
  strengthLevel: string
  dexterityLevel: string
  intelligenceLevel: string
  goldPieces: number
  silverPieces: number
  bronzePieces: number
  equipped: string[]
  carried: string[]
  /** What the NPC feels about the party members. */
  /** Who the NPC is kin to, closest first. */
  family: PromptRelative[]
  relationships: { targetName: string; level: string; value: number; meaning: string }[]
}

/**
 * The sheet as one prompt entry: a first line with the NPC and indented lines under it, so it reads
 * as a nested bullet when the live-context layer puts `- ` in front.
 */
export function formatNpcSheet(sheet: NpcSheet): string {
  const lines = [
    `**${sheet.name}** (id: ${sheet.id}) is engaged with the player right now`,
    `- Age: ${sheet.age}; gender: ${sheet.gender}`,
    sheet.culture && `- Culture: ${sheet.culture}`,
    sheet.language && `- Language: ${sheet.language}`,
    sheet.profession && `- Profession: ${sheet.profession}`,
    `- Health: ${sheet.hpCurrent} of ${sheet.hpMax} hit points`,
    `- Attributes (d6 rolled in a check; 4 is an average person): strength ${sheet.strength} (${sheet.strengthLevel}), dexterity ${sheet.dexterity} (${sheet.dexterityLevel}), intelligence ${sheet.intelligence} (${sheet.intelligenceLevel})`,
    `- Money: ${sheet.goldPieces} gold pieces, ${sheet.silverPieces} silver pieces, ${sheet.bronzePieces} bronze pieces`,
    sheet.appearance && `- Appearance: ${sheet.appearance}`,
    sheet.personality && `- Personality: ${sheet.personality}`,
    sheet.background && `- Background: ${sheet.background}`,
    `- Equipped: ${sheet.equipped.length > 0 ? sheet.equipped.join(', ') : 'nothing'}`,
    sheet.carried.length > 0 && `- Carrying: ${sheet.carried.join(', ')}`,
    sheet.family.length > 0 &&
      `- Family (fixed by the world; never contradict it; name, bond, age, id): ${sheet.family.map(formatRelative).join('; ')}`,
    ...(sheet.relationships.length > 0
      ? [
          '- Feels about the party (-100 hatred to 100 devotion, 0 indifferent):',
          ...sheet.relationships.map(
            (feeling) =>
              `  - ${feeling.targetName}: ${feeling.level}, ${feeling.value} (${feeling.meaning})`
          )
        ]
      : [])
  ]

  return lines
    .filter((line): line is string => Boolean(line))
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join('\n')
}

/** Lowercase without accents, so "Íris" in a message matches the NPC "Iris". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * Whether the message names the NPC: its full name, or any word of it with at least 3 letters (so
 * "Elara" finds "Elara Moonwhisper", while "of" or "de" in a name never does).
 */
export function mentionsName(message: string, name: string): boolean {
  const text = normalize(message)
  const full = normalize(name)

  return (
    text.includes(full) ||
    full
      .split(/\s+/)
      .filter((word) => word.length >= 3)
      .some((word) => text.includes(word))
  )
}
