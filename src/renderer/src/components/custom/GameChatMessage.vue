<script setup lang="ts">
import { Pencil, RefreshCw, ThumbsDown, ThumbsUp, Trash2 } from '@lucide/vue'
import { toImageUrl } from '@shared'
import { ref } from 'vue'
import type { GameChatMessage } from '@renderer/composable/game.type'
import NarratorMarkdown from '@renderer/components/custom/NarratorMarkdown.vue'
import NarratorUi from '@renderer/components/custom/NarratorUi.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Bubble, BubbleContent } from '@renderer/components/ui/bubble'
import { Button } from '@renderer/components/ui/button'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader
} from '@renderer/components/ui/message'
import { Spinner } from '@renderer/components/ui/spinner'
import { Textarea } from '@renderer/components/ui/textarea'
import { cn } from '@renderer/lib/utils'

const props = defineProps<{
  message: GameChatMessage
  /** The player may pick the options the narrator offers in this message. */
  interactive?: boolean
  /** A turn is being played, so the reply cannot be rated or written again now. */
  busy?: boolean
  /** Saves the edited text and resolves to whether it worked; the editor stays open if not. */
  saveEdit?: (text: string) => Promise<boolean>
}>()

const emit = defineEmits<{
  choose: [text: string]
  rate: [rating: 1 | -1]
  regenerate: []
  delete: []
}>()

const editing = ref(false)
const editText = ref('')
const saving = ref(false)

function startEdit(): void {
  editText.value = props.message.text ?? ''
  editing.value = true
}

async function confirmEdit(): Promise<void> {
  const text = editText.value.trim()
  if (!props.saveEdit || text.length === 0 || saving.value) return

  saving.value = true
  try {
    if (text === props.message.text?.trim() || (await props.saveEdit(text))) editing.value = false
  } finally {
    saving.value = false
  }
}

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
          <div v-if="editing" class="flex flex-col gap-3">
            <Textarea
              v-model="editText"
              class="min-h-48 font-body text-base"
              aria-label="Editar resposta do Mestre"
              :disabled="saving"
            />
            <div class="flex justify-end gap-2">
              <Button variant="ghost" size="sm" :disabled="saving" @click="editing = false">
                Cancelar
              </Button>
              <Button
                size="sm"
                :disabled="saving || editText.trim().length === 0"
                @click="void confirmEdit()"
              >
                <Spinner v-if="saving" class="size-4" />
                Salvar
              </Button>
            </div>
          </div>
          <template v-else>
            <template
              v-for="(segment, index) in props.message.segments"
              :key="`${props.message.key}-${index}`"
            >
              <NarratorUi
                v-if="segment.kind === 'ui'"
                :source="segment.source"
                :streaming="props.message.isStreaming"
                :interactive="props.interactive"
                @choose="emit('choose', $event)"
              />
              <NarratorMarkdown v-else-if="segment.kind === 'markdown'" :source="segment.text" />
              <p v-else :class="cn(segment.kind === 'dialogue' && 'font-bold italic')">
                {{ segment.text }}
              </p>
            </template>
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
      <div
        v-if="props.message.role === 'master' && !props.message.isStreaming"
        class="flex items-center gap-1"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Gostei da resposta"
          :aria-pressed="props.message.rating === 1"
          :class="cn('text-muted-foreground', props.message.rating === 1 && 'text-primary')"
          @click="emit('rate', 1)"
        >
          <ThumbsUp :class="cn(props.message.rating === 1 && 'fill-current')" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Não gostei da resposta"
          :aria-pressed="props.message.rating === -1"
          :class="cn('text-muted-foreground', props.message.rating === -1 && 'text-destructive')"
          @click="emit('rate', -1)"
        >
          <ThumbsDown :class="cn(props.message.rating === -1 && 'fill-current')" />
        </Button>
        <Button
          v-if="props.message.canRegenerate"
          variant="ghost"
          size="sm"
          class="text-muted-foreground"
          :disabled="props.busy"
          @click="emit('regenerate')"
        >
          <RefreshCw />
          Gerar novamente
        </Button>
        <Button
          v-if="props.message.text"
          variant="ghost"
          size="icon-sm"
          class="text-muted-foreground"
          aria-label="Editar resposta"
          :disabled="props.busy || editing"
          @click="startEdit"
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          class="text-muted-foreground hover:text-destructive"
          aria-label="Excluir resposta do histórico"
          :disabled="props.busy"
          @click="emit('delete')"
        >
          <Trash2 />
        </Button>
      </div>
    </MessageContent>
  </Message>
</template>
