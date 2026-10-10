<script setup lang="ts">
import { toImageUrl } from '@shared'
import HealthBar from '@renderer/components/custom/HealthBar.vue'
import type { PartyMemberCardModel } from '@renderer/composable/game.type'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'

const props = defineProps<{
  member: PartyMemberCardModel
}>()

defineEmits<{
  select: []
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
  <button
    type="button"
    class="flex w-full flex-col gap-2.5 rounded-lg border border-border bg-card p-3.5 text-left transition-colors hover:bg-secondary/60"
    @click="$emit('select')"
  >
    <div class="flex w-full items-center gap-3">
      <Avatar size="lg" class="after:border-transparent">
        <AvatarImage
          v-if="props.member.imagePath"
          :src="toImageUrl(props.member.imagePath)"
          :alt="props.member.name"
        />
        <AvatarFallback>{{ initials(props.member.name) }}</AvatarFallback>
      </Avatar>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <p class="truncate text-sm font-bold text-foreground">{{ props.member.name }}</p>
        <p class="truncate text-xs text-muted-foreground">{{ props.member.roleLabel }}</p>
      </div>
    </div>
    <HealthBar :current="props.member.hpCurrent" :max="props.member.hpMax" />
  </button>
</template>
