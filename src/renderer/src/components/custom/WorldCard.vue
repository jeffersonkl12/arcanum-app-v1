<script setup lang="ts">
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@renderer/components/ui/card'

const props = defineProps<{
  name: string
  description: string
  genre: string
  campaignCount: number
}>()
</script>

<template>
  <Card
    class="w-full gap-0 overflow-hidden rounded-lg border border-border bg-card py-0 shadow-none ring-0"
  >
    <div class="relative h-35 bg-muted">
      <Badge
        class="absolute top-4 left-4 h-auto rounded-full border-transparent bg-black/60 px-2.5 py-1 text-badge font-semibold text-foreground"
      >
        {{ genre }}
      </Badge>
    </div>
    <CardContent class="flex flex-col gap-3 p-5">
      <CardTitle class="font-heading text-xl font-bold">{{ name }}</CardTitle>
      <CardDescription class="leading-normal">{{ description }}</CardDescription>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-meta text-tertiary">{{ props.campaignCount }} Campanhas</span>
        <Button
          v-if="campaignCount > 0"
          type="button"
          variant="secondary"
          class="h-auto rounded-lg px-3 py-1.5 text-meta font-semibold"
        >
          Entrar
        </Button>
        <Button
          v-else
          type="button"
          class="h-auto rounded-lg px-3 py-1.5 text-meta font-semibold hover:bg-primary-hover"
        >
          Iniciar Campanha
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
