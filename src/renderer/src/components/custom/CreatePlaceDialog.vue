<script setup lang="ts">
import { descriptionMaxLength } from '@renderer/constant/text-limit.constant'
import { toTypedSchema } from '@vee-validate/zod'
import { Camera, Plus, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
import { useForm } from 'vee-validate'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import type { IpcError } from '@shared'
import { toImageUrl } from '@shared'
import { placeTopValue, placeTypeSuggestions } from '@renderer/constant/place.constant'
import { useWorld } from '@renderer/composable/world.composable'
import type { PlaceSummary } from '@renderer/composable/world.type'
import { searchRank } from '@renderer/util/text.util'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import { Input } from '@renderer/components/ui/input'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxViewport
} from '@renderer/components/ui/combobox'
import { Textarea } from '@renderer/components/ui/textarea'

const open = defineModel<boolean>('open', { default: false })
const entity = defineModel<PlaceSummary | null>('entity', { default: null })
/** For a new place: the place it starts inside of, so the player does not have to pick it. */
const presetParentId = defineModel<string | null>('parentId', { default: null })

withDefaults(
  defineProps<{
    /** When false, the dialog is controlled only via `open` (no trigger button). */
    showTrigger?: boolean
  }>(),
  { showTrigger: true }
)

const emit = defineEmits<{
  saved: [place: PlaceSummary]
  /** The player wants a new place inside the one being edited; the form is not saved. */
  addChild: [parentId: string]
}>()

const formFields = ['name', 'type', 'description', 'parentId'] as const

type FormFieldName = (typeof formFields)[number]

// Mirrors TEXT_LIMITS in the engine: name and type 120, description 500.
const placeFormSchema = toTypedSchema(
  z.object({
    name: z
      .string('Informe o nome')
      .trim()
      .min(1, 'Informe o nome')
      .max(120, 'O nome pode ter no máximo 120 caracteres'),
    type: z
      .string('Informe o tipo')
      .trim()
      .min(1, 'Informe o tipo')
      .max(120, 'O tipo pode ter no máximo 120 caracteres'),
    description: z
      .string()
      .max(
        descriptionMaxLength,
        `A descrição pode ter no máximo ${descriptionMaxLength} caracteres`
      ),
    parentId: z.string()
  })
)

const emptyForm = {
  name: '',
  type: '',
  description: '',
  parentId: placeTopValue
}

const isEditing = computed(() => entity.value != null)
const imageInput = ref<HTMLInputElement>()
const imagePreviewUrl = ref<string>()
const imageData = ref<Uint8Array>()
const existingImagePath = ref<string | null>()

const { places, createPlace, updatePlace, isSavingPlace, savePlaceError } = useWorld()
const { handleSubmit, resetForm, setErrors, setFieldValue, meta } = useForm({
  validationSchema: placeFormSchema,
  initialValues: emptyForm
})

const previewSrc = computed(() => {
  if (imagePreviewUrl.value) return imagePreviewUrl.value
  if (existingImagePath.value) return toImageUrl(existingImagePath.value)
  return undefined
})

/** A place cannot go inside itself or inside a place of its own, so those are not offered as parent. */
const parentOptions = computed(() => {
  const excluded = new Set<string>()
  if (entity.value) {
    excluded.add(entity.value.id)
    // The list is in tree order, so a descendant always comes after its parent.
    for (const place of places.value) {
      if (place.parentId !== null && excluded.has(place.parentId)) excluded.add(place.id)
    }
  }
  return places.value.filter((place) => !excluded.has(place.id))
})

const topLabel = 'Nenhum (topo do mundo)'

interface ParentChoice {
  value: string
  label: string
  /** Where the place is, to tell apart places that sound alike. */
  hint: string
}

const parentSearch = ref('')

/**
 * What the parent field offers: the top of the world and the places that can hold this one. With
 * nothing typed it is the tree; with a search it is a flat list by closeness of the name.
 */
const parentChoices = computed<ParentChoice[]>(() => {
  const term = parentSearch.value
  const choices: ParentChoice[] = [
    { value: placeTopValue, label: topLabel, hint: '' },
    ...parentOptions.value.map((place) => ({
      value: place.id,
      label: `${term.trim() ? '' : '– '.repeat(place.depth)}${place.name}`,
      hint: place.path.join(' › ')
    }))
  ]
  if (!term.trim()) return choices

  return choices
    .map((choice) => ({ choice, rank: searchRank(choice.label, term) }))
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .map(({ choice }) => choice)
})

/** What the field shows for the chosen value, when nothing is being typed. */
function parentLabel(value: string): string {
  if (value === placeTopValue) return topLabel
  return places.value.find((place) => place.id === value)?.name ?? ''
}

function onParentSelected(value: unknown): void {
  parentSearch.value = ''
  if (typeof value === 'string') setFieldValue('parentId', value)
}

function onParentOpenChange(isOpen: boolean): void {
  if (isOpen) parentSearch.value = ''
}

function selectInputText(event: FocusEvent): void {
  ;(event.target as HTMLInputElement).select()
}

const onSubmit = handleSubmit(async (formValues) => {
  const payload = {
    name: formValues.name,
    type: formValues.type,
    description: formValues.description,
    parentId: formValues.parentId === placeTopValue ? null : formValues.parentId,
    imageData: imageData.value
  }

  const editing = isEditing.value
  const saved = entity.value
    ? await updatePlace(entity.value.id, payload)
    : await createPlace(payload)

  if (!saved) {
    applySaveErrors(savePlaceError.value)
    return
  }
  toast.success(editing ? 'Lugar atualizado' : 'Lugar criado')
  emit('saved', saved)
  open.value = false
})

watch(open, (isOpen) => {
  if (isOpen) {
    fillForm(entity.value)
    return
  }
  resetForm({ values: emptyForm })
  clearImage()
  entity.value = null
  presetParentId.value = null
})

onBeforeUnmount(() => {
  clearImage()
})

function startCreate(): void {
  entity.value = null
  presetParentId.value = null
}

function fillForm(place: PlaceSummary | null): void {
  clearImage()
  if (!place) {
    resetForm({ values: { ...emptyForm, parentId: presetParentId.value ?? placeTopValue } })
    return
  }

  existingImagePath.value = place.imagePath ?? null
  resetForm({
    values: {
      name: place.name,
      type: place.type,
      description: place.description,
      parentId: place.parentId ?? placeTopValue
    }
  })
}

function applySaveErrors(error: IpcError | undefined): void {
  if (error?.kind !== 'invalid_input') return
  const fieldErrors: Partial<Record<FormFieldName, string>> = {}
  for (const issue of error.issues ?? []) {
    if (!isFormField(issue.path)) continue
    fieldErrors[issue.path] = issue.message
  }
  setErrors(fieldErrors)
}

function isFormField(path: string): path is FormFieldName {
  return formFields.some((field) => field === path)
}

function clearImage(): void {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
  imagePreviewUrl.value = undefined
  imageData.value = undefined
  existingImagePath.value = undefined
  if (imageInput.value) imageInput.value.value = ''
}

function openImagePicker(): void {
  imageInput.value?.click()
}

async function onImageSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
  imagePreviewUrl.value = URL.createObjectURL(file)
  imageData.value = new Uint8Array(await file.arrayBuffer())
}

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const fieldControlClass =
  'h-auto rounded-lg border-border bg-background px-3.5 py-2.5 text-sm shadow-none placeholder:text-tertiary'
const textareaClass =
  'field-sizing-fixed h-24 resize-none rounded-lg border-border bg-background px-3.5 py-2.5 text-sm shadow-none placeholder:text-tertiary'
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger v-if="showTrigger" as-child>
      <Button
        type="button"
        class="h-auto gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-primary-hover"
        @click="startCreate"
      >
        <Plus class="size-4" />
        Adicionar Lugar
      </Button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[680px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-xl border border-border bg-card p-8 text-foreground shadow-dialog outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
      >
        <form class="flex flex-col gap-8" @submit="onSubmit">
          <DialogDescription class="sr-only">
            Informe os dados do lugar: nome, tipo, onde ele fica e descrição.
          </DialogDescription>
          <div class="flex items-center justify-between gap-4">
            <DialogTitle class="font-body text-xl font-bold">
              {{ isEditing ? 'Editar Lugar' : 'Adicionar Lugar' }}
            </DialogTitle>
            <DialogClose class="text-tertiary" :disabled="isSavingPlace">
              <X class="size-5" />
              <span class="sr-only">Fechar</span>
            </DialogClose>
          </div>

          <div class="flex flex-col gap-5">
            <div class="flex items-center gap-6">
              <input
                ref="imageInput"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                class="sr-only"
                :disabled="isSavingPlace"
                @change="onImageSelected"
              />
              <button
                type="button"
                class="flex size-20 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-background text-tertiary"
                :disabled="isSavingPlace"
                @click="openImagePicker"
              >
                <img
                  v-if="previewSrc"
                  :src="previewSrc"
                  alt="Prévia do lugar"
                  class="size-full object-cover"
                />
                <Camera v-else class="size-6" />
                <span class="sr-only">Escolher imagem do lugar (opcional)</span>
              </button>

              <FormField v-slot="{ componentField }" name="name" keep-value>
                <FormItem class="min-w-0 flex-1 gap-1.5">
                  <FormLabel :class="fieldLabelClass">Nome</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Ex: Taverna do Javali"
                      autocomplete="off"
                      :disabled="isSavingPlace"
                      :class="fieldControlClass"
                      v-bind="componentField"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <FormField v-slot="{ componentField }" name="type" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Tipo</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      list="place-type-suggestions"
                      placeholder="Ex: Cidade, casa, quarto"
                      autocomplete="off"
                      :disabled="isSavingPlace"
                      :class="fieldControlClass"
                      v-bind="componentField"
                    />
                  </FormControl>
                  <datalist id="place-type-suggestions">
                    <option
                      v-for="suggestion in placeTypeSuggestions"
                      :key="suggestion"
                      :value="suggestion"
                    />
                  </datalist>
                  <FormDescription class="text-badge">
                    Texto livre: escolha uma sugestão ou escreva o seu.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="parentId" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Fica dentro de</FormLabel>
                  <Combobox
                    ignore-filter
                    open-on-focus
                    open-on-click
                    :disabled="isSavingPlace"
                    :model-value="componentField.modelValue"
                    @update:model-value="onParentSelected"
                    @update:open="onParentOpenChange"
                  >
                    <ComboboxAnchor>
                      <ComboboxInput
                        group-class="h-auto rounded-lg border-border bg-background"
                        class="h-auto bg-transparent px-1 py-2.5 text-sm placeholder:text-tertiary"
                        placeholder="Digite para buscar..."
                        autocomplete="off"
                        :display-value="parentLabel"
                        @focus="selectInputText"
                        @input="parentSearch = ($event.target as HTMLInputElement).value"
                      />
                    </ComboboxAnchor>
                    <ComboboxList class="bg-card">
                      <ComboboxViewport>
                        <ComboboxEmpty>Nenhum lugar encontrado</ComboboxEmpty>
                        <ComboboxItem
                          v-for="option in parentChoices"
                          :key="option.value"
                          :value="option.value"
                        >
                          <span class="truncate">{{ option.label }}</span>
                          <span v-if="option.hint" class="truncate text-xs text-muted-foreground">
                            {{ option.hint }}
                          </span>
                        </ComboboxItem>
                      </ComboboxViewport>
                    </ComboboxList>
                  </Combobox>
                  <FormDescription class="text-badge">
                    Uma cidade guarda a igreja; uma casa guarda o quarto.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <FormField v-slot="{ componentField }" name="description" keep-value>
              <FormItem class="gap-1.5">
                <FormLabel :class="fieldLabelClass">Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Aparência, clima e o que se sabe sobre o lugar..."
                    :disabled="isSavingPlace"
                    :class="textareaClass"
                    v-bind="componentField"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>

          <div
            class="flex items-center gap-4"
            :class="isEditing ? 'justify-between' : 'justify-end'"
          >
            <Button
              v-if="entity"
              type="button"
              variant="outline"
              class="h-auto gap-2 rounded-full bg-transparent px-4 py-2.5 text-sm font-semibold"
              :disabled="isSavingPlace || meta.dirty"
              :title="meta.dirty ? 'Salve ou descarte as alterações antes' : undefined"
              @click="emit('addChild', entity.id)"
            >
              <Plus class="size-4" />
              Adicionar lugar dentro
            </Button>
            <div class="flex gap-4">
              <DialogClose as-child>
                <Button
                  type="button"
                  variant="outline"
                  class="h-auto rounded-full bg-transparent px-4 py-2.5 text-sm font-semibold"
                  :disabled="isSavingPlace"
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                class="h-auto rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover"
                :disabled="isSavingPlace"
              >
                {{ isEditing ? 'Salvar Alterações' : 'Salvar Lugar' }}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
