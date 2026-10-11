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
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput
} from '@renderer/components/ui/number-field'
import { useCharacterRoll } from '@renderer/composable/character-roll.composable'
import {
  actorAttributeLimits,
  actorAttributeOptions,
  actorRollRules,
  type ActorAttributeKey
} from '@renderer/constant/actor.constant'

/** The attribute fields of a form that has `attributeFormShape`, with the dice to roll them. */
defineProps<{
  disabled?: boolean
}>()

const { setFieldValue } = useFormContext()
const { isRolling, rollAttribute, rollAttributes } = useCharacterRoll()

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const inputClass = 'h-auto rounded-lg border-border bg-background px-3.5 py-2.5 text-sm shadow-none'

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
    <div class="flex items-center justify-between">
      <span class="text-meta text-muted-foreground">
        {{ actorRollRules.attributeDice }}d6 por atributo, somados. Vazio usa o padrão ({{
          actorAttributeLimits.default
        }}).
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

    <div class="grid grid-cols-3 gap-4">
      <FormField
        v-for="attribute in actorAttributeOptions"
        :key="attribute.key"
        v-slot="{ componentField }"
        :name="attribute.key"
        keep-value
      >
        <FormItem class="gap-1.5">
          <div class="flex items-center justify-between">
            <FormLabel :class="fieldLabelClass">{{ attribute.label }}</FormLabel>
            <DiceRollButton
              :label="`Rolar ${actorRollRules.attributeDice}d6 para ${attribute.label}`"
              :rolling="isRolling"
              :disabled="disabled"
              @roll="onRollOne(attribute.key)"
            />
          </div>
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
  </div>
</template>
