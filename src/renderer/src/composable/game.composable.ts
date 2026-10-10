import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { Actor } from '@schema'
import { useRequest } from '@renderer/composable/request.composable'
import {
  formatMessageTime,
  toGameChatMessage,
  toPartyMemberCard
} from '@renderer/composable/game.mapper'
import type {
  GameChatMessage,
  GameSession,
  PartyMemberCardModel
} from '@renderer/composable/game.type'

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

const session = ref<GameSession>()
const messages = ref<GameChatMessage[]>([])
const player = ref<PartyMemberCardModel>()
const npcs = ref<PartyMemberCardModel[]>([])
const draft = ref('')
const sidebarTab = ref<'party' | 'journal'>('party')
const isSending = ref(false)

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
  isLoading: Ref<boolean>
  isSending: Ref<boolean>
  canSend: ComputedRef<boolean>
  loadGame: (worldId: string) => Promise<void>
  sendMessage: () => Promise<void>
} {
  const { isLoading, request } = useRequest()

  const canSend = computed(
    () => draft.value.trim().length > 0 && !isSending.value && !isLoading.value
  )

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
    isLoading,
    isSending,
    canSend,
    loadGame,
    sendMessage
  }
}
