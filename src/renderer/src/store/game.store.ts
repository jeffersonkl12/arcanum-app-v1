import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Actor } from '@schema'
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
  const languages = ref<NamedEntitySummary[]>([])
  const cultures = ref<NamedEntitySummary[]>([])
  const player = ref<PartyMemberCardModel>()
  const npcs = ref<PartyMemberCardModel[]>([])
  const sidebarTab = ref<'party' | 'journal'>('party')

  const sheetOpen = ref(false)
  const selectedSheet = ref<CharacterSheet>()
  const isDeletingSheet = ref(false)
  const editOpen = ref(false)
  const editingActor = ref<ActorSummary | null>(null)

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
    languages,
    cultures,
    player,
    npcs,
    sidebarTab,
    sheetOpen,
    selectedSheet,
    isDeletingSheet,
    editOpen,
    editingActor,
    pendingOpening
  }
})
