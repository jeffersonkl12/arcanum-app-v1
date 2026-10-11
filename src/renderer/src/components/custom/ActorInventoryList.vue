<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toImageUrl } from '@shared'
import type { Inventory, Item } from '@schema'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Spinner } from '@renderer/components/ui/spinner'
import { toItemSummary } from '@renderer/composable/world.mapper'
import { useRequest } from '@renderer/composable/request.composable'
import type { ItemSummary } from '@renderer/composable/world.type'

/** Read-only view of what an actor carries and has equipped. */
const props = defineProps<{
  actorId: string
}>()

const { isLoading, request } = useRequest()
const inventory = ref<Inventory>()

const equipmentSlots = [
  { slot: 'main_hand', label: 'Mão principal' },
  { slot: 'off_hand', label: 'Mão secundária' },
  { slot: 'torso', label: 'Tronco' },
  { slot: 'head', label: 'Cabeça' }
] as const

function summaryOf(item: Item | null): ItemSummary | undefined {
  return item ? toItemSummary(item) : undefined
}

onMounted(async () => {
  inventory.value = await request('inventory:get', props.actorId)
})
</script>

<template>
  <div v-if="isLoading || !inventory" class="flex items-center justify-center py-12">
    <Spinner class="size-6 text-primary" />
  </div>

  <div v-else class="flex flex-col gap-4">
    <div class="flex items-center justify-between text-sm">
      <span class="font-medium text-muted-foreground">
        Espaços: {{ inventory.usedSlots }} / {{ inventory.capacity }}
      </span>
      <span class="font-medium text-muted-foreground">
        Bônus de armadura: +{{ inventory.armorBonus }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div
        v-for="{ slot, label } in equipmentSlots"
        :key="slot"
        class="flex flex-col gap-1 rounded-lg border border-border bg-background px-3 py-2"
      >
        <span class="text-badge font-semibold tracking-wide text-tertiary uppercase">
          {{ label }}
        </span>
        <span class="truncate text-sm font-medium text-foreground">
          {{ inventory.equipment[slot]?.name ?? 'Vazio' }}
        </span>
        <span
          v-if="summaryOf(inventory.equipment[slot])"
          class="truncate text-xs text-muted-foreground"
        >
          {{ summaryOf(inventory.equipment[slot])?.tags.join(' • ') }}
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-badge font-semibold tracking-wide text-tertiary uppercase">Itens</span>
      <div
        v-for="item in inventory.items"
        :key="item.id"
        class="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
      >
        <Avatar class="size-9 rounded-lg after:border-transparent">
          <AvatarImage v-if="item.imagePath" :src="toImageUrl(item.imagePath)" :alt="item.name" />
          <AvatarFallback class="rounded-lg">{{ item.name.slice(0, 1) }}</AvatarFallback>
        </Avatar>
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-sm font-semibold text-foreground">{{ item.name }}</span>
          <span class="truncate text-xs text-muted-foreground">
            {{ toItemSummary(item).tags.join(' • ') }}
          </span>
        </div>
        <span v-if="item.equippedSlot" class="shrink-0 text-xs font-semibold text-primary">
          Equipado
        </span>
        <span class="shrink-0 text-xs text-muted-foreground">
          {{ item.slots }} {{ item.slots === 1 ? 'espaço' : 'espaços' }}
        </span>
      </div>
      <p v-if="inventory.items.length === 0" class="text-sm text-tertiary">
        Este personagem não carrega nada.
      </p>
    </div>
  </div>
</template>
