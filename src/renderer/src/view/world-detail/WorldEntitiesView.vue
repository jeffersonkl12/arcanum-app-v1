<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search } from '@lucide/vue'
import { toast } from 'vue-sonner'
import {
  ActorRow,
  ConfirmDialog,
  CreateNamedEntityDialog,
  CreateNpcDialog,
  EntityRow
} from '@renderer/components/custom'
import { Input } from '@renderer/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { useWorld } from '@renderer/composable/world.composable'
import type { ActorSummary, NamedEntitySummary } from '@renderer/composable/world.type'
import { cn } from '@renderer/lib/utils'

const { entityTab, entitySearch, visibleActors, visibleLanguages, visibleCultures, deleteActor } =
  useWorld()

const npcOpen = ref(false)
const editingNpc = ref<ActorSummary | null>(null)
const languageOpen = ref(false)
const editingLanguage = ref<NamedEntitySummary | null>(null)
const cultureOpen = ref(false)
const editingCulture = ref<NamedEntitySummary | null>(null)
const deleteConfirmOpen = ref(false)
const pendingDeleteActor = ref<ActorSummary | null>(null)
const isDeletingActor = ref(false)

const deleteDescription = computed(() => {
  const name = pendingDeleteActor.value?.name
  if (!name) return 'Esta ação não pode ser desfeita.'
  return `Tem certeza que deseja apagar ${name}? Esta ação não pode ser desfeita.`
})

const searchPlaceholder = computed(() => {
  if (entityTab.value === 'languages') return 'Buscar idiomas...'
  if (entityTab.value === 'cultures') return 'Buscar culturas...'
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

function requestDeleteActor(actor: ActorSummary): void {
  pendingDeleteActor.value = actor
  deleteConfirmOpen.value = true
}

async function confirmDeleteActor(): Promise<void> {
  const actor = pendingDeleteActor.value
  if (!actor || isDeletingActor.value) return
  isDeletingActor.value = true
  try {
    const deleted = await deleteActor(actor.id)
    if (!deleted) return
    toast.success('NPC removido')
    deleteConfirmOpen.value = false
    pendingDeleteActor.value = null
  } finally {
    isDeletingActor.value = false
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
          @edit="openEditNpc(actor)"
          @remove="requestDeleteActor(actor)"
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
        />
        <p v-if="visibleCultures.length === 0" class="text-sm text-tertiary">
          Nenhuma cultura encontrada.
        </p>
      </TabsContent>
    </Tabs>

    <ConfirmDialog
      v-model:open="deleteConfirmOpen"
      title="Apagar personagem"
      :description="deleteDescription"
      confirm-label="Apagar"
      cancel-label="Cancelar"
      confirm-variant="destructive"
      :confirming="isDeletingActor"
      @confirm="void confirmDeleteActor()"
    />
  </section>
</template>
