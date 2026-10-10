<script setup lang="ts">
import { Hexagon } from '@lucide/vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { Button } from '@renderer/components/ui/button'
import { footerNavigation, mainNavigation, type AppNavItem } from '@renderer/constant'
import { cn } from '@renderer/lib/utils'

const route = useRoute()
const router = useRouter()

function isActive(item: AppNavItem): boolean {
  return item.routeName !== undefined && route.name === item.routeName
}

function open(item: AppNavItem): void {
  if (item.routeName) router.push({ name: item.routeName })
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-background font-body text-foreground">
    <aside
      class="flex h-full w-70 shrink-0 flex-col gap-8 border-r border-border bg-card px-6 py-8"
    >
      <div class="flex items-center gap-3">
        <Hexagon class="size-8 text-primary" fill="currentColor" stroke-width="0" />
        <span class="text-xl font-bold tracking-tight">Mythos IA</span>
      </div>
      <nav class="flex flex-col gap-2">
        <Button
          v-for="item in mainNavigation"
          :key="item.label"
          type="button"
          :variant="isActive(item) ? 'secondary' : 'ghost'"
          :class="
            cn(
              'h-auto w-full justify-start gap-3 rounded-lg px-4 py-3 text-sm',
              isActive(item) ? 'font-semibold' : 'font-medium text-muted-foreground'
            )
          "
          @click="open(item)"
        >
          <component :is="item.icon" class="size-5" />
          {{ item.label }}
        </Button>
      </nav>
      <div class="flex-1" />
      <nav class="flex flex-col gap-2">
        <Button
          v-for="item in footerNavigation"
          :key="item.label"
          type="button"
          variant="ghost"
          class="h-auto w-full justify-start gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground"
          @click="open(item)"
        >
          <component :is="item.icon" class="size-5" />
          {{ item.label }}
        </Button>
      </nav>
    </aside>
    <main class="min-h-0 min-w-0 flex-1 overflow-y-auto px-16 py-12">
      <RouterView />
    </main>
  </div>
</template>
