import type { CreateActor, CreateItem } from '@schema'
import type { ItemKind } from '@renderer/constant/item.constant'

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
  kind: ItemKind
  isTiny: boolean
  slots: number
  isConsumable: boolean
  weaponClass: CreateItem['weaponClass']
  damageDie: CreateItem['damageDie']
  wearSlot: CreateItem['wearSlot']
  armorBonus: number | null
  /** Short labels for the row and the detail ("Arma leve • d6", "Consumível"...). */
  tags: string[]
  isCarried: boolean
  isEquipped: boolean
}

export type WorldEntityTab = 'npcs' | 'languages' | 'cultures' | 'items'
