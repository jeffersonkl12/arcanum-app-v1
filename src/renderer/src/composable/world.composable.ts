import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { CreateActor, CreateWorld } from '@schema'
import type { IpcError } from '@shared'
import { worldGenreGroup } from '@renderer/constant/world-genre.constant'
import { useRequest } from './request.composable'
import { toActorSummary, toNamedEntitySummary, toWorldDetail, toWorldSummary } from './world.mapper'
import type {
  ActiveCampaign,
  ActorSummary,
  NamedEntitySummary,
  WorldDetail,
  WorldEntityTab,
  WorldSummary
} from './world.type'

export const worldGenreFilters = ['Todos', 'Fantasia', 'Ficção', 'Terror'] as const

export type WorldGenreFilter = (typeof worldGenreFilters)[number]

// Proposed: campaign:getActive is not in ipcContract yet.
const activeCampaign = ref<ActiveCampaign>({
  id: 'shattered-realms',
  title: 'Os Reinos Despedaçados'
})

// Proposed: world:list has no campaign count. Dashboard stays mocked until that model exists.
const worlds = ref<WorldSummary[]>([
  {
    id: 'eldoria',
    name: 'Eldoria',
    description:
      'Um mundo de alta magia com cidades flutuantes e antigos senhores dragões despertando de seu sono.',
    genre: 'Fantasia',
    campaignCount: 2
  },
  {
    id: 'neo-veridia',
    name: 'Neo-Veridia',
    description:
      'Metrópole cyberpunk construída nas ruínas de uma civilização élfica. A magia encontra o cromo.',
    genre: 'Sci-Fantasy',
    campaignCount: 0
  },
  {
    id: 'dead-wastes',
    name: 'Os Ermos Mortos',
    description:
      'Ermos pós-apocalípticos onde sobreviventes buscam tecnologia e lutam contra horrores mutantes.',
    genre: 'Terror',
    campaignCount: 2
  }
])

const search = ref('')
const genreFilter = ref<WorldGenreFilter>('Todos')

const visibleWorlds = computed(() =>
  worlds.value.filter((world) => {
    const term = search.value.trim().toLocaleLowerCase()
    const matchesSearch = term.length === 0 || world.name.toLocaleLowerCase().includes(term)
    return matchesSearch && matchesGenre(world.genre, genreFilter.value)
  })
)

function matchesGenre(genre: string, filter: WorldGenreFilter): boolean {
  if (filter === 'Todos') return true
  const group = worldGenreGroup(genre)
  if (group) return group === filter
  if (filter === 'Ficção') return genre === 'Sci-Fantasy' || genre === 'Ficção'
  return genre === filter
}

const { isLoading: isCreating, error: createError, request } = useRequest()
const { isLoading: isLoadingDetail, error: detailError, request: detailRequest } = useRequest()
const { isLoading: isCreatingActor, error: createActorError, request: actorRequest } = useRequest()
const {
  isLoading: isCreatingNamedEntity,
  error: createNamedEntityError,
  request: namedEntityRequest
} = useRequest()

const currentWorld = ref<WorldDetail>()
const actors = ref<ActorSummary[]>([])
const languages = ref<NamedEntitySummary[]>([])
const cultures = ref<NamedEntitySummary[]>([])
const entityTab = ref<WorldEntityTab>('npcs')
const entitySearch = ref('')
const isNotFound = ref(false)

// Proposed: dashboard still uses mock world ids until world:list is wired to the engine.
const mockWorldDetails: Record<
  string,
  {
    world: WorldDetail
    actors: ActorSummary[]
    languages: NamedEntitySummary[]
    cultures: NamedEntitySummary[]
  }
> = {
  eldoria: {
    world: {
      id: 'eldoria',
      name: 'Eldoria',
      description:
        'Um mundo de alta magia com cidades flutuantes e antigos senhores dragões despertando de seu sono após milênios. A magia flui através de cristais Aether, que alimentam desde a iluminação até as frotas de navios aéreos.',
      genre: 'Fantasia'
    },
    actors: [
      {
        id: 'elara',
        name: 'Elara Moonwhisper',
        subtitle: 'Arquimaga de Sylaris • Elfa',
        profession: 'Arquimaga de Sylaris',
        age: 'middle_aged',
        gender: 'female',
        languageId: 'aetheric',
        cultureId: 'sylaris',
        appearance: '',
        personality: '',
        background: ''
      },
      {
        id: 'thorek',
        name: 'Thorek Ironbrow',
        subtitle: 'Capitão da Guarda Aérea • Anão',
        profession: 'Capitão da Guarda Aérea',
        age: 'middle_aged',
        gender: 'male',
        languageId: 'old-drake',
        cultureId: 'ironhold',
        appearance: '',
        personality: '',
        background: ''
      },
      {
        id: 'vaelin',
        name: 'Vaelin o Silencioso',
        subtitle: 'Informante da Guilda das Sombras • Humano',
        profession: 'Informante da Guilda das Sombras',
        age: 'young_adult',
        gender: 'male',
        languageId: 'aetheric',
        cultureId: null,
        appearance: '',
        personality: '',
        background: ''
      }
    ],
    languages: [
      {
        id: 'aetheric',
        name: 'Aethérico',
        description: 'Língua dos magos e das cortes flutuantes.'
      },
      {
        id: 'old-drake',
        name: 'Dracônico Antigo',
        description: 'Usado nos ritos dos senhores dragões.'
      }
    ],
    cultures: [
      {
        id: 'sylaris',
        name: 'Elfos de Sylaris',
        description: 'Povo das cidades suspensas e dos cristais Aether.'
      },
      {
        id: 'ironhold',
        name: 'Anões de Ironhold',
        description: 'Engenheiros das frotas aéreas e forjas de altitude.'
      }
    ]
  }
}

const visibleActors = computed(() => filterByName(actors.value, entitySearch.value))
const visibleLanguages = computed(() => filterByName(languages.value, entitySearch.value))
const visibleCultures = computed(() => filterByName(cultures.value, entitySearch.value))

function filterByName<T extends { name: string }>(items: T[], term: string): T[] {
  const normalized = term.trim().toLocaleLowerCase()
  if (normalized.length === 0) return items
  return items.filter((item) => item.name.toLocaleLowerCase().includes(normalized))
}

function isMockWorld(worldId: string | undefined): boolean {
  return worldId !== undefined && worldId in mockWorldDetails
}

function isEngineWorldId(worldId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(worldId)
}

async function createWorld(input: CreateWorld): Promise<WorldSummary | undefined> {
  const created = await request('world:create', input)
  if (!created) return undefined
  const summary = toWorldSummary(created)
  worlds.value = [summary, ...worlds.value]
  return summary
}

async function loadWorld(worldId: string): Promise<void> {
  isNotFound.value = false
  entityTab.value = 'npcs'
  entitySearch.value = ''

  if (isMockWorld(worldId)) {
    const mock = mockWorldDetails[worldId]
    currentWorld.value = mock.world
    actors.value = [...mock.actors]
    languages.value = [...mock.languages]
    cultures.value = [...mock.cultures]
    return
  }

  const summary = worlds.value.find((item) => item.id === worldId)
  // Proposed: dashboard mock worlds have no engine record yet.
  if (summary && !isEngineWorldId(worldId)) {
    currentWorld.value = {
      id: summary.id,
      name: summary.name,
      description: summary.description,
      genre: summary.genre
    }
    actors.value = []
    languages.value = []
    cultures.value = []
    return
  }

  const world = await detailRequest('world:get', worldId)
  if (!world) {
    currentWorld.value = undefined
    actors.value = []
    languages.value = []
    cultures.value = []
    isNotFound.value = true
    return
  }

  currentWorld.value = toWorldDetail(world)
  const [actorList, languageList, cultureList] = await Promise.all([
    detailRequest('actor:listByWorld', worldId),
    detailRequest('language:listByWorld', worldId),
    detailRequest('culture:listByWorld', worldId)
  ])
  const loadedCultures = cultureList ?? []
  actors.value = (actorList ?? [])
    .filter((actor) => actor.isNpc)
    .map((actor) => toActorSummary(actor, loadedCultures))
  languages.value = (languageList ?? []).map(toNamedEntitySummary)
  cultures.value = loadedCultures.map(toNamedEntitySummary)
}

async function deleteActor(actorId: string): Promise<void> {
  if (isMockWorld(currentWorld.value?.id)) {
    actors.value = actors.value.filter((actor) => actor.id !== actorId)
    return
  }

  await detailRequest('actor:delete', actorId)
  if (detailError.value || !currentWorld.value) return

  const [actorList, cultureList] = await Promise.all([
    detailRequest('actor:listByWorld', currentWorld.value.id),
    detailRequest('culture:listByWorld', currentWorld.value.id)
  ])
  actors.value = (actorList ?? [])
    .filter((actor) => actor.isNpc)
    .map((actor) => toActorSummary(actor, cultureList ?? []))
}

type CreateActorInput = Omit<CreateActor, 'worldId' | 'isNpc' | 'partyId'> & {
  imageData?: Uint8Array
}

type CreateNamedEntityInput = {
  name: string
  description: string
}

function toActorListItem(
  input: CreateActorInput,
  id: string,
  imagePath?: string | null
): ActorSummary {
  const cultureName = cultures.value.find((culture) => culture.id === input.cultureId)?.name
  const subtitle = [input.profession, cultureName].filter(Boolean).join(' • ') || 'NPC'

  return {
    id,
    name: input.name,
    subtitle,
    imagePath,
    profession: input.profession ?? '',
    age: input.age,
    gender: input.gender,
    languageId: input.languageId ?? null,
    cultureId: input.cultureId ?? null,
    appearance: input.appearance ?? '',
    personality: input.personality ?? '',
    background: input.background ?? ''
  }
}

async function createActor(input: CreateActorInput): Promise<ActorSummary | undefined> {
  const worldId = currentWorld.value?.id
  if (!worldId) return undefined

  if (isMockWorld(worldId) || !isEngineWorldId(worldId)) {
    // Proposed: dashboard mock worlds have no engine record yet.
    const summary = toActorListItem(input, crypto.randomUUID())
    actors.value = [summary, ...actors.value]
    return summary
  }

  const created = await actorRequest('actor:create', {
    worldId,
    name: input.name,
    age: input.age,
    gender: input.gender,
    profession: input.profession ?? '',
    appearance: input.appearance ?? '',
    personality: input.personality ?? '',
    background: input.background ?? '',
    cultureId: input.cultureId ?? null,
    languageId: input.languageId ?? null,
    isNpc: true,
    partyId: null
  })
  if (!created) return undefined

  let imagePath = created.imagePath
  if (input.imageData) {
    const data = new Uint8Array(input.imageData)
    imagePath = (await actorRequest('actor:setImage', { id: created.id, data })) ?? imagePath
  }

  const summary = toActorListItem(input, created.id, imagePath)
  actors.value = [summary, ...actors.value]
  return summary
}

async function updateActor(
  actorId: string,
  input: CreateActorInput
): Promise<ActorSummary | undefined> {
  const worldId = currentWorld.value?.id
  if (!worldId) return undefined

  if (isMockWorld(worldId) || !isEngineWorldId(worldId)) {
    // Proposed: dashboard mock worlds have no engine record yet.
    const current = actors.value.find((actor) => actor.id === actorId)
    const summary = toActorListItem(input, actorId, current?.imagePath)
    actors.value = actors.value.map((actor) => (actor.id === actorId ? summary : actor))
    return summary
  }

  const updated = await actorRequest('actor:update', {
    id: actorId,
    patch: {
      name: input.name,
      age: input.age,
      gender: input.gender,
      profession: input.profession ?? '',
      appearance: input.appearance ?? '',
      personality: input.personality ?? '',
      background: input.background ?? '',
      cultureId: input.cultureId ?? null,
      languageId: input.languageId ?? null
    }
  })
  if (!updated) return undefined

  let imagePath = updated.imagePath
  if (input.imageData) {
    const data = new Uint8Array(input.imageData)
    imagePath = (await actorRequest('actor:setImage', { id: actorId, data })) ?? imagePath
  }

  const summary = toActorListItem(input, actorId, imagePath)
  actors.value = actors.value.map((actor) => (actor.id === actorId ? summary : actor))
  return summary
}

async function createLanguage(
  input: CreateNamedEntityInput
): Promise<NamedEntitySummary | undefined> {
  const worldId = currentWorld.value?.id
  if (!worldId) return undefined

  if (isMockWorld(worldId) || !isEngineWorldId(worldId)) {
    // Proposed: dashboard mock worlds have no engine record yet.
    const summary: NamedEntitySummary = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description
    }
    languages.value = [summary, ...languages.value]
    return summary
  }

  const created = await namedEntityRequest('language:create', {
    worldId,
    name: input.name,
    description: input.description
  })
  if (!created) return undefined

  const summary = toNamedEntitySummary(created)
  languages.value = [summary, ...languages.value]
  return summary
}

async function updateLanguage(
  languageId: string,
  input: CreateNamedEntityInput
): Promise<NamedEntitySummary | undefined> {
  const worldId = currentWorld.value?.id
  if (!worldId) return undefined

  if (isMockWorld(worldId) || !isEngineWorldId(worldId)) {
    // Proposed: dashboard mock worlds have no engine record yet.
    const summary: NamedEntitySummary = {
      id: languageId,
      name: input.name,
      description: input.description
    }
    languages.value = languages.value.map((item) => (item.id === languageId ? summary : item))
    return summary
  }

  const updated = await namedEntityRequest('language:update', {
    id: languageId,
    patch: { name: input.name, description: input.description }
  })
  if (!updated) return undefined

  const summary = toNamedEntitySummary(updated)
  languages.value = languages.value.map((item) => (item.id === languageId ? summary : item))
  return summary
}

async function createCulture(
  input: CreateNamedEntityInput
): Promise<NamedEntitySummary | undefined> {
  const worldId = currentWorld.value?.id
  if (!worldId) return undefined

  if (isMockWorld(worldId) || !isEngineWorldId(worldId)) {
    // Proposed: dashboard mock worlds have no engine record yet.
    const summary: NamedEntitySummary = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description
    }
    cultures.value = [summary, ...cultures.value]
    return summary
  }

  const created = await namedEntityRequest('culture:create', {
    worldId,
    name: input.name,
    description: input.description
  })
  if (!created) return undefined

  const summary = toNamedEntitySummary(created)
  cultures.value = [summary, ...cultures.value]
  return summary
}

async function updateCulture(
  cultureId: string,
  input: CreateNamedEntityInput
): Promise<NamedEntitySummary | undefined> {
  const worldId = currentWorld.value?.id
  if (!worldId) return undefined

  if (isMockWorld(worldId) || !isEngineWorldId(worldId)) {
    // Proposed: dashboard mock worlds have no engine record yet.
    const summary: NamedEntitySummary = {
      id: cultureId,
      name: input.name,
      description: input.description
    }
    cultures.value = cultures.value.map((item) => (item.id === cultureId ? summary : item))
    return summary
  }

  const updated = await namedEntityRequest('culture:update', {
    id: cultureId,
    patch: { name: input.name, description: input.description }
  })
  if (!updated) return undefined

  const summary = toNamedEntitySummary(updated)
  cultures.value = cultures.value.map((item) => (item.id === cultureId ? summary : item))
  return summary
}

export function useWorld(): {
  activeCampaign: Ref<ActiveCampaign>
  visibleWorlds: ComputedRef<WorldSummary[]>
  search: Ref<string>
  genreFilter: Ref<WorldGenreFilter>
  genreFilters: typeof worldGenreFilters
  isCreating: Ref<boolean>
  createError: Ref<IpcError | undefined>
  createWorld: (input: CreateWorld) => Promise<WorldSummary | undefined>
  currentWorld: Ref<WorldDetail | undefined>
  entityTab: Ref<WorldEntityTab>
  entitySearch: Ref<string>
  languages: Ref<NamedEntitySummary[]>
  cultures: Ref<NamedEntitySummary[]>
  visibleActors: ComputedRef<ActorSummary[]>
  visibleLanguages: ComputedRef<NamedEntitySummary[]>
  visibleCultures: ComputedRef<NamedEntitySummary[]>
  isLoadingDetail: Ref<boolean>
  isNotFound: Ref<boolean>
  isCreatingActor: Ref<boolean>
  createActorError: Ref<IpcError | undefined>
  isCreatingNamedEntity: Ref<boolean>
  createNamedEntityError: Ref<IpcError | undefined>
  loadWorld: (worldId: string) => Promise<void>
  deleteActor: (actorId: string) => Promise<void>
  createActor: (input: CreateActorInput) => Promise<ActorSummary | undefined>
  updateActor: (actorId: string, input: CreateActorInput) => Promise<ActorSummary | undefined>
  createLanguage: (input: CreateNamedEntityInput) => Promise<NamedEntitySummary | undefined>
  updateLanguage: (
    languageId: string,
    input: CreateNamedEntityInput
  ) => Promise<NamedEntitySummary | undefined>
  createCulture: (input: CreateNamedEntityInput) => Promise<NamedEntitySummary | undefined>
  updateCulture: (
    cultureId: string,
    input: CreateNamedEntityInput
  ) => Promise<NamedEntitySummary | undefined>
} {
  return {
    activeCampaign,
    visibleWorlds,
    search,
    genreFilter,
    genreFilters: worldGenreFilters,
    isCreating,
    createError,
    createWorld,
    currentWorld,
    entityTab,
    entitySearch,
    languages,
    cultures,
    visibleActors,
    visibleLanguages,
    visibleCultures,
    isLoadingDetail,
    isNotFound,
    isCreatingActor,
    createActorError,
    isCreatingNamedEntity,
    createNamedEntityError,
    loadWorld,
    deleteActor,
    createActor,
    updateActor,
    createLanguage,
    updateLanguage,
    createCulture,
    updateCulture
  }
}
