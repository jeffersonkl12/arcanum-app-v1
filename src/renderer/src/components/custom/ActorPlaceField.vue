<script setup lang="ts">
import type { PlaceSummary } from '@renderer/composable/world.type'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'

defineProps<{
  /** The places of the world, in tree order. */
  places: PlaceSummary[]
  disabled?: boolean
}>()

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const selectTriggerClass =
  'h-auto w-full rounded-lg border-border bg-background px-3.5 py-2.5 text-sm data-placeholder:text-tertiary'

/** "Reino › Cidade › Taverna": where the place is, so equal names can be told apart. */
function placeLabel(place: PlaceSummary): string {
  return [...place.path, place.name].join(' › ')
}
</script>

<template>
  <FormField v-slot="{ componentField }" name="pointOfInterestId" keep-value>
    <FormItem class="gap-1.5">
      <FormLabel :class="fieldLabelClass">Ponto de interesse</FormLabel>
      <Select v-bind="componentField" :disabled="disabled || places.length === 0">
        <FormControl>
          <SelectTrigger :class="selectTriggerClass">
            <SelectValue placeholder="Selecione onde o personagem está" />
          </SelectTrigger>
        </FormControl>
        <SelectContent position="popper" class="bg-card">
          <SelectItem v-for="place in places" :key="place.id" :value="place.id">
            {{ placeLabel(place) }}
          </SelectItem>
        </SelectContent>
      </Select>
      <FormDescription v-if="places.length === 0" class="text-xs text-destructive">
        Este mundo ainda não tem pontos de interesse. Crie um antes de adicionar personagens.
      </FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
