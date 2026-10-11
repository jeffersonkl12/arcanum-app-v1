<script setup lang="ts">
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import { actorCoinLimits, actorCoinOptions } from '@renderer/constant/actor.constant'

/** The coin fields of a form that has `coinFormShape`. Unlike the rolled stats, they are typed. */
defineProps<{
  disabled?: boolean
}>()

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const inputClass =
  'h-auto rounded-lg border-border bg-background px-3.5 py-2.5 text-center text-sm shadow-none'
</script>

<template>
  <div class="grid grid-cols-3 gap-4">
    <FormField
      v-for="coin in actorCoinOptions"
      :key="coin.key"
      v-slot="{ componentField }"
      :name="coin.key"
      keep-value
    >
      <FormItem class="gap-1.5">
        <FormLabel :class="fieldLabelClass">{{ coin.label }}</FormLabel>
        <FormControl>
          <Input
            type="number"
            inputmode="numeric"
            :min="actorCoinLimits.min"
            :max="actorCoinLimits.max"
            :placeholder="String(actorCoinLimits.default)"
            :disabled="disabled"
            :class="inputClass"
            v-bind="componentField"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
  </div>
</template>
