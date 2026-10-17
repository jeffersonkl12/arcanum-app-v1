<script setup lang="ts">
import { Users } from '@lucide/vue'
import GameDocumentsTab from '@renderer/view/game/GameDocumentsTab.vue'
import GameNpcsTab from '@renderer/view/game/GameNpcsTab.vue'
import GamePlacesTab from '@renderer/view/game/GamePlacesTab.vue'
import PartyMemberCard from '@renderer/components/custom/PartyMemberCard.vue'
import { useGame } from '@renderer/composable/game.composable'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'

const {
  session,
  currentPlace,
  placeNpcs,
  player,
  npcs,
  sidebarTab,
  partyOpen,
  openCharacterSheet
} = useGame()
</script>

<template>
  <aside class="flex h-full w-96 shrink-0 flex-col border-l border-border bg-card">
    <Tabs v-model="sidebarTab" class="flex min-h-0 flex-1 flex-col gap-0">
      <TabsList
        variant="line"
        class="h-auto group-data-horizontal/tabs:h-auto w-full justify-start gap-4 overflow-x-auto rounded-none border-b border-border bg-transparent px-5 pt-3"
      >
        <TabsTrigger
          value="party"
          class="h-auto flex-none rounded-none px-1 pt-3 pb-4 text-base font-semibold data-active:text-primary after:bg-primary"
        >
          Grupo
        </TabsTrigger>
        <TabsTrigger
          value="places"
          class="h-auto flex-none rounded-none px-1 pt-3 pb-4 text-base font-medium data-active:text-primary after:bg-primary"
        >
          Lugares
        </TabsTrigger>
        <TabsTrigger
          value="npcs"
          class="h-auto flex-none rounded-none px-1 pt-3 pb-4 text-base font-medium data-active:text-primary after:bg-primary"
        >
          NPCs
        </TabsTrigger>
        <TabsTrigger
          value="documents"
          class="h-auto flex-none rounded-none px-1 pt-3 pb-4 text-base font-medium data-active:text-primary after:bg-primary"
        >
          Documentos
        </TabsTrigger>
        <TabsTrigger
          value="journal"
          class="h-auto flex-none rounded-none px-1 pt-3 pb-4 text-base font-medium data-active:text-primary after:bg-primary"
        >
          Diário
        </TabsTrigger>
      </TabsList>

      <TabsContent value="party" class="mt-0 min-h-0 flex-1 overflow-hidden">
        <ScrollArea class="h-full">
          <div class="flex flex-col gap-6 p-6">
            <div class="flex flex-col gap-3">
              <p class="text-xs font-bold tracking-wide text-tertiary uppercase">Mundo</p>
              <p class="text-sm font-bold text-foreground">{{ session?.worldName }}</p>
            </div>
            <div class="flex flex-col gap-3">
              <p class="text-xs font-bold tracking-wide text-tertiary uppercase">Localização</p>
              <div v-if="currentPlace" class="flex flex-col gap-0.5">
                <p class="text-sm font-bold text-foreground">{{ currentPlace.name }}</p>
                <p class="text-xs text-muted-foreground">{{ currentPlace.type }}</p>
              </div>
              <p v-else class="text-sm text-tertiary">Local desconhecido.</p>
            </div>
            <div class="flex flex-col gap-3">
              <p class="text-xs font-bold tracking-wide text-tertiary uppercase">Jogador</p>
              <PartyMemberCard
                v-if="player"
                :member="player"
                @select="openCharacterSheet(player.id)"
              />
              <p v-else class="text-sm text-tertiary">Nenhum jogador no grupo.</p>
            </div>
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-bold tracking-wide text-tertiary uppercase">NPCs do grupo</p>
                <Button
                  type="button"
                  variant="outline"
                  class="h-auto gap-1.5 rounded-full bg-transparent px-3 py-1.5 text-xs font-semibold"
                  @click="partyOpen = true"
                >
                  <Users class="size-3.5" />
                  Gerenciar grupo
                </Button>
              </div>
              <div class="flex flex-col gap-3">
                <PartyMemberCard
                  v-for="npc in npcs"
                  :key="npc.id"
                  :member="npc"
                  @select="openCharacterSheet(npc.id)"
                />
                <p v-if="npcs.length === 0" class="text-sm text-tertiary">Nenhum NPC no grupo.</p>
              </div>
            </div>
            <div class="flex flex-col gap-3">
              <p class="text-xs font-bold tracking-wide text-tertiary uppercase">NPCs no local</p>
              <div class="flex flex-col gap-3">
                <PartyMemberCard
                  v-for="npc in placeNpcs"
                  :key="npc.id"
                  :member="npc"
                  @select="openCharacterSheet(npc.id)"
                />
                <p v-if="placeNpcs.length === 0" class="text-sm text-tertiary">
                  Nenhum NPC neste local.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="places" class="mt-0 min-h-0 flex-1 overflow-hidden">
        <GamePlacesTab />
      </TabsContent>

      <TabsContent value="npcs" class="mt-0 min-h-0 flex-1 overflow-hidden">
        <GameNpcsTab />
      </TabsContent>

      <TabsContent value="documents" class="mt-0 min-h-0 flex-1 overflow-hidden">
        <GameDocumentsTab />
      </TabsContent>

      <TabsContent value="journal" class="mt-0 min-h-0 flex-1 overflow-hidden p-6">
        <!-- Proposed: journal channel not in ipcContract yet. -->
        <p class="text-sm text-tertiary">O diário da campanha ainda não está disponível.</p>
      </TabsContent>
    </Tabs>
  </aside>
</template>
