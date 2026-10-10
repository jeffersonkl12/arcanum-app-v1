import type { Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import type { Actor, Party } from '@schema'
import type { NarrationSegment } from '@shared'
import { appendNarrationDelta } from '@renderer/util/narration.util'
import { useCampaign } from './campaign.composable'
import {
  formatMessageTime,
  proseToChatSegments,
  toChatSegments,
  toCharacterSheet,
  toGameChatMessage,
  toPartyMemberCard
} from './game.mapper'
import type {
  CharacterSheet,
  GameChatMessage,
  GameSession,
  PartyMemberCardModel
} from './game.type'
import { useRequest } from './request.composable'
import { useTurnStream } from './turn-stream.composable'
import { toActorSummary, toNamedEntitySummary } from './world.mapper'
import { useWorld } from './world.composable'
import type { ActorSummary } from './world.type'
import { useGameStore } from '@renderer/store/game.store'

const DEFAULT_PLAYER_NAME = 'Jogador'

export function useGame(): {
  session: Ref<GameSession | undefined>
  isNotFound: Ref<boolean>
  messages: Ref<GameChatMessage[]>
  player: Ref<PartyMemberCardModel | undefined>
  npcs: Ref<PartyMemberCardModel[]>
  draft: Ref<string>
  sidebarTab: Ref<'party' | 'journal'>
  sheetOpen: Ref<boolean>
  selectedSheet: Ref<CharacterSheet | undefined>
  editOpen: Ref<boolean>
  editingActor: Ref<ActorSummary | null>
  isLoading: Ref<boolean>
  isSending: Ref<boolean>
  isDeletingSheet: Ref<boolean>
  isAiKeyMissing: Ref<boolean>
  loadGame: (worldId: string) => Promise<void>
  sendMessage: (text?: string) => Promise<void>
  playPendingOpening: () => Promise<void>
  openCharacterSheet: (actorId: string) => void
  closeCharacterSheet: () => void
  deleteSelectedCharacter: () => Promise<void>
  requestEditCharacter: () => Promise<void>
  applyCharacterSaved: () => Promise<void>
} {
  const store = useGameStore()
  const {
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
  } = storeToRefs(store)

  const { isLoading, request, execute } = useRequest()
  const { streamTurn } = useTurnStream()
  const { loadWorld } = useWorld()
  const { rememberCampaign } = useCampaign()

  /** The player is the actor that is not an NPC; the party is whoever the engine says belongs to it. */
  function applyParty(actorList: Actor[], party: Party | undefined): void {
    const playerActor = actorList.find((actor) => !actor.isNpc)
    actors.value = actorList
    player.value = playerActor ? toPartyMemberCard(playerActor) : undefined
    npcs.value = actorList
      .filter((actor) => actor.isNpc && party !== undefined && actor.partyId === party.id)
      .map(toPartyMemberCard)

    if (session.value) {
      session.value = {
        ...session.value,
        playerName: playerActor?.name ?? DEFAULT_PLAYER_NAME,
        playerImagePath: playerActor?.imagePath ?? undefined
      }
    }
  }

  /** Reads party and actors again, e.g. after a turn, because the narrator can create NPCs. */
  async function refreshParty(worldId: string): Promise<void> {
    const [party, actorList] = await Promise.all([
      request('party:findByWorld', worldId),
      request('actor:listByWorld', worldId)
    ])
    if (actorList && session.value?.worldId === worldId) applyParty(actorList, party)
  }

  function clearGame(): void {
    session.value = undefined
    messages.value = []
    actors.value = []
    player.value = undefined
    npcs.value = []
  }

  async function loadGame(worldId: string): Promise<void> {
    // A turn that is still being written belongs to this very state; reading history now would
    // wipe it.
    if (isSending.value && session.value?.worldId === worldId) return

    isNotFound.value = false
    const world = await request('world:get', worldId)
    if (!world) {
      clearGame()
      isNotFound.value = true
      return
    }

    const [history, party, actorList, languageList, cultureList, aiSetting] = await Promise.all([
      request('gameMaster:listHistory', worldId),
      request('party:findByWorld', worldId),
      request('actor:listByWorld', worldId),
      request('language:listByWorld', worldId),
      request('culture:listByWorld', worldId),
      request('aiSetting:get')
    ])

    const loadedActors = actorList ?? []
    const playerActor = loadedActors.find((actor) => !actor.isNpc)
    const playerName = playerActor?.name ?? DEFAULT_PLAYER_NAME
    const playerImagePath = playerActor?.imagePath ?? undefined

    session.value = { worldId, worldName: world.name, playerName, playerImagePath }
    languages.value = (languageList ?? []).map(toNamedEntitySummary)
    cultures.value = (cultureList ?? []).map(toNamedEntitySummary)
    isAiKeyMissing.value = aiSetting !== undefined && !aiSetting.apiKey.configured
    applyParty(loadedActors, party)
    messages.value = (history ?? []).map((message) =>
      toGameChatMessage(message, playerName, playerImagePath)
    )
    rememberCampaign(worldId)
  }

  /**
   * Plays a turn: the player's text goes to the narrator and its reply is shown as it is written.
   * Without `text`, the draft of the composer is sent. The engine rolls the dice and decides what
   * happens; this only shows it.
   */
  async function sendMessage(text?: string): Promise<void> {
    const current = session.value
    const message = (text ?? draft.value).trim()
    if (!current || message.length === 0 || isSending.value) return

    if (text === undefined) draft.value = ''
    isSending.value = true

    const now = new Date()
    const playerMessage: GameChatMessage = {
      id: `local-player-${now.getTime()}`,
      role: 'player',
      senderName: current.playerName,
      timeLabel: formatMessageTime(now),
      imagePath: current.playerImagePath,
      segments: proseToChatSegments(message)
    }
    const masterMessage: GameChatMessage = {
      id: `local-master-${now.getTime()}`,
      role: 'master',
      senderName: 'Mestre',
      timeLabel: formatMessageTime(now),
      segments: [],
      isStreaming: true
    }
    messages.value = [...messages.value, playerMessage, masterMessage]

    function updateMaster(patch: Partial<GameChatMessage>): void {
      const target = messages.value.find((item) => item.id === masterMessage.id)
      if (target) Object.assign(target, patch)
    }

    const written: NarrationSegment[] = []
    let failed = false
    try {
      await streamTurn(
        { worldId: current.worldId, message },
        {
          onDelta: (event) => {
            appendNarrationDelta(written, event)
            updateMaster({ segments: toChatSegments(written) })
          },
          // Final segments replace the accumulated ones: they are trimmed and validated.
          onDone: (event) =>
            updateMaster({ segments: toChatSegments(event.segments), isStreaming: false }),
          onError: () => {
            failed = true
          }
        }
      )

      if (failed) {
        // The turn is not in the campaign memory, so it is not in the chat either.
        messages.value = messages.value.filter(
          (item) => item.id !== playerMessage.id && item.id !== masterMessage.id
        )
        if (draft.value.length === 0) draft.value = message
        return
      }
      await refreshParty(current.worldId)
    } finally {
      isSending.value = false
    }
  }

  /** The first turn of a campaign that was just created, if the wizard left one. */
  async function playPendingOpening(): Promise<void> {
    const opening = pendingOpening.value
    if (!opening || opening.worldId !== session.value?.worldId) return

    pendingOpening.value = undefined
    await sendMessage(opening.message)
  }

  function openCharacterSheet(actorId: string): void {
    const actor = actors.value.find((item) => item.id === actorId)
    if (!actor) {
      toast.error('Personagem não encontrado')
      return
    }

    selectedSheet.value = toCharacterSheet(actor, languages.value, cultures.value)
    sheetOpen.value = true
  }

  function closeCharacterSheet(): void {
    sheetOpen.value = false
    selectedSheet.value = undefined
  }

  async function deleteSelectedCharacter(): Promise<void> {
    const sheet = selectedSheet.value
    const worldId = session.value?.worldId
    if (!sheet || !worldId || isDeletingSheet.value) return

    isDeletingSheet.value = true
    try {
      if (!(await execute('actor:delete', sheet.id))) return
      await refreshParty(worldId)
      closeCharacterSheet()
      toast.success('Personagem removido')
    } finally {
      isDeletingSheet.value = false
    }
  }

  /** The edit dialog works on the open world's lists, so they are loaded before it opens. */
  async function requestEditCharacter(): Promise<void> {
    const sheet = selectedSheet.value
    const worldId = session.value?.worldId
    if (!sheet || !worldId || isDeletingSheet.value) return

    const actor = actors.value.find((item) => item.id === sheet.id)
    if (!actor) return

    await loadWorld(worldId)
    editingActor.value = toActorSummary(actor, cultures.value)
    sheetOpen.value = false
    editOpen.value = true
  }

  async function applyCharacterSaved(): Promise<void> {
    const worldId = session.value?.worldId
    if (worldId) await refreshParty(worldId)
  }

  return {
    session,
    isNotFound,
    messages,
    player,
    npcs,
    draft,
    sidebarTab,
    sheetOpen,
    selectedSheet,
    editOpen,
    editingActor,
    isLoading,
    isSending,
    isDeletingSheet,
    isAiKeyMissing,
    loadGame,
    sendMessage,
    playPendingOpening,
    openCharacterSheet,
    closeCharacterSheet,
    deleteSelectedCharacter,
    requestEditCharacter,
    applyCharacterSaved
  }
}
