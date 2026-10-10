<script setup lang="ts">
import { nextTick, watch } from 'vue'
import { useTemplateRef } from 'vue'
import GameChatComposer from '@renderer/components/custom/GameChatComposer.vue'
import GameChatMessage from '@renderer/components/custom/GameChatMessage.vue'
import { useGame } from '@renderer/composable/game.composable'
import { Separator } from '@renderer/components/ui/separator'

const { messages, draft, isSending, sendMessage } = useGame()
const scrollRef = useTemplateRef<HTMLElement>('scrollRef')

watch(
  messages,
  async () => {
    await nextTick()
    const el = scrollRef.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  },
  { deep: true }
)
</script>

<template>
  <section class="flex min-h-0 min-w-0 flex-1 flex-col">
    <div ref="scrollRef" class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-8 pb-4 pt-8">
      <div class="flex w-full items-center justify-center gap-3">
        <Separator class="flex-1" />
        <span class="rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold text-tertiary">
          Início da sessão
        </span>
        <Separator class="flex-1" />
      </div>

      <GameChatMessage v-for="message in messages" :key="message.id" :message="message" />
    </div>

    <GameChatComposer v-model="draft" :sending="isSending" @send="void sendMessage()" />
  </section>
</template>
