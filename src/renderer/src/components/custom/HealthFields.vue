<script setup lang="ts">
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput
} from '@renderer/components/ui/number-field'
import { actorHpLimits } from '@renderer/constant/actor.constant'

/** The `hpMax` (and, when editing, `hpCurrent`) fields of a form that has `healthFormShape`. */
defineProps<{
  /** Ask the current health too: only for an actor that already exists. */
  showCurrent?: boolean
  /** What the engine gives when the maximum is left empty. */
  defaultMax?: number
  disabled?: boolean
}>()

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const inputClass = 'h-auto rounded-lg border-border bg-background px-3.5 py-2.5 text-sm shadow-none'
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <FormField v-slot="{ componentField }" name="hpMax" keep-value>
      <FormItem class="gap-1.5">
        <FormLabel :class="fieldLabelClass">Vida máxima</FormLabel>
        <NumberField
          :model-value="componentField.modelValue"
          :min="actorHpLimits.minMax"
          :max="actorHpLimits.max"
          :disabled="disabled"
          @update:model-value="componentField['onUpdate:modelValue']"
        >
          <NumberFieldContent>
            <NumberFieldDecrement />
            <FormControl>
              <NumberFieldInput :class="inputClass" :placeholder="String(defaultMax ?? '')" />
            </FormControl>
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>
        <FormDescription v-if="defaultMax !== undefined && !showCurrent" class="text-badge">
          Vazio usa o padrão ({{ defaultMax }}).
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-if="showCurrent" v-slot="{ componentField }" name="hpCurrent" keep-value>
      <FormItem class="gap-1.5">
        <FormLabel :class="fieldLabelClass">Vida atual</FormLabel>
        <NumberField
          :model-value="componentField.modelValue"
          :min="0"
          :max="actorHpLimits.max"
          :disabled="disabled"
          @update:model-value="componentField['onUpdate:modelValue']"
        >
          <NumberFieldContent>
            <NumberFieldDecrement />
            <FormControl>
              <NumberFieldInput :class="inputClass" />
            </FormControl>
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>
        <FormMessage />
      </FormItem>
    </FormField>
  </div>
</template>
