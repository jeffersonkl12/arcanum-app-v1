<script setup lang="ts">
import { Pencil, Trash2, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
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
import type { DocumentSummary } from '@renderer/composable/world.type'

const open = defineModel<boolean>('open', { required: true })

defineProps<{
  document: DocumentSummary | null
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()
</script>

<template>
  <Dialog v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[600px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-lg border border-border bg-card p-6 text-foreground shadow-dialog outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
      >
        <DialogDescription class="sr-only">
          Detalhes do documento: assunto, categoria e conteúdo.
        </DialogDescription>

        <div class="flex items-center justify-between">
          <DialogTitle class="text-xs font-semibold tracking-wide text-tertiary uppercase">
            Documento
          </DialogTitle>
          <DialogClose class="text-tertiary">
            <X class="size-5" />
            <span class="sr-only">Fechar</span>
          </DialogClose>
        </div>

        <div v-if="document" class="flex flex-col gap-3.5">
          <div class="flex flex-col items-start gap-2">
            <h2 class="text-2xl font-bold wrap-anywhere text-foreground">
              {{ document.subject }}
            </h2>
            <Badge
              class="h-auto rounded-full border-transparent bg-primary/15 px-3 py-1 text-badge font-bold tracking-wide text-primary uppercase"
            >
              {{ document.category }}
            </Badge>
          </div>

          <Separator />
          <p class="text-sm leading-normal wrap-anywhere whitespace-pre-line text-foreground">
            {{ document.content }}
          </p>
          <Separator />

          <div class="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              class="h-auto gap-2 rounded-full border-destructive px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
              @click="emit('delete')"
            >
              <Trash2 class="size-4" />
              Apagar
            </Button>
            <Button
              type="button"
              class="h-auto gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              @click="emit('edit')"
            >
              <Pencil class="size-4" />
              Editar Documento
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
