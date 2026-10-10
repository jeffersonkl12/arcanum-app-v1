<script setup lang="ts">
import { Button } from '@renderer/components/ui/button'
import { WorldCard } from '@renderer/components/custom'
import { useWorld } from '@renderer/composable/world.composable'
import { cn } from '@renderer/lib/utils'

const { visibleWorlds, genreFilter, genreFilters } = useWorld()
</script>

<template>
  <section class="flex flex-col gap-6">
    <div class="flex items-center justify-between gap-4">
      <h2 class="font-body text-xl font-bold text-foreground">Seus Mundos</h2>
      <div class="flex gap-2">
        <Button
          v-for="filter in genreFilters"
          :key="filter"
          type="button"
          :variant="genreFilter === filter ? 'secondary' : 'outline'"
          :class="
            cn(
              'h-auto rounded-full px-4 py-1.5 text-meta font-medium',
              genreFilter === filter
                ? 'border-transparent'
                : 'bg-transparent text-tertiary hover:text-foreground'
            )
          "
          @click="genreFilter = filter"
        >
          {{ filter }}
        </Button>
      </div>
    </div>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(18rem,20rem))] gap-6">
      <WorldCard
        v-for="world in visibleWorlds"
        :id="world.id"
        :key="world.id"
        :name="world.name"
        :description="world.description"
        :genre="world.genre"
        :campaign-count="world.campaignCount"
      />
    </div>
  </section>
</template>
