<script setup lang="ts">
import { Globe } from '@lucide/vue'
import { useGame } from '@renderer/composable/game.composable'

const { session } = useGame()
</script>

<template>
  <header
    class="flex w-full shrink-0 items-center justify-between border-b border-border px-8 py-5"
  >
    <div class="flex items-center gap-3">
      <Globe class="size-5 text-primary" />
      <div class="flex flex-col gap-0.5">
        <h1 class="font-heading text-xl font-bold text-foreground">
          {{ session?.worldName ?? 'Campanha' }}
        </h1>
      </div>
    </div>
  </header>
</template>
