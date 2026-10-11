<script setup lang="ts">
import {
  FormControl,
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
import { actorAttributeLimits, actorAttributeOptions } from '@renderer/constant/actor.constant'

/** The attribute fields of a form that has `attributeFormShape`. */
defineProps<{
  disabled?: boolean
}>()

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const inputClass = 'h-auto rounded-lg border-border bg-background px-3.5 py-2.5 text-sm shadow-none'
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="grid grid-cols-3 gap-4">
      <FormField
        v-for="attribute in actorAttributeOptions"
        :key="attribute.key"
        v-slot="{ componentField }"
        :name="attribute.key"
        keep-value
      >
        <FormItem class="gap-1.5">
          <FormLabel :class="fieldLabelClass">{{ attribute.label }}</FormLabel>
          <NumberField
            :model-value="componentField.modelValue"
            :min="actorAttributeLimits.min"
            :max="actorAttributeLimits.max"
            :disabled="disabled"
            @update:model-value="componentField['onUpdate:modelValue']"
          >
            <NumberFieldContent>
              <NumberFieldDecrement />
              <FormControl>
                <NumberFieldInput
                  :class="inputClass"
                  :placeholder="String(actorAttributeLimits.default)"
                />
              </FormControl>
              <NumberFieldIncrement />
            </NumberFieldContent>
          </NumberField>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
    <!-- Not a FormDescription: that one only works inside a FormField/FormItem. -->
    <p class="text-badge text-muted-foreground">
      De {{ actorAttributeLimits.min }} a {{ actorAttributeLimits.max }}. Vazio usa o padrão ({{
        actorAttributeLimits.default
      }}).
    </p>
  </div>
</template>
