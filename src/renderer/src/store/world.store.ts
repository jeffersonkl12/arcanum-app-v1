import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { World } from '@schema'
import type { WorldGenreFilter } from '@renderer/constant/world-genre.constant'
import type {
  ActorSummary,
  DocumentSummary,
  ItemSummary,
  LanguageSummary,
  NamedEntitySummary,
  PlaceSummary,
  WorldDetail,
  WorldEntityTab
} from '@renderer/composable/world.type'

/** What the engine returned for the worlds (templates) dashboard and the open world's detail. */
export const useWorldStore = defineStore('world', () => {
  const templates = ref<World[]>([])
  const search = ref('')
  const genreFilter = ref<WorldGenreFilter>('Todos')

  const currentWorld = ref<WorldDetail>()
  const actors = ref<ActorSummary[]>([])
  const languages = ref<LanguageSummary[]>([])
  const cultures = ref<NamedEntitySummary[]>([])
  const items = ref<ItemSummary[]>([])
  const places = ref<PlaceSummary[]>([])
  const documents = ref<DocumentSummary[]>([])
  const entityTab = ref<WorldEntityTab>('npcs')
  const entitySearch = ref('')
  const isNotFound = ref(false)

  return {
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
  }
})
