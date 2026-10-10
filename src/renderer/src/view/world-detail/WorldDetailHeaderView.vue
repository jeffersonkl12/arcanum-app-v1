<script setup lang="ts">
import { Pencil } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { Button } from '@renderer/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@renderer/components/ui/breadcrumb'
import { useWorld } from '@renderer/composable/world.composable'

const { currentWorld } = useWorld()
</script>

<template>
  <header class="flex items-center justify-between gap-6">
    <Breadcrumb>
      <BreadcrumbList class="gap-2 text-sm sm:gap-2">
        <BreadcrumbItem>
          <BreadcrumbLink as-child>
            <RouterLink
              :to="{ name: 'worlds' }"
              class="font-normal text-tertiary hover:text-foreground"
            >
              Mundos
            </RouterLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator class="[&>svg]:size-4 [&>svg]:text-tertiary" />
        <BreadcrumbItem>
          <BreadcrumbPage class="font-semibold text-foreground">
            {{ currentWorld?.name }}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    <Button
      type="button"
      variant="secondary"
      class="h-auto gap-2 rounded-lg px-4 py-2 text-sm font-normal"
    >
      <Pencil class="size-4" />
      Editar Mundo
    </Button>
  </header>
</template>
