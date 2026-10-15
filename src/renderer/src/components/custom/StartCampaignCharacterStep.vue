<script setup lang="ts">
import { Camera } from '@lucide/vue'
import { ref } from 'vue'
import AttributeFields from '@renderer/components/custom/AttributeFields.vue'
import HealthFields from '@renderer/components/custom/HealthFields.vue'
import {
  actorAgeOptions,
  actorGenderOptions,
  actorHpLimits
} from '@renderer/constant/actor.constant'
import type { NamedEntitySummary } from '@renderer/composable/world.type'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Textarea } from '@renderer/components/ui/textarea'

defineProps<{
  languages: NamedEntitySummary[]
  cultures: NamedEntitySummary[]
  imagePreviewUrl?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  imageSelected: [event: Event]
}>()

const imageInput = ref<HTMLInputElement>()

function openImagePicker(): void {
  imageInput.value?.click()
}

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const fieldControlClass =
  'h-auto rounded-lg border-border bg-background px-3 py-2.5 text-meta shadow-none placeholder:text-tertiary'
const selectTriggerClass =
  'h-auto w-full rounded-lg border-border bg-background px-3 py-2.5 text-meta data-placeholder:text-tertiary'
const textareaClass =
  'field-sizing-fixed h-32 resize-none rounded-lg border-border bg-background px-3 py-2.5 text-meta shadow-none placeholder:text-tertiary'
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-bold text-foreground">Crie seu Personagem</h2>
      <p class="text-sm text-muted-foreground">
        Defina quem você será nesta nova aventura pelo mundo.
      </p>
    </div>

    <div class="flex flex-col gap-5">
      <div class="flex items-center gap-4">
        <input
          ref="imageInput"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          class="sr-only"
          :disabled="disabled"
          @change="emit('imageSelected', $event)"
        />
        <button
          type="button"
          class="flex size-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded-full border border-border bg-background text-tertiary"
          :disabled="disabled"
          @click="openImagePicker"
        >
          <img
            v-if="imagePreviewUrl"
            :src="imagePreviewUrl"
            alt="Prévia do personagem"
            class="size-full object-cover"
          />
          <Camera v-else class="size-5" />
          <span class="sr-only">Escolher imagem do personagem</span>
        </button>

        <FormField v-slot="{ componentField }" name="name" keep-value>
          <FormItem class="min-w-0 flex-1 gap-1.5">
            <FormLabel :class="fieldLabelClass">Nome</FormLabel>
            <FormControl>
              <Input
                type="text"
                placeholder="Ex: Kaelen"
                autocomplete="off"
                :disabled="disabled"
                :class="fieldControlClass"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="profession" keep-value>
          <FormItem class="min-w-0 flex-1 gap-1.5">
            <FormLabel :class="fieldLabelClass">Profissão / Classe</FormLabel>
            <FormControl>
              <Input
                type="text"
                placeholder="Ex: Ladino"
                autocomplete="off"
                :disabled="disabled"
                :class="fieldControlClass"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <FormField v-slot="{ componentField }" name="age" keep-value>
          <FormItem class="gap-1.5">
            <FormLabel :class="fieldLabelClass">Idade</FormLabel>
            <Select v-bind="componentField" :disabled="disabled">
              <FormControl>
                <SelectTrigger :class="selectTriggerClass">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
              </FormControl>
              <SelectContent position="popper" class="bg-card">
                <SelectItem
                  v-for="option in actorAgeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="gender" keep-value>
          <FormItem class="gap-1.5">
            <FormLabel :class="fieldLabelClass">Gênero</FormLabel>
            <Select v-bind="componentField" :disabled="disabled">
              <FormControl>
                <SelectTrigger :class="selectTriggerClass">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
              </FormControl>
              <SelectContent position="popper" class="bg-card">
                <SelectItem
                  v-for="option in actorGenderOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="languageId" keep-value>
          <FormItem class="gap-1.5">
            <FormLabel :class="fieldLabelClass">Idioma</FormLabel>
            <Select v-bind="componentField" :disabled="disabled">
              <FormControl>
                <SelectTrigger :class="selectTriggerClass">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
              </FormControl>
              <SelectContent position="popper" class="bg-card">
                <SelectItem v-for="language in languages" :key="language.id" :value="language.id">
                  {{ language.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="cultureId" keep-value>
          <FormItem class="gap-1.5">
            <FormLabel :class="fieldLabelClass">Cultura</FormLabel>
            <Select v-bind="componentField" :disabled="disabled">
              <FormControl>
                <SelectTrigger :class="selectTriggerClass">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
              </FormControl>
              <SelectContent position="popper" class="bg-card">
                <SelectItem v-for="culture in cultures" :key="culture.id" :value="culture.id">
                  {{ culture.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>

      <HealthFields :default-max="actorHpLimits.defaultPlayer" :disabled="disabled" />

      <AttributeFields :disabled="disabled" />

      <div class="flex flex-col gap-4">
        <FormField v-slot="{ componentField }" name="appearance" keep-value>
          <FormItem class="gap-1.5">
            <FormLabel :class="fieldLabelClass">Aparência</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Cicatriz no olho..."
                :disabled="disabled"
                :class="textareaClass"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="personality" keep-value>
          <FormItem class="gap-1.5">
            <FormLabel :class="fieldLabelClass">Personalidade</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Frio, calculista..."
                :disabled="disabled"
                :class="textareaClass"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="background" keep-value>
          <FormItem class="gap-1.5">
            <FormLabel :class="fieldLabelClass">Background</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Órfão de guerra..."
                :disabled="disabled"
                :class="textareaClass"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>
    </div>
  </div>
</template>
