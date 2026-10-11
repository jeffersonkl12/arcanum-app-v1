<script setup lang="ts">
import { Dices } from '@lucide/vue'
import { useFormContext } from 'vee-validate'
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
import {
  actorAttributeLimits,
  actorAttributeOptions,
  actorRollRules,
  type ActorAttributeKey
} from '@renderer/constant/actor.constant'

/**
 * The attribute fields of a form that has `attributeFormShape`. They are never typed: each score
 * comes from the dice, and `locked` takes the dice away too.
 */
defineProps<{
  /** The scores can no longer be changed at all (the campaign has started). */
  locked?: boolean
  disabled?: boolean
}>()

const { setFieldValue } = useFormContext()
const { isRolling, rollAttribute, rollAttributes } = useCharacterRoll()

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const inputClass =
  'h-auto rounded-lg border-border bg-background px-3.5 py-2.5 text-center text-sm shadow-none read-only:cursor-default read-only:focus-visible:ring-0'

async function onRollOne(key: ActorAttributeKey): Promise<void> {
  const score = await rollAttribute()
  if (score !== undefined) setFieldValue(key, score)
}

async function onRollAll(): Promise<void> {
  const scores = await rollAttributes()
  if (!scores) return
  for (const option of actorAttributeOptions) setFieldValue(option.key, scores[option.key])
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="!locked" class="flex items-center justify-between">
      <span class="text-meta text-muted-foreground">
        {{ actorRollRules.attributeDice }}d6 por atributo, somados.
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="gap-1.5 text-primary hover:bg-primary/10 hover:text-primary"
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
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  </div>
</template>
