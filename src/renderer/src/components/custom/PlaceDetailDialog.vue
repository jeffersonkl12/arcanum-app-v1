<script setup lang="ts">
import { Pencil, Trash2, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
import { computed } from 'vue'
import { toImageUrl } from '@shared'
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
import type { PlaceSummary } from '@renderer/composable/world.type'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  place?: PlaceSummary | null
  /** The places directly inside this one. */
  inside: PlaceSummary[]
  deleting?: boolean
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()

const locationLabel = computed(() => props.place?.path.join(' › ') ?? '')
</script>

<template>
  <Dialog v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[600px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-lg border border-border bg-card p-6 text-foreground shadow-dialog outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
      >
        <DialogDescription class="sr-only">
          Detalhes do lugar: tipo, onde fica, descrição e o que há dentro dele.
        </DialogDescription>

        <div class="flex items-center justify-between">
          <DialogTitle class="text-xs font-semibold tracking-wide text-tertiary uppercase">
            Lugar
          </DialogTitle>
          <DialogClose class="text-tertiary" :disabled="deleting">
            <X class="size-5" />
            <span class="sr-only">Fechar</span>
          </DialogClose>
        </div>

        <div v-if="!place" class="flex items-center justify-center py-16">
          <Spinner class="size-6 text-primary" />
        </div>

        <div v-else class="flex flex-col gap-3.5">
          <div class="flex flex-col items-center gap-2.5">
            <div
              class="flex size-36 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary"
            >
              <img
                v-if="place.imagePath"
                :src="toImageUrl(place.imagePath)"
                :alt="place.name"
                class="size-full object-cover"
              />
              <span v-else class="text-2xl font-bold text-tertiary">
                {{ place.name.slice(0, 1) }}
              </span>
            </div>
            <div class="flex flex-col items-center gap-1.5">
              <h2 class="text-2xl font-bold text-foreground">{{ place.name }}</h2>
              <p v-if="locationLabel" class="text-sm text-muted-foreground">
                Em {{ locationLabel }}
              </p>
              <Badge
                class="h-auto rounded-full border-transparent bg-primary/15 px-3 py-1 text-badge font-bold tracking-wide text-primary uppercase"
              >
                {{ place.type }}
              </Badge>
            </div>
          </div>

          <template v-if="place.description">
            <Separator />
            <div class="flex flex-col gap-1.5">
              <span class="text-sm font-semibold text-muted-foreground">DESCRIÇÃO</span>
              <p class="text-sm leading-normal whitespace-pre-line text-foreground">
                {{ place.description }}
              </p>
            </div>
          </template>

          <template v-if="inside.length > 0">
            <Separator />
            <div class="flex flex-col gap-1.5">
              <span class="text-sm font-semibold text-muted-foreground">DENTRO DESTE LUGAR</span>
              <ul class="flex flex-col gap-1 text-sm text-foreground">
                <li v-for="child in inside" :key="child.id">
                  {{ child.name }}
                  <span class="text-muted-foreground">• {{ child.type }}</span>
                </li>
              </ul>
            </div>
          </template>

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
              Editar Lugar
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
