<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toImageUrl } from '@shared'
import CreateItemDialog from '@renderer/components/custom/CreateItemDialog.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Button } from '@renderer/components/ui/button'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { itemLimits } from '@renderer/constant/item.constant'
import { useWorld } from '@renderer/composable/world.composable'
import type { ItemSummary } from '@renderer/composable/world.type'
import { cn } from '@renderer/lib/utils'

/** The item ids the actor will carry; saved by the dialog that owns this picker. */
const selected = defineModel<string[]>({ required: true })

const props = defineProps<{
  /** Items the actor already carries (editing): they are offered too, though they are "carried". */
  carriedIds: string[]
  disabled?: boolean
}>()

const { items } = useWorld()
const createOpen = ref(false)
const creating = ref<ItemSummary | null>(null)

// Items nobody carries, plus the ones this actor carries now.
const offered = computed(() =>
  items.value.filter((item) => !item.isCarried || props.carriedIds.includes(item.id))
)

const usedSlots = computed(() =>
  offered.value
    .filter((item) => selected.value.includes(item.id))
    .reduce((total, item) => total + item.slots, 0)
)

function fitsIn(item: ItemSummary): boolean {
  return (
    selected.value.includes(item.id) || usedSlots.value + item.slots <= itemLimits.inventoryCapacity
  )
}

function toggle(item: ItemSummary, checked: boolean | 'indeterminate'): void {
  selected.value =
    checked === true ? [...selected.value, item.id] : selected.value.filter((id) => id !== item.id)
}

// An item created here goes straight into the inventory, if it fits.
function onCreated(item: ItemSummary): void {
  if (fitsIn(item)) {
    selected.value = [...selected.value, item.id]
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-4">
      <p
        :class="
          cn(
            'text-sm font-medium',
            usedSlots >= itemLimits.inventoryCapacity ? 'text-destructive' : 'text-muted-foreground'
          )
        "
      >
        Espaços: {{ usedSlots }} / {{ itemLimits.inventoryCapacity }}
      </p>
      <Button
        type="button"
        variant="outline"
        class="h-auto gap-2 rounded-full bg-transparent px-4 py-2 text-sm font-semibold"
        :disabled="disabled"
        @click="createOpen = true"
      >
        <Plus class="size-4" />
        Criar novo item
      </Button>
      <CreateItemDialog
        v-model:open="createOpen"
        v-model:entity="creating"
        :show-trigger="false"
        @saved="onCreated"
      />
    </div>

    <div class="flex max-h-72 flex-col gap-2 overflow-y-auto">
      <label
        v-for="item in offered"
        :key="item.id"
        :class="
          cn(
            'flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-2',
            !fitsIn(item) && 'cursor-not-allowed opacity-50'
          )
        "
      >
        <Checkbox
          :model-value="selected.includes(item.id)"
          :disabled="disabled || !fitsIn(item)"
          @update:model-value="toggle(item, $event)"
        />
        <Avatar class="size-9 rounded-lg after:border-transparent">
          <AvatarImage v-if="item.imagePath" :src="toImageUrl(item.imagePath)" :alt="item.name" />
          <AvatarFallback class="rounded-lg">{{ item.name.slice(0, 1) }}</AvatarFallback>
        </Avatar>
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-sm font-semibold text-foreground">{{ item.name }}</span>
          <span class="truncate text-xs text-muted-foreground">{{ item.tags.join(' • ') }}</span>
        </div>
        <span class="shrink-0 text-xs text-muted-foreground">
          {{ item.slots }} {{ item.slots === 1 ? 'espaço' : 'espaços' }}
        </span>
      </label>
      <p v-if="offered.length === 0" class="text-sm text-tertiary">
        Nenhum item livre neste mundo. Crie um novo para o inventário.
      </p>
    </div>
  </div>
</template>
