<script setup lang="ts">
import { actorCoinOptions, type ActorCoins } from '@renderer/constant/actor.constant'

/** The coins (peças) of a character, read-only. */
defineProps<{
  coins: ActorCoins
}>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-badge font-semibold tracking-wide text-tertiary uppercase">Moedas</span>
    <div class="grid grid-cols-3 gap-3">
      <div
        v-for="coin in actorCoinOptions"
        :key="coin.key"
        class="flex flex-col items-center gap-1 rounded-lg border border-border bg-background px-3 py-2"
      >
        <span class="text-badge font-semibold tracking-wide text-tertiary uppercase">
          {{ coin.label }}
        </span>
        <span class="text-lg font-bold text-foreground">
          {{ coins[coin.key].toLocaleString('pt-BR') }}
        </span>
      </div>
    </div>
  </div>
</template>
