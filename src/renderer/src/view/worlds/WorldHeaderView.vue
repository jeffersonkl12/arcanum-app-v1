<script setup lang="ts">
import { Search } from '@lucide/vue'
import { CreateWorldDialog } from '@renderer/components/custom'
import { Input } from '@renderer/components/ui/input'
import { useWorld } from '@renderer/composable/world.composable'
const { search } = useWorld()
</script>

<template>
  <header class="flex items-center justify-between gap-6">
    <h1 class="font-body text-display font-bold tracking-tight text-foreground">Mundos</h1>
    <div class="flex items-center gap-4">
      <label
        class="flex w-70 items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5"
      >
        <Search class="size-4.5 shrink-0 text-tertiary" />
        <Input
          v-model="search"
          type="search"
          placeholder="Buscar mundos..."
          class="h-auto border-0 bg-transparent p-0 text-sm shadow-none placeholder:text-tertiary focus-visible:ring-0"
        />
      </label>
      <CreateWorldDialog />
    </div>
  </header>
</template>
