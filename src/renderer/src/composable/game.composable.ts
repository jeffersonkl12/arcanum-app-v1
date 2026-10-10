import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { Actor } from '@schema'
import { useRequest } from '@renderer/composable/request.composable'
import { useWorld } from '@renderer/composable/world.composable'
import { toActorSummary } from '@renderer/composable/world.mapper'
import type { ActorSummary } from '@renderer/composable/world.type'
import {
  actorSummaryToCharacterSheet,
  characterSheetToActorSummary,
  formatMessageTime,
  toCharacterSheet,
  toGameChatMessage,
  toPartyMemberCard
} from '@renderer/composable/game.mapper'
import type {
  CharacterSheet,
  GameChatMessage,
  GameSession,
  PartyMemberCardModel
} from '@renderer/composable/game.type'
import { toast } from 'vue-sonner'

function isEngineWorldId(worldId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(worldId)
}

// Proposed: actor/combat HP is not in ipcContract yet. Light VTT panel uses mock vitals.
const mockHpByName: Record<string, { current: number; max: number }> = {
  'Rian Thorne': { current: 32, max: 40 },
  'Elara Moonwhisper': { current: 18, max: 20 },
  'Thorek Ironbrow': { current: 40, max: 40 },
  'Vaelin o Silencioso': { current: 10, max: 30 }
}

const mockMessages: GameChatMessage[] = [
  {
    id: 'mock-master-1',
    role: 'master',
    senderName: 'Mestre',
    timeLabel: '19:42',
    segments: [
      {
        kind: 'narration',
        text: 'O vento frio corta entre as torres flutuantes de Sylaris enquanto vocês avançam pelo cais de pedra suspenso. Abaixo, nuvens cobrem a cidade como um mar branco e distante.'
      },
      {
        kind: 'dialogue',
        text: '“Alto lá! Ninguém atravessa o portão sem o selo do Arquiteto” — grita um guarda do alto da muralha.'
      },
      {
        kind: 'narration',
        text: 'Dois guardas descem lentamente a escada de corda, lanças em punho, observando o grupo com desconfiança.'
      }
    ]
  },
  {
    id: 'mock-player-1',
    role: 'player',
    senderName: 'Rian Thorne',
    timeLabel: '19:43',
    segments: [
      {
        kind: 'dialogue',
        text: '“Somos viajantes em missão da Guilda dos Cartógrafos. Temos uma carta de recomendação” — responde Rian, erguendo um pergaminho selado.'
      }
    ]
  },
  {
    id: 'mock-master-2',
    role: 'master',
    senderName: 'Mestre',
    timeLabel: '19:44',
    segments: [
      {
        kind: 'narration',
        text: 'O guarda examina o pergaminho por um longo instante, girando-o contra a luz para verificar o selo de cera.'
      },
      {
        kind: 'dialogue',
        text: '“Selo autêntico... mas isso não significa que o Arquiteto vai recebê-los” — murmura ele, devolvendo o documento.'
      },
      {
        kind: 'narration',
        text: 'Ele aponta para Elara, uma das NPCs do grupo, com um olhar reconhecedor.'
      },
      {
        kind: 'dialogue',
        text: '“Você... eu já vi seu rosto nos arquivos da Torre. Arquimaga, certo?”'
      }
    ]
  },
  {
    id: 'mock-player-2',
    role: 'player',
    senderName: 'Rian Thorne',
    timeLabel: '19:45',
    segments: [
      {
        kind: 'dialogue',
        text: '“Isso mesmo. E eu garanto que o Arquiteto vai querer nos ouvir” — diz Rian, sustentando o olhar do guarda.'
      }
    ]
  }
]

const mockParty: { player: PartyMemberCardModel; npcs: PartyMemberCardModel[] } = {
  player: {
    id: 'mock-player',
    name: 'Rian Thorne',
    roleLabel: 'Patrulheiro • Humano',
    hpCurrent: 32,
    hpMax: 40
  },
  npcs: [
    {
      id: 'mock-elara',
      name: 'Elara Moonwhisper',
      roleLabel: 'Arquimaga • Elfa',
      hpCurrent: 18,
      hpMax: 20
    },
    {
      id: 'mock-thorek',
      name: 'Thorek Ironbrow',
      roleLabel: 'Capitão da Guarda • Anão',
      hpCurrent: 40,
      hpMax: 40
    },
    {
      id: 'mock-vaelin',
      name: 'Vaelin o Silencioso',
      roleLabel: 'Informante • Humano',
      hpCurrent: 10,
      hpMax: 30
    }
  ]
}

// Proposed: mock sheets fill the character modal until actor:get is available for the session.
const mockSheets: Record<string, CharacterSheet> = {
  'mock-player': {
    id: 'mock-player',
    name: 'Rian Thorne',
    roleLabel: 'Patrulheiro • Humano',
    badgeLabel: 'JOGADOR',
    isNpc: false,
    hpCurrent: 32,
    hpMax: 40,
    ageLabel: 'Jovem adulto',
    genderLabel: 'Masculino',
    languageLabel: 'Comum, Silvano',
    cultureLabel: 'Vale de Sylaris',
    appearance:
      'Cabelos castanhos curtos, cicatriz na sobrancelha esquerda, veste um casaco de couro de patrulheiro com insígnias da Guilda dos Cartógrafos.',
    personality:
      'Observador e cauteloso, mas leal aos companheiros. Prefere negociar antes de lutar, porém não hesita quando é necessário.',
    background:
      'Cresceu nas estradas entre as cidades flutuantes, mapeando rotas seguras para caravanas. Busca redescobrir rotas perdidas que ligavam Sylaris ao solo antes da Grande Ascensão.'
  },
  'mock-elara': {
    id: 'mock-elara',
    name: 'Elara Moonwhisper',
    roleLabel: 'Arquimaga • Elfa',
    badgeLabel: 'NPC',
    isNpc: true,
    hpCurrent: 18,
    hpMax: 20,
    ageLabel: 'Adulto',
    genderLabel: 'Feminino',
    languageLabel: 'Élfico, Comum',
    cultureLabel: 'Torre de Sylaris',
    appearance: 'Cabelos prateados longos, olhos âmbar e vestes azuis com runas sutis.',
    personality: 'Erudita e reservada, com humor seco quando a tensão baixa.',
    background: 'Arquivista da Torre que acompanha o grupo em busca de selos antigos.'
  },
  'mock-thorek': {
    id: 'mock-thorek',
    name: 'Thorek Ironbrow',
    roleLabel: 'Capitão da Guarda • Anão',
    badgeLabel: 'NPC',
    isNpc: true,
    hpCurrent: 40,
    hpMax: 40,
    ageLabel: 'Meia-idade',
    genderLabel: 'Masculino',
    languageLabel: 'Anão, Comum',
    cultureLabel: 'Guarda Aérea',
    appearance: 'Barba trançada com anéis de ferro e armadura reforçada nos ombros.',
    personality: 'Direto, protetor e pouco paciente com enrolação.',
    background: 'Veterano da Guarda Aérea designado para escoltar a expedição.'
  },
  'mock-vaelin': {
    id: 'mock-vaelin',
    name: 'Vaelin o Silencioso',
    roleLabel: 'Informante • Humano',
    badgeLabel: 'NPC',
    isNpc: true,
    hpCurrent: 10,
    hpMax: 30,
    ageLabel: 'Jovem adulto',
    genderLabel: 'Masculino',
    languageLabel: 'Comum',
    cultureLabel: 'Guilda das Sombras',
    appearance: 'Capuz escuro, passos leves e olhar sempre atento às saídas.',
    personality: 'Fala pouco e observa muito; lealdade negociável, mas útil.',
    background: 'Informante da guilda que conhece atalhos e segredos da cidade.'
  }
}

const session = ref<GameSession>()
const messages = ref<GameChatMessage[]>([])
const player = ref<PartyMemberCardModel>()
const npcs = ref<PartyMemberCardModel[]>([])
const draft = ref('')
const sidebarTab = ref<'party' | 'journal'>('party')
const isSending = ref(false)
const sheetOpen = ref(false)
const selectedSheet = ref<CharacterSheet>()
const isSheetLoading = ref(false)
const isDeletingSheet = ref(false)
const editOpen = ref(false)
const editingActor = ref<ActorSummary | null>(null)

watch(sheetOpen, (open) => {
  if (!open && !editOpen.value) selectedSheet.value = undefined
})

function resolveHp(actor: Actor): { current: number; max: number } {
  const named = mockHpByName[actor.name]
  if (named) return named
  // Proposed: default vitals until the engine exposes combat stats.
  return actor.isNpc ? { current: 20, max: 20 } : { current: 40, max: 40 }
}

function applyMockSession(worldId: string, worldName: string): void {
  session.value = {
    worldId,
    worldName,
    playerName: mockParty.player.name,
    playerImagePath: mockParty.player.imagePath
  }
  messages.value = mockMessages.map((message) => ({
    ...message,
    senderName: message.role === 'player' ? mockParty.player.name : message.senderName,
    segments: message.segments.map((segment) => ({ ...segment }))
  }))
  player.value = { ...mockParty.player }
  npcs.value = mockParty.npcs.map((npc) => ({ ...npc }))
}

export function useGame(): {
  session: Ref<GameSession | undefined>
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
  isSheetLoading: Ref<boolean>
  isDeletingSheet: Ref<boolean>
  canSend: ComputedRef<boolean>
  loadGame: (worldId: string) => Promise<void>
  sendMessage: () => Promise<void>
  openCharacterSheet: (actorId: string) => Promise<void>
  closeCharacterSheet: () => void
  deleteSelectedCharacter: () => Promise<void>
  requestEditCharacter: () => Promise<void>
  applyCharacterSaved: (actor: ActorSummary) => Promise<void>
} {
  const { isLoading, error, request } = useRequest()
  const { loadWorld, languages, cultures } = useWorld()

  const canSend = computed(
    () => draft.value.trim().length > 0 && !isSending.value && !isLoading.value
  )

  function closeCharacterSheet(): void {
    sheetOpen.value = false
    selectedSheet.value = undefined
  }

  async function openCharacterSheet(actorId: string): Promise<void> {
    sheetOpen.value = true
    isSheetLoading.value = true
    selectedSheet.value = undefined

    try {
      const mock = mockSheets[actorId]
      if (mock) {
        selectedSheet.value = { ...mock }
        return
      }

      const worldId = session.value?.worldId
      if (!worldId || !isEngineWorldId(worldId)) {
        toast.error('Personagem não encontrado')
        closeCharacterSheet()
        return
      }

      const actor = await request('actor:get', actorId)
      if (!actor) {
        closeCharacterSheet()
        return
      }

      const [languages, cultures] = await Promise.all([
        request('language:listByWorld', worldId),
        request('culture:listByWorld', worldId)
      ])
      const languageName = languages?.find((item) => item.id === actor.languageId)?.name
      const cultureName = cultures?.find((item) => item.id === actor.cultureId)?.name
      const hp = resolveHp(actor)
      selectedSheet.value = toCharacterSheet(actor, hp.current, hp.max, languageName, cultureName)
    } finally {
      isSheetLoading.value = false
    }
  }

  async function deleteSelectedCharacter(): Promise<void> {
    const sheet = selectedSheet.value
    const worldId = session.value?.worldId
    if (!sheet || isDeletingSheet.value) return

    isDeletingSheet.value = true
    try {
      if (!isEngineWorldId(worldId ?? '') || sheet.id.startsWith('mock-')) {
        // Proposed: mock party delete stays local until campaign party is engine-owned.
        if (player.value?.id === sheet.id) player.value = undefined
        npcs.value = npcs.value.filter((npc) => npc.id !== sheet.id)
        delete mockSheets[sheet.id]
        closeCharacterSheet()
        toast.success('Personagem removido')
        return
      }

      await request('actor:delete', sheet.id)
      if (error.value) return
      await loadGame(worldId!)
      closeCharacterSheet()
      toast.success('Personagem removido')
    } finally {
      isDeletingSheet.value = false
    }
  }

  async function requestEditCharacter(): Promise<void> {
    const sheet = selectedSheet.value
    const worldId = session.value?.worldId
    if (!sheet || !worldId || isDeletingSheet.value) return

    await loadWorld(worldId)

    let actor: ActorSummary | undefined
    if (mockSheets[sheet.id] || sheet.id.startsWith('mock-') || !isEngineWorldId(worldId)) {
      actor = characterSheetToActorSummary(sheet, languages.value, cultures.value)
    } else {
      const raw = await request('actor:get', sheet.id)
      if (!raw) return
      const cultureList = (await request('culture:listByWorld', worldId)) ?? []
      actor = toActorSummary(raw, cultureList)
    }

    editingActor.value = actor
    sheetOpen.value = false
    editOpen.value = true
  }

  async function applyCharacterSaved(actor: ActorSummary): Promise<void> {
    const worldId = session.value?.worldId
    if (!worldId) return

    const previous = mockSheets[actor.id] ?? selectedSheet.value
    const languageName = languages.value.find((item) => item.id === actor.languageId)?.name
    const cultureName = cultures.value.find((item) => item.id === actor.cultureId)?.name
    const hpCurrent = previous?.hpCurrent ?? 20
    const hpMax = previous?.hpMax ?? 20
    const imagePath = actor.imagePath ?? previous?.imagePath

    if (mockSheets[actor.id] || actor.id.startsWith('mock-') || !isEngineWorldId(worldId)) {
      const sheet = actorSummaryToCharacterSheet(
        { ...actor, imagePath },
        hpCurrent,
        hpMax,
        {
          badgeLabel: previous?.badgeLabel ?? 'NPC',
          isNpc: previous?.isNpc ?? true,
          languageName,
          cultureName
        }
      )
      mockSheets[actor.id] = sheet

      const card: PartyMemberCardModel = {
        id: actor.id,
        name: actor.name,
        roleLabel: actor.subtitle,
        imagePath: imagePath ?? undefined,
        hpCurrent,
        hpMax
      }
      if (player.value?.id === actor.id) player.value = card
      npcs.value = npcs.value.map((npc) => (npc.id === actor.id ? card : npc))
      return
    }

    await loadGame(worldId)
  }

  async function loadGame(worldId: string): Promise<void> {
    if (!isEngineWorldId(worldId)) {
      applyMockSession(worldId, worldId === 'eldoria' ? 'Eldoria' : 'Mundo')
      return
    }

    const world = await request('world:get', worldId)
    const worldName = world?.name ?? 'Mundo'
    const history = (await request('gameMaster:listHistory', worldId)) ?? []
    const party = await request('party:findByWorld', worldId)
    const actors = (await request('actor:listByWorld', worldId)) ?? []

    const playerActor = actors.find((actor) => !actor.isNpc)
    const partyNpcs = actors.filter(
      (actor) => actor.isNpc && (party ? actor.partyId === party.id : false)
    )

    const playerName = playerActor?.name ?? 'Jogador'
    const playerImagePath = playerActor?.imagePath ?? undefined

    session.value = {
      worldId,
      worldName,
      playerName,
      playerImagePath
    }

    messages.value = history.map((message) =>
      toGameChatMessage(message, playerName, playerImagePath)
    )

    player.value = playerActor
      ? toPartyMemberCard(playerActor, resolveHp(playerActor).current, resolveHp(playerActor).max)
      : undefined

    npcs.value = partyNpcs.map((actor) => {
      const hp = resolveHp(actor)
      return toPartyMemberCard(actor, hp.current, hp.max)
    })
  }

  async function sendMessage(): Promise<void> {
    const worldId = session.value?.worldId
    const text = draft.value.trim()
    if (!worldId || text.length === 0 || isSending.value) return

    const playerName = session.value?.playerName ?? 'Jogador'
    const playerImagePath = session.value?.playerImagePath
    const now = new Date()
    const optimisticId = `local-${now.getTime()}`

    draft.value = ''
    isSending.value = true
    messages.value = [
      ...messages.value,
      {
        id: optimisticId,
        role: 'player',
        senderName: playerName,
        timeLabel: formatMessageTime(now),
        imagePath: playerImagePath,
        segments: [{ kind: 'dialogue', text }]
      }
    ]

    try {
      if (!isEngineWorldId(worldId)) {
        // Proposed: mock worlds have no gameMaster thread yet.
        messages.value = [
          ...messages.value,
          {
            id: `local-master-${now.getTime()}`,
            role: 'master',
            senderName: 'Mestre',
            timeLabel: formatMessageTime(new Date()),
            segments: [
              {
                kind: 'narration',
                text: 'O Mestre observa o grupo em silêncio por um instante, então acena para que continuem.'
              }
            ]
          }
        ]
        return
      }

      const reply = await request('gameMaster:takeTurn', { worldId, message: text })
      if (reply === undefined) {
        messages.value = messages.value.filter((message) => message.id !== optimisticId)
        draft.value = text
        return
      }

      const history = (await request('gameMaster:listHistory', worldId)) ?? []
      if (history.length > 0) {
        messages.value = history.map((message) =>
          toGameChatMessage(message, playerName, playerImagePath)
        )
        return
      }

      messages.value = [
        ...messages.value,
        {
          id: `local-master-${now.getTime()}`,
          role: 'master',
          senderName: 'Mestre',
          timeLabel: formatMessageTime(new Date()),
          segments: [{ kind: 'narration', text: reply }]
        }
      ]
    } finally {
      isSending.value = false
    }
  }

  return {
    session,
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
    isSheetLoading,
    isDeletingSheet,
    canSend,
    loadGame,
    sendMessage,
    openCharacterSheet,
    closeCharacterSheet,
    deleteSelectedCharacter,
    requestEditCharacter,
    applyCharacterSaved
  }
}
