<script setup lang="ts">
import { Dices } from '@lucide/vue'
import { Button } from '@renderer/components/ui/button'
import { Spinner } from '@renderer/components/ui/spinner'

/** A small dice button for a form field: it only asks for the roll, the parent sets the value. */
defineProps<{
  label: string
  rolling?: boolean
  disabled?: boolean
}>()

defineEmits<{
  roll: []
}>()
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon"
    class="size-6 text-primary hover:bg-primary/10 hover:text-primary"
    :title="label"
    :aria-label="label"
    :disabled="disabled || rolling"
    @click="$emit('roll')"
  >
    <Spinner v-if="rolling" class="size-4" />
    <Dices v-else class="size-4" />
  </Button>
</template>
