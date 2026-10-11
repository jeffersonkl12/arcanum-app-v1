<script setup lang="ts">
import { ChevronDown, MessageCircle, Plus, SendHorizontal } from '@lucide/vue'
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import { Spinner } from '@renderer/components/ui/spinner'

const draft = defineModel<string>({ required: true })

defineProps<{
  disabled?: boolean
  sending?: boolean
}>()

const emit = defineEmits<{
  send: []
}>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    emit('send')
  }
}
</script>

<template>
  <div class="w-full px-8 pb-6 pt-4">
    <div class="flex w-full flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <Textarea
        v-model="draft"
        rows="3"
        placeholder="Descreva sua ação, fala ou pergunta ao Mestre..."
        class="min-h-24 max-h-56 resize-none border-0 bg-transparent p-0 text-lg md:text-lg shadow-none focus-visible:ring-0"
        :disabled="disabled || sending"
        @keydown="onKeydown"
      />
      <div class="flex w-full items-center justify-between">
        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            class="size-auto rounded-full p-2.5 text-muted-foreground"
            :disabled="disabled || sending"
          >
            <Plus class="size-4.5" />
            <span class="sr-only">Anexar</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            class="h-auto gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
            :disabled="disabled || sending"
          >
            <MessageCircle class="size-4" />
            Aventura
            <ChevronDown class="size-4 text-tertiary" />
          </Button>
        </div>
        <Button
          type="button"
          size="icon"
          class="size-auto rounded-full bg-primary p-3 text-primary-foreground hover:bg-primary-hover"
          :disabled="disabled || sending || draft.trim().length === 0"
          @click="emit('send')"
        >
          <Spinner v-if="sending" class="size-5" />
          <SendHorizontal v-else class="size-5" />
          <span class="sr-only">Enviar</span>
        </Button>
      </div>
    </div>
  </div>
</template>
