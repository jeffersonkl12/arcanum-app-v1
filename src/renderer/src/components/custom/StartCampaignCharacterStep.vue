<script setup lang="ts">
import { Camera } from '@lucide/vue'
import { ref } from 'vue'
import type { NewRelative } from '@schema'
import CreateNpcDialog from '@renderer/components/custom/CreateNpcDialog.vue'
import type { ActorSummary } from '@renderer/composable/world.type'
import ActorFamilyPanel from '@renderer/components/custom/ActorFamilyPanel.vue'
import ActorInventoryPicker from '@renderer/components/custom/ActorInventoryPicker.vue'
import CoinFields from '@renderer/components/custom/CoinFields.vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { cn } from '@renderer/lib/utils'
import AttributeFields from '@renderer/components/custom/AttributeFields.vue'
import HealthFields from '@renderer/components/custom/HealthFields.vue'
import {
  actorAgeOptions,
  actorGenderOptions,
  actorHpLimits
} from '@renderer/constant/actor.constant'
import ActorPlaceField from '@renderer/components/custom/ActorPlaceField.vue'
import type { NamedEntitySummary, PlaceSummary } from '@renderer/composable/world.type'
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

const inventoryIds = defineModel<string[]>('inventoryIds', { required: true })
const relatives = defineModel<NewRelative[]>('relatives', { required: true })

defineProps<{
  /** The template the campaign is cloned from: where the items and the relatives come from. */
  templateId?: string
  languages: NamedEntitySummary[]
  cultures: NamedEntitySummary[]
  places: PlaceSummary[]
  imagePreviewUrl?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  relativeCreated: [actor: ActorSummary]
  imageSelected: [event: Event]
}>()

const imageInput = ref<HTMLInputElement>()

function openImagePicker(): void {
  imageInput.value?.click()
}

const activeTab = ref('profile')
const familyPanel = ref<InstanceType<typeof ActorFamilyPanel>>()
const relativeOpen = ref(false)

/** A relative made here is an NPC of the template: it is offered in the panel and preselected. */
async function onRelativeCreated(actor: ActorSummary): Promise<void> {
  emit('relativeCreated', actor)
  await familyPanel.value?.reload(actor.id)
}

const tabTriggerClass = cn(
  'h-auto flex-none rounded-none border-0 bg-transparent px-0 pb-3 text-sm font-medium text-tertiary shadow-none',
  'hover:text-foreground data-active:bg-transparent data-active:font-semibold data-active:text-primary',
  'dark:data-active:border-transparent dark:data-active:bg-transparent',
  'after:bg-primary group-data-horizontal/tabs:after:bottom-0 group-data-[variant=line]/tabs-list:data-active:after:opacity-100'
)

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

      <ActorPlaceField :places="places" :disabled="disabled" />

      <HealthFields :default-max="actorHpLimits.defaultPlayer" :disabled="disabled" />

      <AttributeFields :disabled="disabled" />

      <Tabs v-model="activeTab" class="flex w-full flex-col gap-5">
        <TabsList
          variant="line"
          class="h-auto w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0"
        >
          <TabsTrigger value="profile" :class="tabTriggerClass">Aparência e História</TabsTrigger>
          <TabsTrigger value="inventory" :class="tabTriggerClass">Inventário</TabsTrigger>
          <TabsTrigger value="family" :class="tabTriggerClass">Família</TabsTrigger>
        </TabsList>

        <!-- force-mount: the fields stay registered in the form while the other tab is open. -->
        <TabsContent
          value="profile"
          force-mount
          class="flex flex-col gap-4 outline-none data-[state=inactive]:hidden"
        >
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
        </TabsContent>

        <TabsContent
          value="inventory"
          force-mount
          class="flex flex-col gap-5 outline-none data-[state=inactive]:hidden"
        >
          <CoinFields :disabled="disabled" />
          <ActorInventoryPicker v-model="inventoryIds" :carried-ids="[]" :disabled="disabled" />
        </TabsContent>

        <TabsContent value="family" class="outline-none">
          <ActorFamilyPanel
            ref="familyPanel"
            :key="templateId"
            v-model:draft="relatives"
            creatable
            :world-id="templateId"
            editable
            :disabled="disabled"
            @create="relativeOpen = true"
          />
        </TabsContent>
      </Tabs>
      <CreateNpcDialog
        v-model:open="relativeOpen"
        :show-trigger="false"
        @saved="onRelativeCreated"
      />
    </div>
  </div>
</template>
