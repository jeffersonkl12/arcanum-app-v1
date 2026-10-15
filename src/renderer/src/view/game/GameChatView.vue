<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { KeyRound } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import GameChatComposer from '@renderer/components/custom/GameChatComposer.vue'
import ConfirmDialog from '@renderer/components/custom/ConfirmDialog.vue'
import GameChatMessage from '@renderer/components/custom/GameChatMessage.vue'
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert'
import { Separator } from '@renderer/components/ui/separator'
import { useGame } from '@renderer/composable/game.composable'

const {
  messages,
  draft,
  isSending,
  isAiKeyMissing,
  sendMessage,
  regenerateLast,
  rateMessage,
  editMessage,
  deleteMessage
} = useGame()
// The id outlives the dialog: the confirm button closes it (clearing `open`) before `confirm`
// is handled, so the id cannot be derived from `open`.
const deletingId = ref<string>()
const deleteConfirmOpen = ref(false)

function requestDelete(messageId: string): void {
  deletingId.value = messageId
  deleteConfirmOpen.value = true
}

async function confirmDelete(): Promise<void> {
  const id = deletingId.value
  deleteConfirmOpen.value = false
  deletingId.value = undefined
  if (id) await deleteMessage(id)
}

const scrollRef = useTemplateRef<HTMLElement>('scrollRef')

// Only the last thing the narrator said can still be answered with its options.
const lastMasterId = computed(
  () => messages.value.findLast((message) => message.role === 'master')?.id
)

// The chat uses the native scroll and sticks to the bottom while streamed messages grow it.
const STICK_THRESHOLD = 120
let stickToBottom = true

function onScroll(): void {
  const el = scrollRef.value
  if (!el) return
  stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_THRESHOLD
}

async function scrollToLatest(force = false): Promise<void> {
  await nextTick()
  const el = scrollRef.value
  if (!el || !(force || stickToBottom)) return
  el.scrollTop = el.scrollHeight
}

// Follow new content only while the player is at the bottom; reading older messages is not interrupted.
watch(messages, () => void scrollToLatest(), { deep: true })

// A campaign with history opens with the chat already full, so the watcher above never fires for it.
// Markdown and UI blocks settle their height a frame later, hence the second pass.
onMounted(async () => {
  await scrollToLatest(true)
  requestAnimationFrame(() => void scrollToLatest(true))
})
</script>

<template>
  <section class="flex min-h-0 min-w-0 flex-1 flex-col">
    <div
      ref="scrollRef"
      class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-8 pb-4 pt-8"
      @scroll.passive="onScroll"
    >
      <Alert v-if="isAiKeyMissing">
        <KeyRound />
        <AlertTitle>Nenhuma chave de API configurada</AlertTitle>
        <AlertDescription>
          O Mestre IA precisa de uma chave para narrar.
          <RouterLink :to="{ name: 'settings' }" class="font-semibold text-primary underline">
            Abrir configurações
          </RouterLink>
        </AlertDescription>
      </Alert>

      <div class="flex w-full items-center justify-center gap-3">
        <Separator class="flex-1" />
        <span class="rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold text-tertiary">
          Início da sessão
        </span>
        <Separator class="flex-1" />
      </div>

      <GameChatMessage
        v-for="message in messages"
        :key="message.key"
        :message="message"
        :interactive="!isSending && message.id === lastMasterId"
        :busy="isSending"
        :save-edit="(text) => editMessage(message.id, text)"
        @choose="void sendMessage($event)"
        @rate="void rateMessage(message.id, $event)"
        @regenerate="void regenerateLast()"
        @delete="requestDelete(message.id)"
      />
    </div>

    <ConfirmDialog
      v-model:open="deleteConfirmOpen"
      title="Excluir esta resposta do histórico?"
      description="O Mestre deixa de lembrar que disse isso. O que o turno fez no jogo (dados, NPCs, itens, moedas) continua valendo. Sua mensagem permanece."
      confirm-label="Excluir"
      confirm-variant="destructive"
      @confirm="void confirmDelete()"
    />

    <GameChatComposer v-model="draft" :sending="isSending" @send="void sendMessage()" />
  </section>
</template>
