<script setup lang="ts">
import { computed, watch } from 'vue'
import { Plus, Search } from '@lucide/vue'
import { ActorRow, CreateNpcDialog, EntityRow } from '@renderer/components/custom'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { useWorld } from '@renderer/composable/world.composable'
import { cn } from '@renderer/lib/utils'

const { entityTab, entitySearch, visibleActors, visibleLanguages, visibleCultures, deleteActor } =
  useWorld()

const tabConfig = {
  npcs: {
    searchPlaceholder: 'Buscar NPCs...',
    addLabel: 'Adicionar NPC'
  },
  languages: {
    searchPlaceholder: 'Buscar idiomas...',
    addLabel: 'Adicionar idioma'
  },
  cultures: {
    searchPlaceholder: 'Buscar culturas...',
    addLabel: 'Adicionar cultura'
  }
} as const

const activeConfig = computed(() => tabConfig[entityTab.value])

watch(entityTab, () => {
  entitySearch.value = ''
})

const tabTriggerClass = cn(
  'h-auto flex-none rounded-none border-0 bg-transparent px-0 pb-3 text-base font-medium text-tertiary shadow-none',
  'hover:text-foreground data-active:bg-transparent data-active:font-semibold data-active:text-primary',
  'dark:data-active:border-transparent dark:data-active:bg-transparent',
  'after:bg-primary group-data-[variant=line]/tabs-list:data-active:after:opacity-100'
)
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col gap-6">
    <Tabs v-model="entityTab" class="gap-6">
      <TabsList
        variant="line"
        class="h-auto w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0"
      >
        <TabsTrigger value="npcs" :class="tabTriggerClass">NPCs</TabsTrigger>
        <TabsTrigger value="languages" :class="tabTriggerClass">Idiomas</TabsTrigger>
        <TabsTrigger value="cultures" :class="tabTriggerClass">Cultura</TabsTrigger>
      </TabsList>

      <div class="flex items-center justify-between gap-4">
        <label
          class="flex w-[260px] items-center gap-3 rounded-lg border border-border bg-card px-4 py-2"
        >
          <Search class="size-4 shrink-0 text-tertiary" />
          <Input
            v-model="entitySearch"
            type="search"
            :placeholder="activeConfig.searchPlaceholder"
            class="h-auto border-0 bg-transparent p-0 text-sm shadow-none placeholder:text-tertiary focus-visible:ring-0"
          />
        </label>
        <CreateNpcDialog v-if="entityTab === 'npcs'" />
        <Button
          v-else
          type="button"
          class="h-auto gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-primary-hover"
        >
          <Plus class="size-4" />
          {{ activeConfig.addLabel }}
        </Button>
      </div>

      <TabsContent value="npcs" class="mt-0 flex flex-col gap-3">
        <ActorRow
          v-for="actor in visibleActors"
          :key="actor.id"
          :name="actor.name"
          :subtitle="actor.subtitle"
          :image-path="actor.imagePath"
          @remove="deleteActor(actor.id)"
        />
      </TabsContent>

      <TabsContent value="languages" class="mt-0 flex flex-col gap-3">
        <EntityRow
          v-for="language in visibleLanguages"
          :key="language.id"
          :name="language.name"
          :description="language.description"
        />
      </TabsContent>

      <TabsContent value="cultures" class="mt-0 flex flex-col gap-3">
        <EntityRow
          v-for="culture in visibleCultures"
          :key="culture.id"
          :name="culture.name"
          :description="culture.description"
        />
      </TabsContent>
    </Tabs>
  </section>
</template>
