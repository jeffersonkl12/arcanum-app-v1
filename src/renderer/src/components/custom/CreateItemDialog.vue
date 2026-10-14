<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Camera, Plus, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
import { useForm } from 'vee-validate'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import type { IpcError } from '@shared'
import { toImageUrl } from '@shared'
import {
  clothingClassOptions,
  clothingClassValues,
  itemLimits,
  itemTypeHints,
  itemTypeOptions,
  itemTypeValues,
  weaponClassOptions,
  weaponClassValues
} from '@renderer/constant/item.constant'
import { useWorld } from '@renderer/composable/world.composable'
import type { ItemSummary } from '@renderer/composable/world.type'
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
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput
} from '@renderer/components/ui/number-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Textarea } from '@renderer/components/ui/textarea'

const open = defineModel<boolean>('open', { default: false })
const entity = defineModel<ItemSummary | null>('entity', { default: null })

withDefaults(
  defineProps<{
    /** When false, the dialog is controlled only via `open` (no trigger button). */
    showTrigger?: boolean
  }>(),
  { showTrigger: true }
)

const emit = defineEmits<{
  saved: [item: ItemSummary]
}>()

const formFields = ['name', 'description', 'type', 'slots', 'weaponClass', 'clothingClass'] as const

type FormFieldName = (typeof formFields)[number]

// Mirrors TEXT_LIMITS and the item rules in the engine: name 120, long text 5000, slots from 1 to the inventory capacity.
const itemFormSchema = toTypedSchema(
  z
    .object({
      name: z
        .string('Informe o nome')
        .trim()
        .min(1, 'Informe o nome')
        .max(120, 'O nome pode ter no máximo 120 caracteres'),
      description: z.string().max(5000, 'A descrição pode ter no máximo 5000 caracteres'),
      type: z.enum(itemTypeValues, 'Selecione o tipo'),
      slots: z
        .number('Informe os espaços')
        .int('Os espaços devem ser um número inteiro')
        .min(1, 'Um item ocupa pelo menos 1 espaço')
        .max(itemLimits.inventoryCapacity, `No máximo ${itemLimits.inventoryCapacity} espaços`),
      weaponClass: z.enum(weaponClassValues).optional(),
      clothingClass: z.enum(clothingClassValues).optional()
    })
    .superRefine((values, context) => {
      const missing = (path: FormFieldName, message: string): void => {
        context.addIssue({ code: 'custom', path: [path], message })
      }

      if (values.type === 'weapon' && !values.weaponClass) {
        missing('weaponClass', 'Selecione o tipo de arma')
      }
      if (values.type === 'clothing' && !values.clothingClass) {
        missing('clothingClass', 'Selecione o tipo de vestimenta')
      }
    })
)

const emptyForm = {
  name: '',
  description: '',
  type: 'tool' as const,
  slots: 1
}

const isEditing = computed(() => entity.value != null)
const imageInput = ref<HTMLInputElement>()
const imagePreviewUrl = ref<string>()
const imageData = ref<Uint8Array>()
const existingImagePath = ref<string | null>()

const { createItem, updateItem, isSavingItem, saveItemError } = useWorld()
const { handleSubmit, resetForm, setErrors, values } = useForm({
  validationSchema: itemFormSchema,
  initialValues: emptyForm
})

const previewSrc = computed(() => {
  if (imagePreviewUrl.value) return imagePreviewUrl.value
  if (existingImagePath.value) return toImageUrl(existingImagePath.value)
  return undefined
})

const onSubmit = handleSubmit(async (formValues) => {
  const payload = {
    name: formValues.name,
    description: formValues.description,
    type: formValues.type,
    slots: formValues.slots,
    weaponClass: formValues.type === 'weapon' ? (formValues.weaponClass ?? null) : null,
    clothingClass: formValues.type === 'clothing' ? (formValues.clothingClass ?? null) : null,
    imageData: imageData.value
  }

  const editing = isEditing.value
  const saved = entity.value
    ? await updateItem(entity.value.id, payload)
    : await createItem(payload)

  if (!saved) {
    applySaveErrors(saveItemError.value)
    return
  }
  toast.success(editing ? 'Item atualizado' : 'Item criado')
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
})

onBeforeUnmount(() => {
  clearImage()
})

function startCreate(): void {
  entity.value = null
}

function fillForm(item: ItemSummary | null): void {
  clearImage()
  if (!item) {
    resetForm({ values: emptyForm })
    return
  }

  existingImagePath.value = item.imagePath ?? null
  resetForm({
    values: {
      name: item.name,
      description: item.description,
      type: item.type,
      slots: item.slots,
      weaponClass: item.weaponClass ?? undefined,
      clothingClass: item.clothingClass ?? undefined
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
const selectTriggerClass =
  'h-auto w-full rounded-lg border-border bg-background px-3.5 py-2.5 text-sm data-placeholder:text-tertiary'
const textareaClass =
  'field-sizing-fixed h-20 resize-none rounded-lg border-border bg-background px-3.5 py-2.5 text-sm shadow-none placeholder:text-tertiary'
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
        Adicionar Item
      </Button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[680px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-xl border border-border bg-card p-8 text-foreground shadow-dialog outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
      >
        <form class="flex flex-col gap-8" @submit="onSubmit">
          <DialogDescription class="sr-only">
            Informe os dados do item: nome, tipo, espaços, durabilidade e descrição.
          </DialogDescription>
          <div class="flex items-center justify-between gap-4">
            <DialogTitle class="font-body text-xl font-bold">
              {{ isEditing ? 'Editar Item' : 'Adicionar Item' }}
            </DialogTitle>
            <DialogClose class="text-tertiary" :disabled="isSavingItem">
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
                :disabled="isSavingItem"
                @change="onImageSelected"
              />
              <button
                type="button"
                class="flex size-20 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-background text-tertiary"
                :disabled="isSavingItem"
                @click="openImagePicker"
              >
                <img
                  v-if="previewSrc"
                  :src="previewSrc"
                  alt="Prévia do item"
                  class="size-full object-cover"
                />
                <Camera v-else class="size-6" />
                <span class="sr-only">Escolher imagem do item (opcional)</span>
              </button>

              <FormField v-slot="{ componentField }" name="name" keep-value>
                <FormItem class="min-w-0 flex-1 gap-1.5">
                  <FormLabel :class="fieldLabelClass">Nome</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Ex: Espada curta"
                      autocomplete="off"
                      :disabled="isSavingItem"
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
                  <Select v-bind="componentField" :disabled="isSavingItem">
                    <FormControl>
                      <SelectTrigger :class="selectTriggerClass">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" class="bg-card">
                      <SelectItem
                        v-for="option in itemTypeOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription class="text-badge">
                    {{ values.type ? itemTypeHints[values.type] : 'Escolha o que é o item.' }}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="slots" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Espaços de inventário</FormLabel>
                  <NumberField
                    :model-value="componentField.modelValue"
                    :min="1"
                    :max="itemLimits.inventoryCapacity"
                    :disabled="isSavingItem"
                    @update:model-value="componentField['onUpdate:modelValue']"
                  >
                    <NumberFieldContent>
                      <NumberFieldDecrement />
                      <FormControl>
                        <NumberFieldInput :class="fieldControlClass" />
                      </FormControl>
                      <NumberFieldIncrement />
                    </NumberFieldContent>
                  </NumberField>
                  <FormDescription class="text-badge">
                    Todo item ocupa ao menos 1; o inventário carrega
                    {{ itemLimits.inventoryCapacity }}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <template v-if="values.type === 'weapon'">
              <FormField v-slot="{ componentField }" name="weaponClass" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Tipo de arma</FormLabel>
                  <Select v-bind="componentField" :disabled="isSavingItem">
                    <FormControl>
                      <SelectTrigger :class="selectTriggerClass">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" class="bg-card">
                      <SelectItem
                        v-for="option in weaponClassOptions"
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
            </template>

            <template v-if="values.type === 'clothing'">
              <FormField v-slot="{ componentField }" name="clothingClass" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Tipo de vestimenta</FormLabel>
                  <Select v-bind="componentField" :disabled="isSavingItem">
                    <FormControl>
                      <SelectTrigger :class="selectTriggerClass">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" class="bg-card">
                      <SelectItem
                        v-for="option in clothingClassOptions"
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
            </template>

            <FormField v-slot="{ componentField }" name="description" keep-value>
              <FormItem class="gap-1.5">
                <FormLabel :class="fieldLabelClass">Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Aparência, função ou efeito do item..."
                    :disabled="isSavingItem"
                    :class="textareaClass"
                    v-bind="componentField"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>

          <div class="flex justify-end gap-4">
            <DialogClose as-child>
              <Button
                type="button"
                variant="outline"
                class="h-auto rounded-full bg-transparent px-4 py-2.5 text-sm font-semibold"
                :disabled="isSavingItem"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              class="h-auto rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover"
              :disabled="isSavingItem"
            >
              {{ isEditing ? 'Salvar Alterações' : 'Salvar Item' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
