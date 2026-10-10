<script setup lang="ts">
import { FormControl, FormField, FormItem, FormMessage } from '@renderer/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@renderer/components/ui/radio-group'
import { Textarea } from '@renderer/components/ui/textarea'
import { cn } from '@renderer/lib/utils'
import type { CampaignPrologueMode } from '@renderer/composable/campaign.type'

defineProps<{
  prologueMode: CampaignPrologueMode
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:prologueMode': [value: CampaignPrologueMode]
}>()
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-bold text-foreground">Prólogo da Aventura</h2>
      <p class="text-sm text-muted-foreground">Como você deseja iniciar esta campanha?</p>
    </div>

    <RadioGroup
      :model-value="prologueMode"
      class="flex flex-col gap-6"
      :disabled="disabled"
      @update:model-value="emit('update:prologueMode', $event as CampaignPrologueMode)"
    >
      <label
        :class="
          cn(
            'flex cursor-pointer gap-4 rounded-lg border border-border bg-secondary p-5',
            prologueMode === 'ai' && 'border-primary bg-primary/5 border-2'
          )
        "
      >
        <RadioGroupItem value="ai" class="mt-1 size-5" />
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <p class="text-sm font-semibold text-foreground">Deixar o Mestre IA decidir</p>
          <p class="text-sm leading-normal text-muted-foreground">
            O Mestre irá analisar as personalidades do grupo, a cultura do cenário e gerará uma cena
            de introdução perfeita para iniciar a sua jornada.
          </p>
        </div>
      </label>

      <label
        :class="
          cn(
            'flex cursor-pointer gap-4 rounded-lg border border-border bg-secondary p-5',
            prologueMode === 'custom' && 'border-primary bg-primary/5 border-2'
          )
        "
      >
        <RadioGroupItem value="custom" class="mt-1 size-5" />
        <div class="flex min-w-0 flex-1 flex-col gap-3">
          <div class="flex flex-col gap-1">
            <p class="text-sm font-semibold text-foreground">Escrever meu próprio Prólogo</p>
            <p class="text-sm leading-normal text-muted-foreground">
              Dê o contexto inicial para o Mestre. Onde vocês estão? O que estão fazendo? Por que o
              grupo se uniu?
            </p>
          </div>
          <FormField
            v-if="prologueMode === 'custom'"
            v-slot="{ componentField }"
            name="prologue"
            keep-value
          >
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Ex: Eu e Thorek fomos capturados durante a noite e acabamos de acordar em celas adjacentes nas masmorras da capital. Nossas armas sumiram e guardas conversam no corredor..."
                  :disabled="disabled"
                  class="field-sizing-fixed h-30 resize-none rounded-lg border-border bg-background p-3 text-sm leading-normal shadow-none placeholder:text-tertiary"
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>
      </label>
    </RadioGroup>
  </div>
</template>
