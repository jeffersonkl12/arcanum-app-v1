<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search } from '@lucide/vue'
import { toast } from 'vue-sonner'
import {
  ActorRow,
  ConfirmDialog,
  CreateItemDialog,
  CreateNamedEntityDialog,
  CreateNpcDialog,
  EntityRow,
  ItemDetailDialog,
  ItemRow
} from '@renderer/components/custom'
import { Input } from '@renderer/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { useWorld } from '@renderer/composable/world.composable'
import type { ActorSummary, ItemSummary, NamedEntitySummary } from '@renderer/composable/world.type'
import { cn } from '@renderer/lib/utils'

const {
  entityTab,
  entitySearch,
  visibleActors,
  visibleLanguages,
  visibleCultures,
  visibleItems,
  deleteActor,
  deleteLanguage,
  deleteCulture,
  deleteItem
} = useWorld()

type DeletableKind = 'actor' | 'language' | 'culture' | 'item'

interface PendingDelete {
  kind: DeletableKind
  id: string
  name: string
}

const deleteCopy: Record<DeletableKind, { title: string; success: string }> = {
  actor: { title: 'Apagar personagem', success: 'NPC removido' },
  language: { title: 'Apagar idioma', success: 'Idioma removido' },
  culture: { title: 'Apagar cultura', success: 'Cultura removida' },
  item: { title: 'Apagar item', success: 'Item removido' }
}

const npcOpen = ref(false)
const editingNpc = ref<ActorSummary | null>(null)
const languageOpen = ref(false)
const editingLanguage = ref<NamedEntitySummary | null>(null)
const cultureOpen = ref(false)
const editingCulture = ref<NamedEntitySummary | null>(null)
const itemOpen = ref(false)
const editingItem = ref<ItemSummary | null>(null)
const itemDetailOpen = ref(false)
const viewingItem = ref<ItemSummary | null>(null)
const deleteConfirmOpen = ref(false)
const pendingDelete = ref<PendingDelete | null>(null)
const isDeleting = ref(false)

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
  return 'Buscar NPCs...'
})

watch(entityTab, () => {
  entitySearch.value = ''
})

function openEditNpc(actor: ActorSummary): void {
  editingNpc.value = actor
  npcOpen.value = true
}

function openEditLanguage(language: NamedEntitySummary): void {
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
      item: deleteItem
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
          :description="language.description"
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
          :description="culture.description"
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
    </Tabs>

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
