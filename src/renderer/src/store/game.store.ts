import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Actor, Party, PointOfInterest } from '@schema'
import { toPartyMemberCard } from '@renderer/composable/game.mapper'
import type {
  CharacterSheet,
  GameChatMessage,
  GameSession,
  PartyMemberCardModel
} from '@renderer/composable/game.type'
import type { ActorSummary, NamedEntitySummary } from '@renderer/composable/world.type'

/** The campaign being played: chat, party and the dialogs opened over them. */
export const useGameStore = defineStore('game', () => {
  const session = ref<GameSession>()
  const isNotFound = ref(false)
  const messages = ref<GameChatMessage[]>([])
  const draft = ref('')
  const isSending = ref(false)
  const isAiKeyMissing = ref(false)

  const actors = ref<Actor[]>([])
  const places = ref<PointOfInterest[]>([])
  const languages = ref<NamedEntitySummary[]>([])
  const cultures = ref<NamedEntitySummary[]>([])
  /** The world's party; `undefined` until the first member joins (the engine creates it then). */
  const party = ref<Party>()
  const player = ref<PartyMemberCardModel>()
  const npcs = ref<PartyMemberCardModel[]>([])
  /** Where the party is: the place of the player, the only actor that is not an NPC. */
  const currentPlace = computed(() => {
    const placeId = actors.value.find((actor) => !actor.isNpc)?.pointOfInterestId
    return placeId ? places.value.find((place) => place.id === placeId) : undefined
  })
  /** The NPCs in the current place that are not in the party (those are shown with the party). */
  const placeNpcs = computed(() => {
    const placeId = currentPlace.value?.id
    if (!placeId) return []
    return actors.value
      .filter((actor) => actor.isNpc && !actor.partyId && actor.pointOfInterestId === placeId)
      .map(toPartyMemberCard)
  })
  const sidebarTab = ref<'party' | 'places' | 'npcs' | 'documents' | 'journal'>('party')

  const sheetOpen = ref(false)
  const selectedSheet = ref<CharacterSheet>()
  const isDeletingSheet = ref(false)
  const editOpen = ref(false)
  const editingActor = ref<ActorSummary | null>(null)
  const partyOpen = ref(false)
  const createPartyNpcOpen = ref(false)

  /** Message to play as the first turn of a campaign that was just created. */
  const pendingOpening = ref<{ worldId: string; message: string }>()

  // Closing the sheet forgets it, unless it only closed to make room for the edit dialog.
  watch(sheetOpen, (isOpen) => {
    if (!isOpen && !editOpen.value) selectedSheet.value = undefined
  })

  return {
    session,
    isNotFound,
    messages,
    draft,
    isSending,
    isAiKeyMissing,
    actors,
    places,
    currentPlace,
    placeNpcs,
    languages,
    cultures,
    party,
    player,
    npcs,
    sidebarTab,
    sheetOpen,
    selectedSheet,
    isDeletingSheet,
    editOpen,
    editingActor,
    partyOpen,
    createPartyNpcOpen,
    pendingOpening
  }
})
