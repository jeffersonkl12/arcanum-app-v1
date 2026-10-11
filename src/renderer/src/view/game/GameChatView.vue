<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { KeyRound } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import GameChatComposer from '@renderer/components/custom/GameChatComposer.vue'
import GameChatMessage from '@renderer/components/custom/GameChatMessage.vue'
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert'
import { Separator } from '@renderer/components/ui/separator'
import { useGame } from '@renderer/composable/game.composable'
import { useSmoothScroll } from '@renderer/composable/smooth-scroll.composable'

const { messages, draft, isSending, isAiKeyMissing, sendMessage } = useGame()
const scrollRef = useTemplateRef<HTMLElement>('scrollRef')

// Only the last thing the narrator said can still be answered with its options.
const lastMasterId = computed(
  () => messages.value.findLast((message) => message.role === 'master')?.id
)

useSmoothScroll(scrollRef)

async function scrollToLatest(): Promise<void> {
  await nextTick()
  const el = scrollRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

watch(messages, scrollToLatest, { deep: true })

// A campaign with history opens with the chat already full, so the watcher above never fires for it.
// Markdown and UI blocks settle their height a frame later, hence the second pass.
onMounted(async () => {
  await scrollToLatest()
  requestAnimationFrame(() => void scrollToLatest())
})
</script>

<template>
  <section class="flex min-h-0 min-w-0 flex-1 flex-col">
    <div ref="scrollRef" class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-8 pb-4 pt-8">
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
        :key="message.id"
        :message="message"
        :interactive="!isSending && message.id === lastMasterId"
        @choose="void sendMessage($event)"
      />
    </div>

    <GameChatComposer v-model="draft" :sending="isSending" @send="void sendMessage()" />
  </section>
</template>
