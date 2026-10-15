import { computed, type ComputedRef, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import type {
  CreateActorInput as PlacedActorInput,
  NewRelative,
  CreateItem,
  CreateWorld,
  WorldFilter
} from '@schema'
import type { IpcError } from '@shared'
import {
  worldGenreFilters,
  worldGenresOfFilter,
  type WorldGenreFilter
} from '@renderer/constant/world-genre.constant'
import { useRequest } from './request.composable'
import {
  toActorSummary,
  toDocumentSummary,
  toItemSummary,
  toLanguageSummary,
  toNamedEntitySummary,
  toPlaceSummaries,
  toWorldDetail,
  toWorldSummary
} from './world.mapper'
import type {
  ActorSummary,
  DocumentSummary,
  ItemSummary,
  LanguageSummary,
  NamedEntitySummary,
  PlaceSummary,
  WorldDetail,
  WorldEntityTab,
  WorldSummary
} from './world.type'
import { emptyToNull } from '@renderer/util/text.util'
import { useCampaignStore } from '@renderer/store/campaign.store'
import { useWorldStore } from '@renderer/store/world.store'

type UpdateWorldInput = Pick<CreateWorld, 'name' | 'genre' | 'description'>

type CreateActorInput = Omit<PlacedActorInput, 'worldId' | 'isNpc' | 'partyId'> & {
  imageData?: Uint8Array
  /** Family bonds a new actor is created with; ignored when editing (the family is edited on its own). */
  relatives?: NewRelative[]
}

/** An existing actor's family is edited on its own, so the edit form never carries `relatives`. */
type UpdateActorFormInput = Omit<CreateActorInput, 'relatives'>

type NamedEntityInput = {
  name: string
}

/** A language is always created inside a culture. */
type LanguageInput = NamedEntityInput & { cultureId: string }

/** What the item form sends; the class of the types the item is not is `null`. */
type ItemInput = Pick<CreateItem, 'name' | 'type'> & {
  description: string
  slots: number
  goldPieces: number
  silverPieces: number
  bronzePieces: number
  weaponClass: CreateItem['weaponClass']
  clothingClass: CreateItem['clothingClass']
  imageData?: Uint8Array
}

/** What the place form sends; `parentId` is null for a place at the top. */
type PlaceInput = {
  name: string
  type: string
  description: string
  parentId: string | null
  imageData?: Uint8Array
}

/** What the document form sends. */
type DocumentInput = {
  subject: string
  category: string
  content: string
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
  isDeletingWorld: Ref<boolean>
  /** Deletes a world template; its campaigns are kept. `false` if the engine refused. */
  deleteWorld: (worldId: string) => Promise<boolean>
  createWorld: (
    input: UpdateWorldInput & { isTemplate: boolean }
  ) => Promise<WorldSummary | undefined>
  updateWorld: (worldId: string, input: UpdateWorldInput) => Promise<WorldDetail | undefined>
  currentWorld: Ref<WorldDetail | undefined>
  entityTab: Ref<WorldEntityTab>
  entitySearch: Ref<string>
  languages: Ref<LanguageSummary[]>
  cultures: Ref<NamedEntitySummary[]>
  visibleActors: ComputedRef<ActorSummary[]>
  visibleLanguages: ComputedRef<LanguageSummary[]>
  visibleCultures: ComputedRef<NamedEntitySummary[]>
  items: Ref<ItemSummary[]>
  visibleItems: ComputedRef<ItemSummary[]>
  places: Ref<PlaceSummary[]>
  /** The places in tree order; while searching, the ones whose name or type match, flat. */
  visiblePlaces: ComputedRef<PlaceSummary[]>
  isSavingPlace: Ref<boolean>
  savePlaceError: Ref<IpcError | undefined>
  createPlace: (input: PlaceInput) => Promise<PlaceSummary | undefined>
  updatePlace: (placeId: string, input: PlaceInput) => Promise<PlaceSummary | undefined>
  /** `conflict` while the place still has places or actors inside; the engine's message is toasted. */
  deletePlace: (placeId: string) => Promise<boolean>
  documents: Ref<DocumentSummary[]>
  /** The documents whose subject, category or text match the search. */
  visibleDocuments: ComputedRef<DocumentSummary[]>
  isSavingDocument: Ref<boolean>
  saveDocumentError: Ref<IpcError | undefined>
  createDocument: (input: DocumentInput) => Promise<DocumentSummary | undefined>
  updateDocument: (documentId: string, input: DocumentInput) => Promise<DocumentSummary | undefined>
  deleteDocument: (documentId: string) => Promise<boolean>
  isSavingItem: Ref<boolean>
  saveItemError: Ref<IpcError | undefined>
  createItem: (input: ItemInput) => Promise<ItemSummary | undefined>
  updateItem: (itemId: string, input: ItemInput) => Promise<ItemSummary | undefined>
  deleteItem: (itemId: string) => Promise<boolean>
  loadInventoryItemIds: (actorId: string) => Promise<string[]>
  syncInventory: (actorId: string, itemIds: string[]) => Promise<boolean>
  isLoadingDetail: Ref<boolean>
  isNotFound: Ref<boolean>
  isCreatingActor: Ref<boolean>
  createActorError: Ref<IpcError | undefined>
  isCreatingNamedEntity: Ref<boolean>
  createNamedEntityError: Ref<IpcError | undefined>
  loadWorld: (worldId: string) => Promise<void>
  deleteActor: (actorId: string) => Promise<boolean>
  createActor: (input: CreateActorInput) => Promise<ActorSummary | undefined>
  updateActor: (actorId: string, input: UpdateActorFormInput) => Promise<ActorSummary | undefined>
  createLanguage: (input: LanguageInput) => Promise<LanguageSummary | undefined>
  updateLanguage: (languageId: string, input: LanguageInput) => Promise<LanguageSummary | undefined>
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
    items,
    places,
    documents,
    entityTab,
    entitySearch,
    isNotFound
  } = storeToRefs(store)
  const { campaigns } = storeToRefs(useCampaignStore())

  const { isLoading: isLoadingWorlds, request: listRequest } = useRequest()
  const { isLoading: isCreating, error: createError, request } = useRequest()
  const { isLoading: isDeletingWorld, execute: deleteWorldExecute } = useRequest()
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

  const {
    isLoading: isSavingItem,
    error: saveItemError,
    request: itemRequest,
    execute: itemExecute
  } = useRequest()

  const {
    isLoading: isSavingDocument,
    error: saveDocumentError,
    request: documentRequest,
    execute: documentExecute
  } = useRequest()

  const {
    isLoading: isSavingPlace,
    error: savePlaceError,
    request: placeRequest,
    execute: placeExecute
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
  const visibleItems = computed(() => filterByName(items.value, entitySearch.value))
  const visibleDocuments = computed(() => {
    const term = entitySearch.value.trim().toLocaleLowerCase()
    if (term.length === 0) return documents.value
    return documents.value.filter((entry) =>
      [entry.subject, entry.category, entry.content].some((field) =>
        field.toLocaleLowerCase().includes(term)
      )
    )
  })
  const visiblePlaces = computed(() => {
    const term = entitySearch.value.trim().toLocaleLowerCase()
    if (term.length === 0) return places.value
    return places.value
      .filter(
        (place) =>
          place.name.toLocaleLowerCase().includes(term) ||
          place.type.toLocaleLowerCase().includes(term)
      )
      .map((place) => ({ ...place, depth: 0 }))
  })

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

  async function deleteWorld(worldId: string): Promise<boolean> {
    if (!(await deleteWorldExecute('world:delete', worldId))) return false
    templates.value = templates.value.filter((world) => world.id !== worldId)
    // The campaigns cloned from it stay, but forget their source.
    campaigns.value = campaigns.value.map((campaign) =>
      campaign.sourceWorldId === worldId ? { ...campaign, sourceWorldId: null } : campaign
    )
    return true
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
    items.value = []
    places.value = []
    documents.value = []
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
    const [actorList, languageList, cultureList, itemList, placeList, documentList] =
      await Promise.all([
        detailRequest('actor:listByWorld', worldId),
        detailRequest('language:listByWorld', worldId),
        detailRequest('culture:listByWorld', worldId),
        detailRequest('item:listByWorld', worldId),
        detailRequest('pointOfInterest:listByWorld', worldId),
        detailRequest('document:listByWorld', worldId)
      ])
    documents.value = (documentList ?? []).map(toDocumentSummary)
    places.value = toPlaceSummaries(placeList ?? [])
    items.value = (itemList ?? []).map(toItemSummary)
    languages.value = (languageList ?? []).map(toLanguageSummary)
    cultures.value = (cultureList ?? []).map(toNamedEntitySummary)
    actors.value = (actorList ?? [])
      .filter((actor) => actor.isNpc)
      .map((actor) => toActorSummary(actor, cultures.value))
  }

  async function reloadPlaces(worldId: string): Promise<void> {
    const placeList = await placeRequest('pointOfInterest:listByWorld', worldId)
    if (placeList) places.value = toPlaceSummaries(placeList)
  }

  async function savePlaceImage(placeId: string, imageData?: Uint8Array): Promise<void> {
    if (!imageData) return
    await placeRequest('pointOfInterest:setImage', {
      id: placeId,
      data: new Uint8Array(imageData)
    })
  }

  async function createPlace(input: PlaceInput): Promise<PlaceSummary | undefined> {
    const worldId = currentWorld.value?.id
    if (!worldId) return undefined

    const { imageData, ...fields } = input
    const created = await placeRequest('pointOfInterest:create', { worldId, ...fields })
    if (!created) return undefined

    await savePlaceImage(created.id, imageData)
    await reloadPlaces(worldId)
    return places.value.find((place) => place.id === created.id)
  }

  /** `conflict` when the new parent would put the place inside itself; the engine's message is toasted. */
  async function updatePlace(
    placeId: string,
    input: PlaceInput
  ): Promise<PlaceSummary | undefined> {
    const worldId = currentWorld.value?.id
    if (!worldId) return undefined

    const { imageData, ...fields } = input
    const updated = await placeRequest('pointOfInterest:update', { id: placeId, patch: fields })
    if (!updated) return undefined

    await savePlaceImage(placeId, imageData)
    await reloadPlaces(worldId)
    return places.value.find((place) => place.id === placeId)
  }

  async function deletePlace(placeId: string): Promise<boolean> {
    const worldId = currentWorld.value?.id
    if (!worldId) return false

    if (!(await placeExecute('pointOfInterest:delete', placeId))) return false
    await reloadPlaces(worldId)
    return true
  }

  async function createDocument(input: DocumentInput): Promise<DocumentSummary | undefined> {
    const worldId = currentWorld.value?.id
    if (!worldId) return undefined

    const created = await documentRequest('document:create', { worldId, ...input })
    if (!created) return undefined

    const summary = toDocumentSummary(created)
    documents.value = [summary, ...documents.value]
    return summary
  }

  async function updateDocument(
    documentId: string,
    input: DocumentInput
  ): Promise<DocumentSummary | undefined> {
    const updated = await documentRequest('document:update', { id: documentId, patch: input })
    if (!updated) return undefined

    const summary = toDocumentSummary(updated)
    documents.value = documents.value.map((item) => (item.id === documentId ? summary : item))
    return summary
  }

  async function deleteDocument(documentId: string): Promise<boolean> {
    if (!(await documentExecute('document:delete', documentId))) return false
    documents.value = documents.value.filter((item) => item.id !== documentId)
    return true
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
    input: UpdateActorFormInput
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

  async function createLanguage(input: LanguageInput): Promise<LanguageSummary | undefined> {
    const worldId = currentWorld.value?.id
    if (!worldId) return undefined

    const created = await namedEntityRequest('language:create', { worldId, ...input })
    if (!created) return undefined

    const summary = toLanguageSummary(created)
    languages.value = [summary, ...languages.value]
    return summary
  }

  async function updateLanguage(
    languageId: string,
    input: LanguageInput
  ): Promise<LanguageSummary | undefined> {
    const updated = await namedEntityRequest('language:update', { id: languageId, patch: input })
    if (!updated) return undefined

    const summary = toLanguageSummary(updated)
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

  function toItemFields(input: Omit<ItemInput, 'imageData'>): CreateItem {
    return { ...input, description: emptyToNull(input.description) }
  }

  async function saveItemImage(itemId: string, imageData?: Uint8Array): Promise<string | null> {
    if (!imageData) return null
    const imagePath = await itemRequest('item:setImage', {
      id: itemId,
      data: new Uint8Array(imageData)
    })
    return imagePath ?? null
  }

  async function createItem(input: ItemInput): Promise<ItemSummary | undefined> {
    const worldId = currentWorld.value?.id
    if (!worldId) return undefined

    const { imageData, ...fields } = input
    const created = await itemRequest('item:createInWorld', {
      worldId,
      item: toItemFields(fields)
    })
    if (!created) return undefined

    const imagePath = await saveItemImage(created.id, imageData)
    const summary = toItemSummary({ ...created, imagePath: imagePath ?? created.imagePath })
    items.value = [summary, ...items.value]
    return summary
  }

  /** `conflict` when the change breaks an item rule (equipped, no room in the inventory...); the engine's message is toasted. */
  async function updateItem(itemId: string, input: ItemInput): Promise<ItemSummary | undefined> {
    const { imageData, ...fields } = input
    const updated = await itemRequest('item:update', { id: itemId, patch: toItemFields(fields) })
    if (!updated) return undefined

    const imagePath = await saveItemImage(itemId, imageData)
    const summary = toItemSummary({ ...updated, imagePath: imagePath ?? updated.imagePath })
    items.value = items.value.map((item) => (item.id === itemId ? summary : item))
    return summary
  }

  async function deleteItem(itemId: string): Promise<boolean> {
    if (!(await itemExecute('item:remove', itemId))) return false
    items.value = items.value.filter((item) => item.id !== itemId)
    return true
  }

  /** The ids of the items an actor carries now. */
  async function loadInventoryItemIds(actorId: string): Promise<string[]> {
    const inventory = await itemRequest('inventory:get', actorId)
    return (inventory?.items ?? []).map((item) => item.id)
  }

  async function reloadItems(worldId: string): Promise<void> {
    const itemList = await itemRequest('item:listByWorld', worldId)
    if (itemList) items.value = itemList.map(toItemSummary)
  }

  /**
   * Makes the actor's inventory exactly `itemIds`: drops what is no longer wanted, then gives the
   * rest (drops first, so the freed slots count). The engine enforces the 12 slots and the world.
   * Returns false if any step failed (its message was toasted); the list is reloaded either way.
   */
  async function syncInventory(actorId: string, itemIds: string[]): Promise<boolean> {
    const worldId = currentWorld.value?.id
    if (!worldId) return false

    const current = await loadInventoryItemIds(actorId)
    const wanted = new Set(itemIds)
    let succeeded = true

    for (const itemId of current.filter((id) => !wanted.has(id))) {
      succeeded = (await itemRequest('item:drop', itemId)) !== undefined && succeeded
    }
    for (const itemId of itemIds.filter((id) => !current.includes(id))) {
      succeeded = (await itemRequest('item:give', { itemId, actorId })) !== undefined && succeeded
    }

    await reloadItems(worldId)
    return succeeded
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
    isDeletingWorld,
    deleteWorld,
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
    items,
    visibleItems,
    places,
    visiblePlaces,
    isSavingPlace,
    savePlaceError,
    createPlace,
    updatePlace,
    deletePlace,
    documents,
    visibleDocuments,
    isSavingDocument,
    saveDocumentError,
    createDocument,
    updateDocument,
    deleteDocument,
    isSavingItem,
    saveItemError,
    createItem,
    updateItem,
    deleteItem,
    loadInventoryItemIds,
    syncInventory,
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
