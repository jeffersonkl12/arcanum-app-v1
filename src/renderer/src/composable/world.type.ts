import type { CreateActor, CreateItem } from '@schema'
import type { ItemType } from '@renderer/constant/item.constant'

export interface WorldSummary {
  id: string
  name: string
  description: string
  genre: string
  imagePath?: string | null
  campaignCount: number
}

export interface WorldDetail {
  id: string
  isTemplate: boolean
  name: string
  description: string
  genre: string
  imagePath?: string | null
}

export interface ActorSummary {
  id: string
  name: string
  subtitle: string
  imagePath?: string | null
  profession: string
  age: CreateActor['age']
  gender: CreateActor['gender']
  languageId?: string | null
  cultureId?: string | null
  appearance: string
  personality: string
  background: string
  hpCurrent: number
  hpMax: number
  strength: number
  dexterity: number
  intelligence: number
  goldPieces: number
  silverPieces: number
  bronzePieces: number
}

export interface NamedEntitySummary {
  id: string
  name: string
  description: string
}

export interface ItemSummary {
  id: string
  name: string
  description: string
  imagePath?: string | null
  type: ItemType
  slots: number
  weaponClass: CreateItem['weaponClass']
  clothingClass: CreateItem['clothingClass']
  /** Short labels for the row and the detail ("Arma", "Leve (uma mão)"...). */
  tags: string[]
  isCarried: boolean
  isEquipped: boolean
}

export type WorldEntityTab = 'npcs' | 'languages' | 'cultures' | 'items'
