import { computed, type ComputedRef, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { CreateActor, CreateWorld, WorldFilter } from '@schema'
import type { IpcError } from '@shared'
import {
  worldGenreFilters,
  worldGenresOfFilter,
  type WorldGenreFilter
} from '@renderer/constant/world-genre.constant'
import { useRequest } from './request.composable'
import { toActorSummary, toNamedEntitySummary, toWorldDetail, toWorldSummary } from './world.mapper'
import type {
  ActorSummary,
  NamedEntitySummary,
  WorldDetail,
  WorldEntityTab,
  WorldSummary
} from './world.type'
import { emptyToNull } from '@renderer/util/text.util'
import { useCampaignStore } from '@renderer/store/campaign.store'
import { useWorldStore } from '@renderer/store/world.store'

type UpdateWorldInput = Pick<CreateWorld, 'name' | 'genre' | 'description'>

type CreateActorInput = Omit<CreateActor, 'worldId' | 'isNpc' | 'partyId'> & {
  imageData?: Uint8Array
}

type NamedEntityInput = {
  name: string
  description: string
}

// The engine caps the filter at 120 characters (TEXT_LIMITS.name).
const MAX_SEARCH_LENGTH = 120

function filterByName<T extends { name: string }>(items: T[], term: string): T[] {
  const normalized = term.trim().toLocaleLowerCase()
  if (normalized.length === 0) return items
  return items.filter((item) => item.name.toLocaleLowerCase().includes(normalized))
}

export function useWorld(): {
  worlds: ComputedRef<WorldSummary[]>
  search: Ref<string>
  genreFilter: Ref<WorldGenreFilter>
  genreFilters: typeof worldGenreFilters
  isLoadingWorlds: Ref<boolean>
  isCreating: Ref<boolean>
  createError: Ref<IpcError | undefined>
  loadWorlds: () => Promise<void>
  createWorld: (
    input: UpdateWorldInput & { isTemplate: boolean }
  ) => Promise<WorldSummary | undefined>
  updateWorld: (worldId: string, input: UpdateWorldInput) => Promise<WorldDetail | undefined>
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
  deleteActor: (actorId: string) => Promise<boolean>
  createActor: (input: CreateActorInput) => Promise<ActorSummary | undefined>
  updateActor: (actorId: string, input: CreateActorInput) => Promise<ActorSummary | undefined>
  createLanguage: (input: NamedEntityInput) => Promise<NamedEntitySummary | undefined>
  updateLanguage: (
    languageId: string,
    input: NamedEntityInput
  ) => Promise<NamedEntitySummary | undefined>
  deleteLanguage: (languageId: string) => Promise<boolean>
  createCulture: (input: NamedEntityInput) => Promise<NamedEntitySummary | undefined>
  updateCulture: (
    cultureId: string,
    input: NamedEntityInput
  ) => Promise<NamedEntitySummary | undefined>
  deleteCulture: (cultureId: string) => Promise<boolean>
} {
  const store = useWorldStore()
  const {
    templates,
    search,
    genreFilter,
    currentWorld,
    actors,
    languages,
    cultures,
    entityTab,
    entitySearch,
    isNotFound
  } = storeToRefs(store)
  const { campaigns } = storeToRefs(useCampaignStore())

  const { isLoading: isLoadingWorlds, request: listRequest } = useRequest()
  const { isLoading: isCreating, error: createError, request } = useRequest()
  const {
    isLoading: isLoadingDetail,
    request: detailRequest,
    execute: detailExecute
  } = useRequest()
  const {
    isLoading: isCreatingActor,
    error: createActorError,
    request: actorRequest
  } = useRequest()
  const {
    isLoading: isCreatingNamedEntity,
    error: createNamedEntityError,
    request: namedEntityRequest,
    execute: namedEntityExecute
  } = useRequest()

  const worlds = computed(() => {
    const countByTemplate = new Map<string, number>()
    for (const campaign of campaigns.value) {
      if (!campaign.sourceWorldId) continue
      countByTemplate.set(
        campaign.sourceWorldId,
        (countByTemplate.get(campaign.sourceWorldId) ?? 0) + 1
      )
    }
    return templates.value.map((world) => toWorldSummary(world, countByTemplate.get(world.id) ?? 0))
  })

  const visibleActors = computed(() => filterByName(actors.value, entitySearch.value))
  const visibleLanguages = computed(() => filterByName(languages.value, entitySearch.value))
  const visibleCultures = computed(() => filterByName(cultures.value, entitySearch.value))

  /** The templates that match the dashboard filters; the engine does the filtering. */
  async function loadWorlds(): Promise<void> {
    const name = search.value.trim().slice(0, MAX_SEARCH_LENGTH)
    const filter: WorldFilter = {
      isTemplate: true,
      ...(name ? { name } : {}),
      genres: worldGenresOfFilter(genreFilter.value)
    }
    const list = await listRequest('world:list', filter)
    if (list) templates.value = list
  }

  async function createWorld(
    input: UpdateWorldInput & { isTemplate: boolean }
  ): Promise<WorldSummary | undefined> {
    const created = await request('world:create', input)
    if (!created) return undefined
    await loadWorlds()
    return toWorldSummary(created, 0)
  }

  async function updateWorld(
    worldId: string,
    input: UpdateWorldInput
  ): Promise<WorldDetail | undefined> {
    const updated = await request('world:update', { id: worldId, patch: input })
    if (!updated) return undefined

    const detail = toWorldDetail(updated)
    currentWorld.value = detail
    return detail
  }

  function clearDetail(): void {
    currentWorld.value = undefined
    actors.value = []
    languages.value = []
    cultures.value = []
  }

  async function loadWorld(worldId: string): Promise<void> {
    isNotFound.value = false
    entityTab.value = 'npcs'
    entitySearch.value = ''

    const world = await detailRequest('world:get', worldId)
    if (!world) {
      clearDetail()
      isNotFound.value = true
      return
    }

    currentWorld.value = toWorldDetail(world)
    const [actorList, languageList, cultureList] = await Promise.all([
      detailRequest('actor:listByWorld', worldId),
      detailRequest('language:listByWorld', worldId),
      detailRequest('culture:listByWorld', worldId)
    ])
    languages.value = (languageList ?? []).map(toNamedEntitySummary)
    cultures.value = (cultureList ?? []).map(toNamedEntitySummary)
    actors.value = (actorList ?? [])
      .filter((actor) => actor.isNpc)
      .map((actor) => toActorSummary(actor, cultures.value))
  }

  async function reloadActors(worldId: string): Promise<void> {
    const actorList = await detailRequest('actor:listByWorld', worldId)
    if (!actorList) return
    actors.value = actorList
      .filter((actor) => actor.isNpc)
      .map((actor) => toActorSummary(actor, cultures.value))
  }

  async function deleteActor(actorId: string): Promise<boolean> {
    const worldId = currentWorld.value?.id
    if (!worldId) return false

    if (!(await detailExecute('actor:delete', actorId))) return false
    await reloadActors(worldId)
    return true
  }

  async function saveActorImage(actorId: string, imageData?: Uint8Array): Promise<string | null> {
    if (!imageData) return null
    const imagePath = await actorRequest('actor:setImage', {
      id: actorId,
      data: new Uint8Array(imageData)
    })
    return imagePath ?? null
  }

  async function createActor(input: CreateActorInput): Promise<ActorSummary | undefined> {
    const worldId = currentWorld.value?.id
    if (!worldId) return undefined

    const { imageData, ...fields } = input
    const created = await actorRequest('actor:create', {
      ...fields,
      worldId,
      profession: emptyToNull(fields.profession),
      appearance: emptyToNull(fields.appearance),
      personality: emptyToNull(fields.personality),
      background: emptyToNull(fields.background),
      cultureId: fields.cultureId ?? null,
      languageId: fields.languageId ?? null,
      isNpc: true,
      partyId: null
    })
    if (!created) return undefined

    const imagePath = await saveActorImage(created.id, imageData)
    const summary = toActorSummary(
      { ...created, imagePath: imagePath ?? created.imagePath },
      cultures.value
    )
    actors.value = [summary, ...actors.value]
    return summary
  }

  async function updateActor(
    actorId: string,
    input: CreateActorInput
  ): Promise<ActorSummary | undefined> {
    const { imageData, ...fields } = input
    const updated = await actorRequest('actor:update', {
      id: actorId,
      patch: {
        ...fields,
        profession: emptyToNull(fields.profession),
        appearance: emptyToNull(fields.appearance),
        personality: emptyToNull(fields.personality),
        background: emptyToNull(fields.background),
        cultureId: fields.cultureId ?? null,
        languageId: fields.languageId ?? null
      }
    })
    if (!updated) return undefined

    const imagePath = await saveActorImage(actorId, imageData)
    const summary = toActorSummary(
      { ...updated, imagePath: imagePath ?? updated.imagePath },
      cultures.value
    )
    actors.value = actors.value.map((actor) => (actor.id === actorId ? summary : actor))
    return summary
  }

  async function createLanguage(input: NamedEntityInput): Promise<NamedEntitySummary | undefined> {
    const worldId = currentWorld.value?.id
    if (!worldId) return undefined

    const created = await namedEntityRequest('language:create', { worldId, ...input })
    if (!created) return undefined

    const summary = toNamedEntitySummary(created)
    languages.value = [summary, ...languages.value]
    return summary
  }

  async function updateLanguage(
    languageId: string,
    input: NamedEntityInput
  ): Promise<NamedEntitySummary | undefined> {
    const updated = await namedEntityRequest('language:update', { id: languageId, patch: input })
    if (!updated) return undefined

    const summary = toNamedEntitySummary(updated)
    languages.value = languages.value.map((item) => (item.id === languageId ? summary : item))
    return summary
  }

  /** `conflict` when an actor still speaks it; the engine's message says so and is toasted. */
  async function deleteLanguage(languageId: string): Promise<boolean> {
    if (!(await namedEntityExecute('language:delete', languageId))) return false
    languages.value = languages.value.filter((item) => item.id !== languageId)
    return true
  }

  async function createCulture(input: NamedEntityInput): Promise<NamedEntitySummary | undefined> {
    const worldId = currentWorld.value?.id
    if (!worldId) return undefined

    const created = await namedEntityRequest('culture:create', { worldId, ...input })
    if (!created) return undefined

    const summary = toNamedEntitySummary(created)
    cultures.value = [summary, ...cultures.value]
    return summary
  }

  async function updateCulture(
    cultureId: string,
    input: NamedEntityInput
  ): Promise<NamedEntitySummary | undefined> {
    const updated = await namedEntityRequest('culture:update', { id: cultureId, patch: input })
    if (!updated) return undefined

    const summary = toNamedEntitySummary(updated)
    cultures.value = cultures.value.map((item) => (item.id === cultureId ? summary : item))
    return summary
  }

  /** `conflict` when an actor still belongs to it; the engine's message says so and is toasted. */
  async function deleteCulture(cultureId: string): Promise<boolean> {
    if (!(await namedEntityExecute('culture:delete', cultureId))) return false
    cultures.value = cultures.value.filter((item) => item.id !== cultureId)
    return true
  }

  return {
    worlds,
    search,
    genreFilter,
    genreFilters: worldGenreFilters,
    isLoadingWorlds,
    isCreating,
    createError,
    loadWorlds,
    createWorld,
    updateWorld,
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
    deleteLanguage,
    createCulture,
    updateCulture,
    deleteCulture
  }
}
