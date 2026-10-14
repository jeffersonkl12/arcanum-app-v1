<script setup lang="ts">
import { Dices } from '@lucide/vue'
import { useFormContext } from 'vee-validate'
import { ref } from 'vue'
import DiceFaces from '@renderer/components/custom/DiceFaces.vue'
import DicePips from '@renderer/components/custom/DicePips.vue'
import DiceRollButton from '@renderer/components/custom/DiceRollButton.vue'
import { Button } from '@renderer/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import { useCharacterRoll } from '@renderer/composable/character-roll.composable'
import type { DiceRoll } from '@renderer/util/character-roll.util'
import {
  actorAttributeLimits,
  actorAttributeOptions,
  actorRollRules,
  type ActorAttributeKey
} from '@renderer/constant/actor.constant'

/**
 * The attribute fields of a form that has `attributeFormShape`. They are never typed: each score
 * is the highest die of a throw and comes from the dice, and `locked` takes the dice away too. A
 * score is also how many d6 a check rolls, so it is drawn as a pool of dice under its field.
 */
defineProps<{
  /** The scores can no longer be changed at all (the campaign has started). */
  locked?: boolean
  disabled?: boolean
}>()

const { setFieldValue, values } = useFormContext()
const { isRolling, rollAttribute, rollAttributes } = useCharacterRoll()

// The throw that gave each score, to show the dice that fell; a score set by anything else (an
// actor being edited, a form reset) has no throw to show.
const lastRolls = ref<Partial<Record<ActorAttributeKey, DiceRoll>>>({})

function scoreOf(key: ActorAttributeKey): number | undefined {
  const score: unknown = values[key]
  return typeof score === 'number' ? score : undefined
}

function rolledFaces(key: ActorAttributeKey): number[] | undefined {
  const roll = lastRolls.value[key]
  return roll && roll.score === scoreOf(key) ? roll.dice : undefined
}

function applyRoll(key: ActorAttributeKey, roll: DiceRoll): void {
  lastRolls.value[key] = roll
  setFieldValue(key, roll.score)
}

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const inputClass =
  'h-auto rounded-lg border-border bg-background px-3.5 py-2.5 text-center text-sm shadow-none read-only:cursor-default read-only:focus-visible:ring-0'

async function onRollOne(key: ActorAttributeKey): Promise<void> {
  const roll = await rollAttribute()
  if (roll) applyRoll(key, roll)
}

async function onRollAll(): Promise<void> {
  const rolls = await rollAttributes()
  if (!rolls) return
  for (const option of actorAttributeOptions) applyRoll(option.key, rolls[option.key])
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="!locked" class="flex items-center justify-between gap-3">
      <span class="text-meta text-muted-foreground">
        Cada atributo é o maior de {{ actorRollRules.attributeDice }}d6 (de
        {{ actorAttributeLimits.min }} a {{ actorAttributeLimits.max }}) e vale quantos d6 você rola
        num teste: um 5 ou 6 é sucesso.
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="shrink-0 gap-1.5 text-primary hover:bg-primary/10 hover:text-primary"
        :disabled="disabled || isRolling"
        @click="onRollAll"
      >
        <Dices />
        Rolar todos
      </Button>
    </div>

    <div class="flex flex-wrap gap-4">
      <FormField
        v-for="attribute in actorAttributeOptions"
        :key="attribute.key"
        v-slot="{ componentField }"
        :name="attribute.key"
        keep-value
      >
        <FormItem class="w-28 gap-1.5">
          <div class="flex min-h-6 items-center justify-between">
            <FormLabel :class="fieldLabelClass">{{ attribute.label }}</FormLabel>
            <DiceRollButton
              v-if="!locked"
              :label="`Rolar ${actorRollRules.attributeDice}d6 para ${attribute.label}`"
              :rolling="isRolling"
              :disabled="disabled"
              @roll="onRollOne(attribute.key)"
            />
          </div>
          <FormControl>
            <Input
              :model-value="componentField.modelValue"
              readonly
              :class="inputClass"
              :placeholder="String(actorAttributeLimits.default)"
            />
          </FormControl>
          <div class="flex min-h-11 flex-col items-center gap-1.5">
            <DicePips :value="scoreOf(attribute.key)" :max="actorAttributeLimits.max" />
            <DiceFaces
              v-if="rolledFaces(attribute.key)"
              :faces="rolledFaces(attribute.key) ?? []"
              keep-highest
            />
          </div>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  </div>
</template>
