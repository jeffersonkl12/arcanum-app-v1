<script setup lang="ts">
import { Pencil, Trash2, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
import { computed } from 'vue'
import { toImageUrl } from '@shared'
import { hpPercent, isCriticalHp } from '@renderer/composable/game.mapper'
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
import { Progress } from '@renderer/components/ui/progress'
import { Separator } from '@renderer/components/ui/separator'
import { Spinner } from '@renderer/components/ui/spinner'
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

const percent = computed(() =>
  props.sheet ? hpPercent(props.sheet.hpCurrent, props.sheet.hpMax) : 0
)
const critical = computed(() =>
  props.sheet ? isCriticalHp(props.sheet.hpCurrent, props.sheet.hpMax) : false
)

const infoCells = computed(() => {
  if (!props.sheet) return []
  return [
    { label: 'IDADE', value: props.sheet.ageLabel },
    { label: 'GÊNERO', value: props.sheet.genderLabel },
    { label: 'IDIOMA', value: props.sheet.languageLabel },
    { label: 'CULTURA', value: props.sheet.cultureLabel }
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

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-badge font-semibold tracking-wide text-tertiary uppercase">
                Pontos de vida
              </span>
              <span class="text-xs font-semibold text-muted-foreground">
                {{ sheet.hpCurrent }} / {{ sheet.hpMax }}
              </span>
            </div>
            <Progress
              :model-value="percent"
              :class="
                cn('h-2 bg-border', critical && '[&_[data-slot=progress-indicator]]:bg-destructive')
              "
            />
          </div>

          <Separator />

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
                <span class="text-sm font-semibold text-muted-foreground">{{ field.label }}</span>
                <p class="text-sm leading-normal text-foreground">{{ field.value }}</p>
              </div>
            </template>
          </div>

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
