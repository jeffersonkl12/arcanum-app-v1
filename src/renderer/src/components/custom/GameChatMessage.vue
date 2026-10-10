<script setup lang="ts">
import { toImageUrl } from '@shared'
import type { GameChatMessage } from '@renderer/composable/game.type'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Bubble, BubbleContent } from '@renderer/components/ui/bubble'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader
} from '@renderer/components/ui/message'
import { cn } from '@renderer/lib/utils'

const props = defineProps<{
  message: GameChatMessage
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
    <MessageAvatar>
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
            'gap-2 px-0 text-meta',
            props.message.role === 'player' ? 'flex-row-reverse' : 'flex-row'
          )
        "
      >
        <span class="text-sm font-bold text-muted-foreground">
          {{ props.message.senderName }}
        </span>
        <span class="text-xs text-tertiary">{{ props.message.timeLabel }}</span>
      </MessageHeader>
      <Bubble
        variant="outline"
        :align="props.message.role === 'player' ? 'end' : 'start'"
        class="max-w-xl shadow-lg"
      >
        <BubbleContent
          :class="
            cn(
              'flex w-full flex-col gap-2.5 rounded-2xl border-border px-5 py-4 text-base leading-relaxed',
              props.message.role === 'player' ? 'bg-secondary' : 'bg-card'
            )
          "
        >
          <p
            v-for="(segment, index) in props.message.segments"
            :key="`${props.message.id}-${index}`"
            :class="cn('text-foreground', segment.kind === 'dialogue' && 'font-bold italic')"
          >
            {{ segment.text }}
          </p>
        </BubbleContent>
      </Bubble>
    </MessageContent>
  </Message>
</template>
