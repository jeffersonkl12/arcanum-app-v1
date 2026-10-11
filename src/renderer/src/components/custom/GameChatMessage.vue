<script setup lang="ts">
import { toImageUrl } from '@shared'
import type { GameChatMessage } from '@renderer/composable/game.type'
import NarratorUi from '@renderer/components/custom/NarratorUi.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Bubble, BubbleContent } from '@renderer/components/ui/bubble'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader
} from '@renderer/components/ui/message'
import { Spinner } from '@renderer/components/ui/spinner'
import { cn } from '@renderer/lib/utils'

const props = defineProps<{
  message: GameChatMessage
  /** The player may pick the options the narrator offers in this message. */
  interactive?: boolean
}>()

const emit = defineEmits<{
  choose: [text: string]
}>()

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('')
}
</script>

<template>
  <Message :align="props.message.role === 'player' ? 'end' : 'start'" class="items-start gap-3.5">
    <MessageAvatar class="self-start">
      <Avatar class="size-11 after:border-transparent">
        <AvatarImage
          v-if="props.message.imagePath"
          :src="toImageUrl(props.message.imagePath)"
          :alt="props.message.senderName"
        />
        <AvatarFallback>{{ initials(props.message.senderName) }}</AvatarFallback>
      </Avatar>
    </MessageAvatar>
    <MessageContent :class="cn('gap-2', props.message.role === 'player' && 'items-end')">
      <MessageHeader
        :class="
          cn(
            'gap-2 px-0 font-normal',
            props.message.role === 'player' ? 'flex-row-reverse' : 'flex-row'
          )
        "
      >
        <span class="text-meta font-bold text-muted-foreground">
          {{ props.message.senderName }}
        </span>
        <span class="text-xs font-normal text-tertiary">{{ props.message.timeLabel }}</span>
      </MessageHeader>
      <Bubble
        :variant="props.message.role === 'player' ? 'secondary' : 'outline'"
        :align="props.message.role === 'player' ? 'end' : 'start'"
        :class="
          cn(
            'max-w-[min(100%,68rem)] min-w-96 shadow-lg',
            props.message.role === 'master' &&
              '*:data-[slot=bubble-content]:bg-card! *:data-[slot=bubble-content]:text-card-foreground!'
          )
        "
      >
        <BubbleContent
          class="flex w-full flex-col gap-3 rounded-2xl border-border px-7 py-6 font-body text-xl leading-relaxed text-foreground"
        >
          <template
            v-for="(segment, index) in props.message.segments"
            :key="`${props.message.id}-${index}`"
          >
            <NarratorUi
              v-if="segment.kind === 'ui'"
              :source="segment.source"
              :streaming="props.message.isStreaming"
              :interactive="props.interactive"
              @choose="emit('choose', $event)"
            />
            <p v-else :class="cn(segment.kind === 'dialogue' && 'font-bold italic')">
              {{ segment.text }}
            </p>
          </template>
          <p
            v-if="props.message.isStreaming && props.message.segments.length === 0"
            class="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Spinner class="size-4" />
            O Mestre está escrevendo...
          </p>
        </BubbleContent>
      </Bubble>
    </MessageContent>
  </Message>
</template>
