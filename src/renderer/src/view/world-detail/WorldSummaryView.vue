<script setup lang="ts">
import { toImageUrl } from '@shared'
import { Badge } from '@renderer/components/ui/badge'
import { useWorld } from '@renderer/composable/world.composable'

const { currentWorld } = useWorld()
</script>

<template>
  <section v-if="currentWorld" class="flex flex-col gap-6">
    <div class="h-45 w-full overflow-hidden rounded-xl bg-muted">
      <img
        v-if="currentWorld.imagePath"
        :src="toImageUrl(currentWorld.imagePath)"
        :alt="currentWorld.name"
        class="size-full object-cover"
      />
    </div>
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-4">
        <h1 class="font-heading text-hero font-bold text-foreground">
          {{ currentWorld.name }}
        </h1>
        <Badge
          variant="outline"
          class="h-auto rounded-full border-primary bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
        >
          {{ currentWorld.genre }}
        </Badge>
      </div>
      <p class="text-base leading-normal text-muted-foreground">
        {{ currentWorld.description }}
      </p>
    </div>
  </section>
</template>
