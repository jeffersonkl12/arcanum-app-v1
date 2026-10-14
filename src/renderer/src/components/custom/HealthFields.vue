<script setup lang="ts">
import { useFormContext } from 'vee-validate'
import { ref } from 'vue'
import DiceFaces from '@renderer/components/custom/DiceFaces.vue'
import DiceRollButton from '@renderer/components/custom/DiceRollButton.vue'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import { useCharacterRoll } from '@renderer/composable/character-roll.composable'
import { actorHpLimits, actorRollRules } from '@renderer/constant/actor.constant'
import type { DiceRoll } from '@renderer/util/character-roll.util'

/**
 * The `hpMax` (and, when editing, `hpCurrent`) fields of a form that has `healthFormShape`. They
 * are never typed: the maximum is the sum of a throw of dice, and `locked` takes the dice away
 * too.
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

const { setFieldValue, values } = useFormContext()
const { isRolling, rollHitPoints } = useCharacterRoll()

// The throw that gave the maximum, to show the dice that fell; it is dropped once the field holds
// anything else (an actor being edited, a form reset).
const lastRoll = ref<DiceRoll>()

function rolledFaces(): number[] | undefined {
  return lastRoll.value?.score === values.hpMax ? lastRoll.value?.dice : undefined
}

/** An edited actor is made anew by the roll, so it comes out at full health. */
async function onRollHitPoints(isEditing?: boolean): Promise<void> {
  const roll = await rollHitPoints()
  if (!roll) return
  lastRoll.value = roll
  setFieldValue('hpMax', roll.score)
  if (isEditing) setFieldValue('hpCurrent', roll.score)
}

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const inputClass =
  'h-auto rounded-lg border-border bg-background px-3.5 py-2.5 text-center text-sm shadow-none read-only:cursor-default read-only:focus-visible:ring-0'
</script>

<template>
  <div class="flex flex-col gap-2">
    <p v-if="!locked" class="text-meta text-muted-foreground">
      A vida máxima é a soma de {{ actorRollRules.hitPointDice }}d6 (de {{ actorHpLimits.minMax }} a
      {{ actorHpLimits.max }}).
      <template v-if="defaultMax !== undefined && !showCurrent">
        Sem rolar, usa o padrão ({{ defaultMax }}).
      </template>
    </p>

    <div class="flex flex-wrap items-start gap-4">
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
          <div v-if="!locked" class="flex min-h-5 items-center justify-center">
            <DiceFaces v-if="rolledFaces()" :faces="rolledFaces() ?? []" />
          </div>
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
  </div>
</template>
