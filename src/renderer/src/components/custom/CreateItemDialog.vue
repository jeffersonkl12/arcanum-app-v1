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
  armorBonusOptions,
  armorBonusValues,
  itemKindOptions,
  itemKindValues,
  itemLimits,
  weaponClassOptions,
  weaponClassValues,
  weaponDieOptions,
  weaponDieValues,
  wearSlotOptions,
  wearSlotValues
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
import { Switch } from '@renderer/components/ui/switch'
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

const formFields = [
  'name',
  'description',
  'kind',
  'isTiny',
  'slots',
  'isConsumable',
  'weaponClass',
  'damageDie',
  'wearSlot',
  'armorBonus'
] as const

type FormFieldName = (typeof formFields)[number]

// Mirrors TEXT_LIMITS and the item rules in the engine: name 120, long text 5000, slots up to 99.
const itemFormSchema = toTypedSchema(
  z
    .object({
      name: z
        .string('Informe o nome')
        .trim()
        .min(1, 'Informe o nome')
        .max(120, 'O nome pode ter no máximo 120 caracteres'),
      description: z.string().max(5000, 'A descrição pode ter no máximo 5000 caracteres'),
      kind: z.enum(itemKindValues, 'Selecione o tipo'),
      isTiny: z.boolean(),
      slots: z
        .number('Informe os espaços')
        .int('Os espaços devem ser um número inteiro')
        .min(1, 'Um item que não é miúdo ocupa pelo menos 1 espaço')
        .max(itemLimits.maxSlots, `No máximo ${itemLimits.maxSlots} espaços`)
        .optional(),
      isConsumable: z.boolean(),
      weaponClass: z.enum(weaponClassValues).optional(),
      damageDie: z.enum(weaponDieValues).optional(),
      wearSlot: z.enum(wearSlotValues).optional(),
      armorBonus: z.enum(armorBonusValues).optional()
    })
    .superRefine((values, context) => {
      const missing = (path: FormFieldName, message: string): void => {
        context.addIssue({ code: 'custom', path: [path], message })
      }

      if (!values.isTiny && values.slots === undefined) missing('slots', 'Informe os espaços')
      if (values.kind === 'weapon') {
        if (!values.weaponClass) missing('weaponClass', 'Selecione o tipo de arma')
        if (!values.damageDie) missing('damageDie', 'Selecione o dado de dano')
      }
      if (values.kind === 'wearable') {
        if (!values.wearSlot) missing('wearSlot', 'Selecione onde se veste')
        if (!values.armorBonus) missing('armorBonus', 'Selecione o bônus de armadura')
      }
    })
)

const emptyForm = {
  name: '',
  description: '',
  kind: 'common' as const,
  isTiny: false,
  slots: 1,
  isConsumable: false
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
  const isWeapon = formValues.kind === 'weapon'
  const isWearable = formValues.kind === 'wearable'
  const payload = {
    name: formValues.name,
    description: formValues.description,
    isTiny: formValues.isTiny,
    slots: formValues.isTiny ? 0 : (formValues.slots ?? 1),
    isConsumable: formValues.isConsumable,
    weaponClass: isWeapon ? (formValues.weaponClass ?? null) : null,
    damageDie: isWeapon ? (formValues.damageDie ?? null) : null,
    wearSlot: isWearable ? (formValues.wearSlot ?? null) : null,
    armorBonus: isWearable && formValues.armorBonus ? Number(formValues.armorBonus) : null,
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
      kind: item.kind,
      isTiny: item.isTiny,
      slots: item.isTiny ? 1 : item.slots,
      isConsumable: item.isConsumable,
      weaponClass: item.weaponClass ?? undefined,
      damageDie: item.damageDie ?? undefined,
      wearSlot: item.wearSlot ?? undefined,
      armorBonus: item.armorBonus === null ? undefined : (String(item.armorBonus) as '0')
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
const switchRowClass =
  'flex flex-row items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5'
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
              <FormField v-slot="{ componentField }" name="kind" keep-value>
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
                        v-for="option in itemKindOptions"
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

              <FormField v-slot="{ componentField }" name="slots" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Espaços de inventário</FormLabel>
                  <NumberField
                    :model-value="componentField.modelValue"
                    :min="1"
                    :max="itemLimits.maxSlots"
                    :disabled="isSavingItem || values.isTiny"
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
                    O inventário carrega {{ itemLimits.inventoryCapacity }} espaços.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <FormField v-slot="{ value, handleChange }" name="isTiny" keep-value>
                <FormItem :class="switchRowClass">
                  <div class="flex flex-col gap-0.5">
                    <FormLabel class="text-sm font-medium text-foreground">Miúdo</FormLabel>
                    <FormDescription class="text-badge">Não ocupa espaços.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      :model-value="value"
                      :disabled="isSavingItem"
                      @update:model-value="handleChange"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField v-slot="{ value, handleChange }" name="isConsumable" keep-value>
                <FormItem :class="switchRowClass">
                  <div class="flex flex-col gap-0.5">
                    <FormLabel class="text-sm font-medium text-foreground">Consumível</FormLabel>
                    <FormDescription class="text-badge">Some ao ser usado.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      :model-value="value"
                      :disabled="isSavingItem"
                      @update:model-value="handleChange"
                    />
                  </FormControl>
                </FormItem>
              </FormField>
            </div>

            <div v-if="values.kind === 'weapon'" class="grid grid-cols-2 gap-4">
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

              <FormField v-slot="{ componentField }" name="damageDie" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Dado de dano</FormLabel>
                  <Select v-bind="componentField" :disabled="isSavingItem">
                    <FormControl>
                      <SelectTrigger :class="selectTriggerClass">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" class="bg-card">
                      <SelectItem
                        v-for="option in weaponDieOptions"
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
            </div>

            <div v-if="values.kind === 'wearable'" class="grid grid-cols-2 gap-4">
              <FormField v-slot="{ componentField }" name="wearSlot" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Onde se veste</FormLabel>
                  <Select v-bind="componentField" :disabled="isSavingItem">
                    <FormControl>
                      <SelectTrigger :class="selectTriggerClass">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" class="bg-card">
                      <SelectItem
                        v-for="option in wearSlotOptions"
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

              <FormField v-slot="{ componentField }" name="armorBonus" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Bônus de armadura</FormLabel>
                  <Select v-bind="componentField" :disabled="isSavingItem">
                    <FormControl>
                      <SelectTrigger :class="selectTriggerClass">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" class="bg-card">
                      <SelectItem
                        v-for="option in armorBonusOptions"
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
            </div>

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
