<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Search } from '@lucide/vue'
import { toast } from 'vue-sonner'
import {
  ActorRow,
  ConfirmDialog,
  CreateItemDialog,
  CreateNamedEntityDialog,
  CreateNpcDialog,
  CreatePlaceDialog,
  EntityRow,
  ItemDetailDialog,
  ItemRow,
  PlaceDetailDialog,
  PlaceRow
} from '@renderer/components/custom'
import { Input } from '@renderer/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { useWorld } from '@renderer/composable/world.composable'
import type {
  ActorSummary,
  ItemSummary,
  LanguageSummary,
  NamedEntitySummary,
  PlaceSummary
} from '@renderer/composable/world.type'
import { cn } from '@renderer/lib/utils'

const {
  entityTab,
  entitySearch,
  visibleActors,
  visibleLanguages,
  visibleCultures,
  cultures,
  visibleItems,
  places,
  visiblePlaces,
  deletePlace,
  deleteActor,
  deleteLanguage,
  deleteCulture,
  deleteItem
} = useWorld()

function cultureNameOf(cultureId: string): string {
  return cultures.value.find((culture) => culture.id === cultureId)?.name ?? ''
}

type DeletableKind = 'actor' | 'language' | 'culture' | 'item' | 'place'

interface PendingDelete {
  kind: DeletableKind
  id: string
  name: string
}

const deleteCopy: Record<DeletableKind, { title: string; success: string }> = {
  actor: { title: 'Apagar personagem', success: 'NPC removido' },
  language: { title: 'Apagar idioma', success: 'Idioma removido' },
  culture: { title: 'Apagar cultura', success: 'Cultura removida' },
  item: { title: 'Apagar item', success: 'Item removido' },
  place: { title: 'Apagar lugar', success: 'Lugar removido' }
}

const npcOpen = ref(false)
const editingNpc = ref<ActorSummary | null>(null)
const languageOpen = ref(false)
const editingLanguage = ref<LanguageSummary | null>(null)
const cultureOpen = ref(false)
const editingCulture = ref<NamedEntitySummary | null>(null)
const itemOpen = ref(false)
const editingItem = ref<ItemSummary | null>(null)
const itemDetailOpen = ref(false)
const viewingItem = ref<ItemSummary | null>(null)
// Places whose children are hidden. Ignored while searching, which lists the matches flat.
const collapsedPlaceIds = ref(new Set<string>())

const shownPlaces = computed(() => {
  if (entitySearch.value.trim().length > 0) return visiblePlaces.value
  const hidden = new Set<string>()
  return visiblePlaces.value.filter((place) => {
    const parentId = place.parentId
    if (parentId && (collapsedPlaceIds.value.has(parentId) || hidden.has(parentId))) {
      hidden.add(place.id)
      return false
    }
    return true
  })
})

function togglePlace(placeId: string): void {
  const next = new Set(collapsedPlaceIds.value)
  if (!next.delete(placeId)) next.add(placeId)
  collapsedPlaceIds.value = next
}

const placeOpen = ref(false)
const editingPlace = ref<PlaceSummary | null>(null)
const newPlaceParentId = ref<string | null>(null)
const placeDetailOpen = ref(false)
const viewingPlaceId = ref<string | null>(null)
const deleteConfirmOpen = ref(false)
const pendingDelete = ref<PendingDelete | null>(null)
const isDeleting = ref(false)

// Looked up by id, so the detail follows the list when the place is edited.
const viewingPlace = computed(
  () => places.value.find((place) => place.id === viewingPlaceId.value) ?? null
)
const placesInsideViewing = computed(() =>
  places.value.filter((place) => place.parentId === viewingPlaceId.value)
)

const deleteTitle = computed(() => deleteCopy[pendingDelete.value?.kind ?? 'actor'].title)

const deleteDescription = computed(() => {
  const name = pendingDelete.value?.name
  if (!name) return 'Esta ação não pode ser desfeita.'
  return `Tem certeza que deseja apagar ${name}? Esta ação não pode ser desfeita.`
})

const searchPlaceholder = computed(() => {
  if (entityTab.value === 'languages') return 'Buscar idiomas...'
  if (entityTab.value === 'cultures') return 'Buscar culturas...'
  if (entityTab.value === 'items') return 'Buscar itens...'
  if (entityTab.value === 'places') return 'Buscar lugares...'
  return 'Buscar NPCs...'
})

watch(entityTab, () => {
  entitySearch.value = ''
})

function openEditNpc(actor: ActorSummary): void {
  editingNpc.value = actor
  npcOpen.value = true
}

function openEditLanguage(language: LanguageSummary): void {
  editingLanguage.value = language
  languageOpen.value = true
}

function openEditCulture(culture: NamedEntitySummary): void {
  editingCulture.value = culture
  cultureOpen.value = true
}

function openEditItem(item: ItemSummary): void {
  editingItem.value = item
  itemOpen.value = true
}

function openEditPlace(place: PlaceSummary): void {
  editingPlace.value = place
  placeOpen.value = true
}

// The dialog clears its own state as it closes, so the new one opens only after that has happened.
async function openCreateChildPlace(parentId: string): Promise<void> {
  placeDetailOpen.value = false
  placeOpen.value = false
  editingPlace.value = null
  await nextTick()
  newPlaceParentId.value = parentId
  placeOpen.value = true
}

function openPlaceDetail(place: PlaceSummary): void {
  viewingPlaceId.value = place.id
  placeDetailOpen.value = true
}

function editPlaceFromDetail(): void {
  if (!viewingPlace.value) return
  placeDetailOpen.value = false
  openEditPlace(viewingPlace.value)
}

function deletePlaceFromDetail(): void {
  if (!viewingPlace.value) return
  placeDetailOpen.value = false
  requestDelete('place', viewingPlace.value)
}

function openItemDetail(item: ItemSummary): void {
  viewingItem.value = item
  itemDetailOpen.value = true
}

// The detail hands over to the edit dialog or to the delete confirmation, so only one is open.
function editFromDetail(): void {
  if (!viewingItem.value) return
  itemDetailOpen.value = false
  openEditItem(viewingItem.value)
}

function deleteFromDetail(): void {
  if (!viewingItem.value) return
  itemDetailOpen.value = false
  requestDelete('item', viewingItem.value)
}

function requestDelete(kind: DeletableKind, item: { id: string; name: string }): void {
  pendingDelete.value = { kind, id: item.id, name: item.name }
  deleteConfirmOpen.value = true
}

async function confirmDelete(): Promise<void> {
  const target = pendingDelete.value
  if (!target || isDeleting.value) return

  isDeleting.value = true
  try {
    const deleters: Record<DeletableKind, (id: string) => Promise<boolean>> = {
      actor: deleteActor,
      language: deleteLanguage,
      culture: deleteCulture,
      item: deleteItem,
      place: deletePlace
    }
    // On failure (a language still in use, say) the engine's message was already shown.
    if (!(await deleters[target.kind](target.id))) return

    toast.success(deleteCopy[target.kind].success)
    deleteConfirmOpen.value = false
    pendingDelete.value = null
  } finally {
    isDeleting.value = false
  }
}

const tabTriggerClass = cn(
  'h-auto flex-none rounded-none border-0 bg-transparent px-0 pb-3 text-base font-medium text-tertiary shadow-none',
  'hover:text-foreground data-active:bg-transparent data-active:font-semibold data-active:text-primary',
  'dark:data-active:border-transparent dark:data-active:bg-transparent',
  'after:bg-primary group-data-horizontal/tabs:after:bottom-0 group-data-[variant=line]/tabs-list:data-active:after:opacity-100'
)
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <Tabs v-model="entityTab" class="flex w-full flex-col gap-6">
      <TabsList
        variant="line"
        class="h-auto w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0"
      >
        <TabsTrigger value="npcs" :class="tabTriggerClass">NPCs</TabsTrigger>
        <TabsTrigger value="languages" :class="tabTriggerClass">Idiomas</TabsTrigger>
        <TabsTrigger value="cultures" :class="tabTriggerClass">Cultura</TabsTrigger>
        <TabsTrigger value="items" :class="tabTriggerClass">Itens</TabsTrigger>
        <TabsTrigger value="places" :class="tabTriggerClass">Lugares</TabsTrigger>
      </TabsList>

      <div class="flex w-full items-center justify-between gap-4">
        <label
          class="flex w-65 items-center gap-3 rounded-lg border border-border bg-card px-4 py-2"
        >
          <Search class="size-4 shrink-0 text-tertiary" />
          <Input
            v-model="entitySearch"
            type="search"
            :placeholder="searchPlaceholder"
            class="h-auto border-0 bg-transparent p-0 text-sm shadow-none placeholder:text-tertiary focus-visible:ring-0"
          />
        </label>
        <CreateNpcDialog
          v-if="entityTab === 'npcs'"
          v-model:open="npcOpen"
          v-model:entity="editingNpc"
        />
        <CreateNamedEntityDialog
          v-else-if="entityTab === 'languages'"
          v-model:open="languageOpen"
          v-model:entity="editingLanguage"
          kind="language"
        />
        <CreateItemDialog
          v-else-if="entityTab === 'items'"
          v-model:open="itemOpen"
          v-model:entity="editingItem"
        />
        <CreatePlaceDialog
          v-else-if="entityTab === 'places'"
          v-model:open="placeOpen"
          v-model:entity="editingPlace"
          v-model:parent-id="newPlaceParentId"
          @add-child="openCreateChildPlace"
        />
        <CreateNamedEntityDialog
          v-else
          v-model:open="cultureOpen"
          v-model:entity="editingCulture"
          kind="culture"
        />
      </div>

      <TabsContent value="npcs" class="mt-0 flex flex-col gap-3 outline-none">
        <ActorRow
          v-for="actor in visibleActors"
          :key="actor.id"
          :name="actor.name"
          :subtitle="actor.subtitle"
          :image-path="actor.imagePath"
          :hp-current="actor.hpCurrent"
          :hp-max="actor.hpMax"
          @edit="openEditNpc(actor)"
          @remove="requestDelete('actor', actor)"
        />
        <p v-if="visibleActors.length === 0" class="text-sm text-tertiary">
          Nenhum NPC encontrado.
        </p>
      </TabsContent>

      <TabsContent value="languages" class="mt-0 flex flex-col gap-3 outline-none">
        <EntityRow
          v-for="language in visibleLanguages"
          :key="language.id"
          :name="language.name"
          :subtitle="cultureNameOf(language.cultureId)"
          @edit="openEditLanguage(language)"
          @remove="requestDelete('language', language)"
        />
        <p v-if="visibleLanguages.length === 0" class="text-sm text-tertiary">
          Nenhum idioma encontrado.
        </p>
      </TabsContent>

      <TabsContent value="cultures" class="mt-0 flex flex-col gap-3 outline-none">
        <EntityRow
          v-for="culture in visibleCultures"
          :key="culture.id"
          :name="culture.name"
          @edit="openEditCulture(culture)"
          @remove="requestDelete('culture', culture)"
        />
        <p v-if="visibleCultures.length === 0" class="text-sm text-tertiary">
          Nenhuma cultura encontrada.
        </p>
      </TabsContent>

      <TabsContent value="items" class="mt-0 flex flex-col gap-3 outline-none">
        <ItemRow
          v-for="item in visibleItems"
          :key="item.id"
          :item="item"
          @view="openItemDetail(item)"
          @edit="openEditItem(item)"
          @remove="requestDelete('item', item)"
        />
        <p v-if="visibleItems.length === 0" class="text-sm text-tertiary">
          Nenhum item encontrado.
        </p>
      </TabsContent>

      <TabsContent value="places" class="mt-0 flex flex-col gap-3 outline-none">
        <PlaceRow
          v-for="place in shownPlaces"
          :key="place.id"
          :place="place"
          :collapsible="entitySearch.trim().length === 0"
          :collapsed="collapsedPlaceIds.has(place.id)"
          @toggle="togglePlace(place.id)"
          @view="openPlaceDetail(place)"
          @edit="openEditPlace(place)"
          @remove="requestDelete('place', place)"
        />
        <p v-if="shownPlaces.length === 0" class="text-sm text-tertiary">
          Nenhum lugar encontrado.
        </p>
      </TabsContent>
    </Tabs>

    <PlaceDetailDialog
      v-model:open="placeDetailOpen"
      :place="viewingPlace"
      :inside="placesInsideViewing"
      :deleting="isDeleting"
      @edit="editPlaceFromDetail"
      @add-child="viewingPlaceId && openCreateChildPlace(viewingPlaceId)"
      @delete="deletePlaceFromDetail"
    />

    <ItemDetailDialog
      v-model:open="itemDetailOpen"
      :item="viewingItem"
      :deleting="isDeleting"
      @edit="editFromDetail"
      @delete="deleteFromDetail"
    />

    <ConfirmDialog
      v-model:open="deleteConfirmOpen"
      :title="deleteTitle"
      :description="deleteDescription"
      confirm-label="Apagar"
      cancel-label="Cancelar"
      confirm-variant="destructive"
      :confirming="isDeleting"
      @confirm="void confirmDelete()"
    />
  </section>
</template>
