<script setup lang="ts">
import { Pencil, Trash2, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { toImageUrl } from '@shared'
import ActorInventoryList from '@renderer/components/custom/ActorInventoryList.vue'
import ActorFamilyPanel from '@renderer/components/custom/ActorFamilyPanel.vue'
import ActorMemoryList from '@renderer/components/custom/ActorMemoryList.vue'
import ActorRelationshipList from '@renderer/components/custom/ActorRelationshipList.vue'
import AttributeStats from '@renderer/components/custom/AttributeStats.vue'
import HealthBar from '@renderer/components/custom/HealthBar.vue'
import type { CharacterSheet } from '@renderer/composable/game.type'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Separator } from '@renderer/components/ui/separator'
import { Spinner } from '@renderer/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { cn } from '@renderer/lib/utils'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  sheet?: CharacterSheet
  loading?: boolean
  deleting?: boolean
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()

const activeTab = ref('sheet')

// A sheet always opens on the "Ficha" tab.
watch(open, (isOpen) => {
  if (isOpen) activeTab.value = 'sheet'
})

const tabTriggerClass = cn(
  'h-auto flex-none rounded-none border-0 bg-transparent px-0 pb-3 text-sm font-medium text-tertiary shadow-none',
  'hover:text-foreground data-active:bg-transparent data-active:font-semibold data-active:text-primary',
  'dark:data-active:border-transparent dark:data-active:bg-transparent',
  'after:bg-primary group-data-horizontal/tabs:after:bottom-0 group-data-[variant=line]/tabs-list:data-active:after:opacity-100'
)

const infoCells = computed(() => {
  if (!props.sheet) return []
  return [
    { label: 'IDADE', value: props.sheet.ageLabel },
    { label: 'GÊNERO', value: props.sheet.genderLabel },
    { label: 'IDIOMA', value: props.sheet.languageLabel },
    { label: 'CULTURA', value: props.sheet.cultureLabel },
    { label: 'LOCALIZAÇÃO ATUAL', value: props.sheet.placeLabel }
  ]
})

const narrativeFields = computed(() => {
  if (!props.sheet) return []
  return [
    { label: 'APARÊNCIA', value: props.sheet.appearance },
    { label: 'PERSONALIDADE', value: props.sheet.personality },
    { label: 'BACKGROUND / HISTÓRIA', value: props.sheet.background }
  ]
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[600px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-lg border border-border bg-card p-6 text-foreground shadow-dialog outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
      >
        <DialogDescription class="sr-only">
          Ficha de personagem com atributos, pontos de vida e descrição.
        </DialogDescription>

        <div class="flex items-center justify-between">
          <DialogTitle class="text-xs font-semibold tracking-wide text-tertiary uppercase">
            Ficha de personagem
          </DialogTitle>
          <DialogClose class="text-tertiary" :disabled="deleting">
            <X class="size-5" />
            <span class="sr-only">Fechar</span>
          </DialogClose>
        </div>

        <div v-if="loading || !sheet" class="flex items-center justify-center py-16">
          <Spinner class="size-6 text-primary" />
        </div>

        <div v-else class="flex flex-col gap-3.5">
          <div class="flex flex-col items-center gap-2.5">
            <div
              class="flex h-[180px] w-[150px] items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary"
            >
              <img
                v-if="sheet.imagePath"
                :src="toImageUrl(sheet.imagePath)"
                :alt="sheet.name"
                class="size-full object-cover"
              />
              <span v-else class="text-2xl font-bold text-tertiary">
                {{ sheet.name.slice(0, 1) }}
              </span>
            </div>
            <div class="flex flex-col items-center gap-1.5">
              <h2 class="text-2xl font-bold text-foreground">{{ sheet.name }}</h2>
              <p class="text-sm text-muted-foreground">{{ sheet.roleLabel }}</p>
              <Badge
                class="h-auto rounded-full border-transparent bg-primary/15 px-3 py-1 text-badge font-bold tracking-wide text-primary uppercase"
              >
                {{ sheet.badgeLabel }}
              </Badge>
            </div>
          </div>

          <Separator />

          <HealthBar
            :current="sheet.hpCurrent"
            :max="sheet.hpMax"
            label="Pontos de vida"
            size="md"
          />

          <AttributeStats :attributes="sheet.attributes" />

          <Separator />

          <Tabs v-model="activeTab" class="flex w-full flex-col gap-4">
            <TabsList
              variant="line"
              class="h-auto w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0"
            >
              <TabsTrigger value="sheet" :class="tabTriggerClass">Ficha</TabsTrigger>
              <TabsTrigger value="inventory" :class="tabTriggerClass">Inventário</TabsTrigger>
              <TabsTrigger value="family" :class="tabTriggerClass">Família</TabsTrigger>
              <TabsTrigger value="relationships" :class="tabTriggerClass">Relações</TabsTrigger>
              <TabsTrigger value="memories" :class="tabTriggerClass">Memórias</TabsTrigger>
            </TabsList>

            <TabsContent value="sheet" class="flex flex-col gap-3.5 outline-none">
              <div class="grid grid-cols-2 gap-4">
                <div v-for="cell in infoCells" :key="cell.label" class="flex flex-col gap-1">
                  <span class="text-badge font-semibold tracking-wide text-tertiary uppercase">
                    {{ cell.label }}
                  </span>
                  <span class="text-sm font-medium text-foreground">{{ cell.value }}</span>
                </div>
              </div>

              <Separator />

              <div class="flex flex-col gap-3.5">
                <template v-for="(field, index) in narrativeFields" :key="field.label">
                  <Separator v-if="index > 0" />
                  <div class="flex flex-col gap-1.5">
                    <span class="text-sm font-semibold text-muted-foreground">
                      {{ field.label }}
                    </span>
                    <p class="text-sm leading-normal text-foreground">{{ field.value }}</p>
                  </div>
                </template>
              </div>
            </TabsContent>

            <TabsContent value="inventory" class="outline-none">
              <ActorInventoryList :key="sheet.id" :actor-id="sheet.id" :coins="sheet.coins" />
            </TabsContent>

            <TabsContent value="family" class="outline-none">
              <ActorFamilyPanel :key="sheet.id" :actor-id="sheet.id" />
            </TabsContent>

            <TabsContent value="relationships" class="outline-none">
              <ActorRelationshipList :key="sheet.id" :actor-id="sheet.id" />
            </TabsContent>

            <TabsContent value="memories" class="outline-none">
              <ActorMemoryList :key="sheet.id" :actor-id="sheet.id" />
            </TabsContent>
          </Tabs>

          <Separator />

          <div class="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              class="h-auto gap-2 rounded-full border-destructive px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
              :disabled="deleting"
              @click="emit('delete')"
            >
              <Spinner v-if="deleting" class="size-4" />
              <Trash2 v-else class="size-4" />
              Apagar
            </Button>
            <Button
              type="button"
              class="h-auto gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              :disabled="deleting"
              @click="emit('edit')"
            >
              <Pencil class="size-4" />
              Editar Personagem
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
