<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { toImageUrl } from '@shared'
import type { Inventory, Item } from '@schema'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import CoinPurse from '@renderer/components/custom/CoinPurse.vue'
import { Button } from '@renderer/components/ui/button'
import { Spinner } from '@renderer/components/ui/spinner'
import type { ActorCoins } from '@renderer/constant/actor.constant'
import { toItemSummary } from '@renderer/composable/world.mapper'
import { useRequest } from '@renderer/composable/request.composable'

/** What an actor has equipped and what it only carries, with the buttons to equip and unequip. */
const props = defineProps<{
  actorId: string
  /** The coins the actor carries, shown above the items when given. */
  coins?: ActorCoins
}>()

const { isLoading, request } = useRequest()
const inventory = ref<Inventory>()
const busyItemId = ref<string>()

const equipmentSlots = [
  { slot: 'main_hand', label: 'Mão principal' },
  { slot: 'off_hand', label: 'Mão secundária' },
  { slot: 'body', label: 'Vestimenta' }
] as const

// Weapons that take both hands keep the main hand, which leaves the off hand taken.
const offHandTaken = computed(() => {
  const main = inventory.value?.equipment.main_hand
  return !!main && main.weaponClass !== 'light'
})

const carried = computed(() => (inventory.value?.items ?? []).filter((item) => !item.equippedSlot))

function tagsOf(item: Item): string {
  return toItemSummary(item).tags.join(' • ')
}

const isFull = computed(() => (inventory.value?.freeSlots ?? 1) <= 0)

function canEquip(item: Item): boolean {
  return item.type === 'weapon' || item.type === 'clothing'
}

async function change(item: Item, channel: 'inventory:equip' | 'inventory:unequip'): Promise<void> {
  if (busyItemId.value) return

  busyItemId.value = item.id
  try {
    const updated = await request(channel, item.id)
    if (!updated) return

    inventory.value = updated
    toast.success(channel === 'inventory:equip' ? `${item.name} equipado` : `${item.name} guardado`)
  } finally {
    busyItemId.value = undefined
  }
}

onMounted(async () => {
  inventory.value = await request('inventory:get', props.actorId)
})
</script>

<template>
  <div v-if="!inventory" class="flex items-center justify-center py-12">
    <Spinner v-if="isLoading" class="size-6 text-primary" />
  </div>

  <div v-else class="flex flex-col gap-5">
    <CoinPurse v-if="coins" :coins="coins" />

    <div class="flex items-center justify-between text-sm">
      <span :class="isFull ? 'font-medium text-destructive' : 'font-medium text-muted-foreground'">
        Espaços: {{ inventory.usedSlots }} / {{ inventory.capacity }}
      </span>
      <span class="text-xs text-tertiary">
        {{ inventory.freeSlots }} {{ inventory.freeSlots === 1 ? 'livre' : 'livres' }}
      </span>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-badge font-semibold tracking-wide text-tertiary uppercase">Equipado</span>
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="{ slot, label } in equipmentSlots"
          :key="slot"
          :class="[
            'flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-background px-3 py-2',
            slot === 'body' && 'col-span-2'
          ]"
        >
          <span class="text-badge font-semibold tracking-wide text-tertiary uppercase">
            {{ label }}
          </span>
          <template v-if="inventory.equipment[slot]">
            <span class="truncate text-sm font-semibold text-foreground">
              {{ inventory.equipment[slot]?.name }}
            </span>
            <span class="truncate text-xs text-muted-foreground">
              {{ tagsOf(inventory.equipment[slot]!) }}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="mt-1 h-auto self-start rounded-full bg-transparent px-3 py-1 text-xs font-semibold"
              :disabled="!!busyItemId"
              @click="change(inventory.equipment[slot]!, 'inventory:unequip')"
            >
              <Spinner v-if="busyItemId === inventory.equipment[slot]?.id" class="size-3" />
              Desequipar
            </Button>
          </template>
          <span v-else-if="slot === 'off_hand' && offHandTaken" class="text-sm text-tertiary">
            Ocupada pela arma de duas mãos
          </span>
          <span v-else class="text-sm text-tertiary">Vazio</span>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-badge font-semibold tracking-wide text-tertiary uppercase">
        No inventário
      </span>
      <div
        v-for="item in carried"
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
            {{ tagsOf(item) }}
          </span>
        </div>
        <span class="shrink-0 text-xs text-muted-foreground">
          {{ item.slots }} {{ item.slots === 1 ? 'espaço' : 'espaços' }}
        </span>
        <Button
          v-if="canEquip(item)"
          type="button"
          size="sm"
          class="h-auto shrink-0 rounded-full px-3 py-1 text-xs font-semibold hover:bg-primary-hover"
          :disabled="!!busyItemId"
          @click="change(item, 'inventory:equip')"
        >
          <Spinner v-if="busyItemId === item.id" class="size-3" />
          Equipar
        </Button>
      </div>
      <p v-if="carried.length === 0" class="text-sm text-tertiary">
        Nada guardado além do que está equipado.
      </p>
    </div>
  </div>
</template>
