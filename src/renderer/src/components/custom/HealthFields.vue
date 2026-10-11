<script setup lang="ts">
import { useFormContext } from 'vee-validate'
import DiceRollButton from '@renderer/components/custom/DiceRollButton.vue'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import { useCharacterRoll } from '@renderer/composable/character-roll.composable'
import { actorRollRules } from '@renderer/constant/actor.constant'

/**
 * The `hpMax` (and, when editing, `hpCurrent`) fields of a form that has `healthFormShape`. They
 * are never typed: the maximum comes from the die, and `locked` takes the die away too.
 */
defineProps<{
  /** Ask the current health too: only for an actor that already exists. */
  showCurrent?: boolean
  /** What the engine gives when the maximum is left empty. */
  defaultMax?: number
  /** The health can no longer be changed at all (the campaign has started). */
  locked?: boolean
  disabled?: boolean
}>()

const { setFieldValue } = useFormContext()
const { isRolling, rollHitPoints } = useCharacterRoll()

/** An edited actor is made anew by the roll, so it comes out at full health. */
async function onRollHitPoints(isEditing?: boolean): Promise<void> {
  const hitPoints = await rollHitPoints()
  if (hitPoints === undefined) return
  setFieldValue('hpMax', hitPoints)
  if (isEditing) setFieldValue('hpCurrent', hitPoints)
}

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const inputClass =
  'h-auto rounded-lg border-border bg-background px-3.5 py-2.5 text-center text-sm shadow-none read-only:cursor-default read-only:focus-visible:ring-0'
</script>

<template>
  <div class="flex flex-wrap gap-4">
    <FormField v-slot="{ componentField }" name="hpMax" keep-value>
      <FormItem class="w-28 gap-1.5">
        <div class="flex min-h-6 items-center justify-between">
          <FormLabel :class="fieldLabelClass">Vida máxima</FormLabel>
          <DiceRollButton
            v-if="!locked"
            :label="`Rolar ${actorRollRules.hitPointDice}d6 para a vida máxima`"
            :rolling="isRolling"
            :disabled="disabled"
            @roll="onRollHitPoints(showCurrent)"
          />
        </div>
        <FormControl>
          <Input
            :model-value="componentField.modelValue"
            readonly
            :class="inputClass"
            :placeholder="String(defaultMax ?? '')"
          />
        </FormControl>
        <FormDescription v-if="defaultMax !== undefined && !showCurrent" class="text-badge">
          Vazio usa o padrão ({{ defaultMax }}).
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-if="showCurrent" v-slot="{ componentField }" name="hpCurrent" keep-value>
      <FormItem class="w-28 gap-1.5">
        <div class="flex min-h-6 items-center">
          <FormLabel :class="fieldLabelClass">Vida atual</FormLabel>
        </div>
        <FormControl>
          <Input :model-value="componentField.modelValue" readonly :class="inputClass" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
  </div>
</template>
