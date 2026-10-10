<script setup lang="ts">
import type { ButtonVariants } from '@renderer/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog'
import { Spinner } from '@renderer/components/ui/spinner'

const open = defineModel<boolean>('open', { required: true })

withDefaults(
  defineProps<{
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    confirmVariant?: ButtonVariants['variant']
    confirming?: boolean
  }>(),
  {
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    confirmVariant: 'default',
    confirming: false
  }
)

const emit = defineEmits<{
  confirm: []
}>()

function onConfirm(event: Event): void {
  event.preventDefault()
  emit('confirm')
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent
      class="gap-0 rounded-xl border border-border bg-card p-0 text-foreground shadow-dialog ring-0 data-[size=default]:max-w-sm data-[size=default]:sm:max-w-sm"
    >
      <AlertDialogHeader class="gap-2 p-6 place-items-start text-left">
        <AlertDialogTitle class="font-body text-lg font-bold text-foreground">
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription
          v-if="description"
          class="text-sm leading-normal text-muted-foreground"
        >
          {{ description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter class="border-border bg-transparent sm:justify-end">
        <AlertDialogCancel
          class="h-auto rounded-full bg-transparent px-4 py-2.5 text-sm font-semibold"
          :disabled="confirming"
        >
          {{ cancelLabel }}
        </AlertDialogCancel>
        <AlertDialogAction
          :variant="confirmVariant"
          class="h-auto gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
          :disabled="confirming"
          :class="
            confirmVariant === 'destructive'
              ? 'bg-destructive text-white hover:bg-destructive/90'
              : 'hover:bg-primary-hover'
          "
          @click="onConfirm"
        >
          <Spinner v-if="confirming" class="size-4" />
          {{ confirmLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
