<script setup lang="ts">
import { Plus, Search } from '@lucide/vue'
import { ref } from 'vue'
import { Avatar, AvatarFallback } from '@renderer/components/ui/avatar'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { useStartCampaign } from '@renderer/composable/start-campaign.composable'

const props = defineProps<{
  playerName: string
  worldName: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  createNpc: []
}>()

const { partyMembers, visibleNpcs, npcSearch, addPartyMember, removePartyMember } =
  useStartCampaign()

const searchField = ref<HTMLLabelElement>()

function focusNpcSearch(): void {
  searchField.value?.querySelector('input')?.focus()
}

function playerLabel(): string {
  const name = props.playerName.trim()
  return name.length > 0 ? `${name} (Você)` : 'Você'
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('')
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-bold text-foreground">Formar Grupo (Party)</h2>
      <p class="text-sm text-muted-foreground">
        Escolha quais NPCs te acompanharão desde o começo, ou crie novos.
      </p>
    </div>

    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap gap-6">
        <div class="flex w-20 flex-col items-center gap-2">
          <Avatar class="size-16 after:border-primary after:border-2">
            <AvatarFallback class="bg-muted text-sm font-semibold text-foreground">
              {{ initials(playerName || 'V') }}
            </AvatarFallback>
          </Avatar>
          <p class="text-center text-meta font-semibold text-foreground">{{ playerLabel() }}</p>
        </div>

        <div
          v-for="member in partyMembers"
          :key="member.id"
          class="flex w-20 flex-col items-center gap-2"
        >
          <Avatar class="size-16">
            <AvatarFallback class="bg-muted text-sm font-semibold text-foreground">
              {{ initials(member.name) }}
            </AvatarFallback>
          </Avatar>
          <p class="text-center text-meta font-semibold text-foreground">{{ member.name }}</p>
          <button
            type="button"
            class="text-badge text-destructive"
            :disabled="disabled"
            @click="removePartyMember(member.id)"
          >
            Remover
          </button>
        </div>

        <button
          type="button"
          class="flex w-20 flex-col items-center gap-2"
          :disabled="disabled"
          @click="focusNpcSearch"
        >
          <span
            class="flex size-16 items-center justify-center rounded-full border border-border bg-background text-tertiary"
          >
            <Search class="size-6" />
          </span>
          <span class="text-center text-meta text-tertiary">Buscar NPC</span>
        </button>

        <button
          type="button"
          class="flex w-20 flex-col items-center gap-2"
          :disabled="disabled"
          @click="emit('createNpc')"
        >
          <span
            class="flex size-16 items-center justify-center rounded-full border border-primary bg-primary/10 text-primary"
          >
            <Plus class="size-6" />
          </span>
          <span class="text-center text-meta font-semibold text-primary">Novo NPC</span>
        </button>
      </div>

      <div class="h-px w-full bg-border" />

      <div class="flex flex-col gap-1">
        <h3 class="text-base font-bold text-foreground">NPCs do Mundo</h3>
      </div>

      <label
        ref="searchField"
        class="flex w-full items-center gap-3 rounded-full border border-border bg-background px-4 py-2.5"
      >
        <Search class="size-4 shrink-0 text-tertiary" />
        <Input
          v-model="npcSearch"
          type="search"
          :placeholder="`Buscar personagens em ${worldName}...`"
          :disabled="disabled"
          class="h-auto border-0 bg-transparent p-0 text-meta shadow-none placeholder:text-tertiary focus-visible:ring-0"
        />
      </label>

      <div class="flex flex-col gap-3">
        <div
          v-for="npc in visibleNpcs"
          :key="npc.id"
          class="flex items-center gap-4 rounded-lg border border-border bg-card px-3 py-2"
        >
          <Avatar class="size-10">
            <AvatarFallback class="bg-muted text-xs font-semibold text-foreground">
              {{ initials(npc.name) }}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-foreground">{{ npc.name }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ npc.subtitle }}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            class="h-auto gap-1.5 rounded-lg bg-background px-3 py-1.5 text-xs font-semibold"
            :disabled="disabled"
            @click="addPartyMember(npc.id)"
          >
            <Plus class="size-3.5" />
            Adicionar
          </Button>
        </div>
        <p v-if="visibleNpcs.length === 0" class="text-sm text-muted-foreground">
          Nenhum NPC disponível para adicionar.
        </p>
      </div>
    </div>
  </div>
</template>
