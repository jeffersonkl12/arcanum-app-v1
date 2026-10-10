<script setup lang="ts">
import { Play } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { Button } from '@renderer/components/ui/button'
import { useCampaign } from '@renderer/composable/campaign.composable'

const { activeCampaign } = useCampaign()
const router = useRouter()

function enterSession(): void {
  if (!activeCampaign.value) return
  void router.push({ name: 'game', params: { worldId: activeCampaign.value.id } })
}
</script>

<template>
  <section v-if="activeCampaign" class="relative h-65 overflow-hidden rounded-xl bg-muted">
    <div class="pointer-events-none absolute inset-0 bg-primary/20" />
    <div
      class="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-20% to-card"
    />
    <div class="relative flex h-full flex-col justify-end gap-4 p-8">
      <p class="text-xs font-bold tracking-widest text-primary">CONTINUAR CAMPANHA</p>
      <div class="flex items-center justify-between gap-6">
        <h2 class="font-heading text-4xl font-bold text-foreground">
          {{ activeCampaign.name }}
        </h2>
        <Button
          type="button"
          class="h-auto shrink-0 gap-3 rounded-full bg-foreground px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-foreground/90"
          @click="enterSession"
        >
          <Play class="size-5 fill-primary-foreground" />
          Entrar na Sessão
        </Button>
      </div>
    </div>
  </section>
</template>
