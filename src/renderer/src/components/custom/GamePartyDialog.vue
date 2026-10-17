<script setup lang="ts">
import { Plus, Search, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { toImageUrl } from '@shared'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { partyLimits } from '@renderer/constant/party.constant'
import { useGame } from '@renderer/composable/game.composable'
import { toPartyMemberCard } from '@renderer/composable/game.mapper'
import type { PartyMemberCardModel } from '@renderer/composable/game.type'

/** The party of the campaign: who is in it, who could join, and a way to make a new NPC for it. */
const {
  player,
  npcs,
  actors,
  partyOpen,
  isChangingParty,
  addPartyMember,
  removePartyMember,
  requestCreatePartyNpc
} = useGame()

const search = ref('')

/** The NPCs of the campaign that are not in the party. */
const available = computed<PartyMemberCardModel[]>(() => {
  const term = search.value.trim().toLocaleLowerCase()
  return actors.value
    .filter((actor) => actor.isNpc && !actor.partyId)
    .map(toPartyMemberCard)
    .filter((card) => !term || `${card.name} ${card.roleLabel}`.toLocaleLowerCase().includes(term))
})

const isFull = computed(() => npcs.value.length >= partyLimits.maxNpcs)

watch(partyOpen, (isOpen) => {
  if (!isOpen) search.value = ''
})

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
  <Dialog v-model:open="partyOpen">
    <DialogPortal>
      <DialogOverlay class="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[560px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-6 overflow-y-auto rounded-xl border border-border bg-card p-8 text-foreground shadow-dialog outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
      >
        <DialogDescription class="sr-only">
          Veja quem está no grupo, remova membros, adicione NPCs da campanha ou crie um novo.
        </DialogDescription>

        <div class="flex items-center justify-between gap-4">
          <DialogTitle class="font-body text-xl font-bold">Gerenciar grupo</DialogTitle>
          <DialogClose class="text-tertiary">
            <X class="size-5" />
            <span class="sr-only">Fechar</span>
          </DialogClose>
        </div>

        <div class="flex flex-col gap-3">
          <p class="text-xs font-bold tracking-wide text-tertiary uppercase">
            No grupo ({{ npcs.length + (player ? 1 : 0) }}/{{ partyLimits.maxMembers }})
          </p>

          <div
            v-if="player"
            class="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
          >
            <Avatar class="size-10 after:border-primary after:border-2">
              <AvatarImage v-if="player.imagePath" :src="toImageUrl(player.imagePath)" />
              <AvatarFallback>{{ initials(player.name) }}</AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-foreground">{{ player.name }}</p>
              <p class="truncate text-xs text-muted-foreground">Você</p>
            </div>
          </div>

          <div
            v-for="member in npcs"
            :key="member.id"
            class="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
          >
            <Avatar class="size-10 after:border-transparent">
              <AvatarImage v-if="member.imagePath" :src="toImageUrl(member.imagePath)" />
              <AvatarFallback>{{ initials(member.name) }}</AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-foreground">{{ member.name }}</p>
              <p class="truncate text-xs text-muted-foreground">{{ member.roleLabel }}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              class="h-auto px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
              :disabled="isChangingParty"
              @click="void removePartyMember(member.id)"
            >
              Remover
            </Button>
          </div>
          <p v-if="npcs.length === 0" class="text-sm text-tertiary">Nenhum NPC no grupo.</p>
        </div>

        <div class="h-px w-full bg-border" />

        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-bold tracking-wide text-tertiary uppercase">NPCs disponíveis</p>
            <Button
              type="button"
              class="h-auto gap-1.5 rounded-full px-4 py-2 text-xs font-semibold hover:bg-primary-hover"
              :disabled="isChangingParty"
              @click="void requestCreatePartyNpc()"
            >
              <Plus class="size-3.5" />
              Criar novo NPC
            </Button>
          </div>

          <label
            class="flex w-full items-center gap-3 rounded-full border border-border bg-background px-4 py-2.5"
          >
            <Search class="size-4 shrink-0 text-tertiary" />
            <Input
              v-model="search"
              type="search"
              placeholder="Buscar NPC da campanha..."
              class="h-auto border-0 bg-transparent p-0 text-meta shadow-none placeholder:text-tertiary focus-visible:ring-0"
            />
          </label>

          <p v-if="isFull" class="text-xs text-destructive">
            O grupo está cheio ({{ partyLimits.maxMembers }} membros com você). Remova alguém para
            adicionar outro NPC.
          </p>

          <ScrollArea class="max-h-64">
            <div class="flex flex-col gap-2">
              <div
                v-for="npc in available"
                :key="npc.id"
                class="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
              >
                <Avatar class="size-10 after:border-transparent">
                  <AvatarImage v-if="npc.imagePath" :src="toImageUrl(npc.imagePath)" />
                  <AvatarFallback>{{ initials(npc.name) }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-bold text-foreground">{{ npc.name }}</p>
                  <p class="truncate text-xs text-muted-foreground">{{ npc.roleLabel }}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  class="h-auto gap-1.5 rounded-lg bg-background px-3 py-1.5 text-xs font-semibold"
                  :disabled="isChangingParty || isFull"
                  @click="void addPartyMember(npc.id)"
                >
                  <Plus class="size-3.5" />
                  Adicionar
                </Button>
              </div>
              <p v-if="available.length === 0" class="text-sm text-tertiary">
                Nenhum NPC disponível para adicionar.
              </p>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
