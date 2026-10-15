<script setup lang="ts">
import { toImageUrl } from '@shared'
import HealthBar from '@renderer/components/custom/HealthBar.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Badge } from '@renderer/components/ui/badge'
import type { NpcCardModel } from '@renderer/composable/game.type'

defineProps<{
  npc: NpcCardModel
}>()

defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    type="button"
    class="flex w-full flex-col gap-2.5 rounded-lg border border-border bg-card p-3.5 text-left transition-colors hover:bg-secondary/60"
    @click="$emit('select')"
  >
    <div class="flex w-full items-center gap-3">
      <Avatar size="lg" class="after:border-transparent">
        <AvatarImage v-if="npc.imagePath" :src="toImageUrl(npc.imagePath)" :alt="npc.name" />
        <AvatarFallback>{{ npc.name.slice(0, 1) }}</AvatarFallback>
      </Avatar>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <p class="truncate text-sm font-bold text-foreground">{{ npc.name }}</p>
        <p class="truncate text-xs text-muted-foreground">{{ npc.roleLabel }}</p>
      </div>
      <Badge
        v-if="npc.inParty"
        class="h-auto rounded-full border-transparent bg-primary/15 px-2 py-0.5 text-badge font-bold text-primary uppercase"
      >
        Grupo
      </Badge>
    </div>
    <p class="truncate text-xs text-tertiary">{{ npc.placeLabel }}</p>
    <HealthBar :current="npc.hpCurrent" :max="npc.hpMax" />
  </button>
</template>
