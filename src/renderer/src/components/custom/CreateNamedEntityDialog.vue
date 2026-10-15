<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Plus, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { useWorld } from '@renderer/composable/world.composable'
import type { LanguageSummary, NamedEntitySummary } from '@renderer/composable/world.type'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import type { IpcError } from '@shared'

const props = defineProps<{
  kind: 'language' | 'culture'
}>()

const open = defineModel<boolean>('open', { default: false })
// `cultureId` is only there when the entity is a language.
const entity = defineModel<NamedEntitySummary | LanguageSummary | null>('entity', {
  default: null
})

const formFields = ['name', 'cultureId'] as const

type FormFieldName = (typeof formFields)[number]

// Mirrors TEXT_LIMITS in the engine: name 120.
const createNamedEntityFormSchema = toTypedSchema(
  z.object({
    name: z
      .string('Informe o nome')
      .trim()
      .min(1, 'Informe o nome')
      .max(120, 'O nome pode ter no máximo 120 caracteres'),
    // Required for a language (checked on submit): it always belongs to a culture.
    cultureId: z.string().optional()
  })
)

const emptyForm = {
  name: '',
  cultureId: undefined
}

const isEditing = computed(() => entity.value != null)

const copy = computed(() => {
  if (props.kind === 'language') {
    return {
      trigger: 'Adicionar idioma',
      title: isEditing.value ? 'Editar Idioma' : 'Adicionar Idioma',
      description: 'Informe o nome e a cultura do idioma.',
      nameLabel: 'Nome do Idioma',
      namePlaceholder: 'Ex: Aethérico',
      submit: isEditing.value ? 'Salvar Alterações' : 'Salvar Idioma',
      success: isEditing.value ? 'Idioma atualizado' : 'Idioma criado'
    }
  }

  return {
    trigger: 'Adicionar cultura',
    title: isEditing.value ? 'Editar Cultura' : 'Adicionar Cultura',
    description: 'Informe o nome da cultura.',
    nameLabel: 'Nome da Cultura',
    namePlaceholder: 'Ex: Elfos de Sylaris',
    submit: isEditing.value ? 'Salvar Alterações' : 'Salvar Cultura',
    success: isEditing.value ? 'Cultura atualizada' : 'Cultura criada'
  }
})

const {
  createLanguage,
  updateLanguage,
  createCulture,
  updateCulture,
  cultures,
  isCreatingNamedEntity,
  createNamedEntityError
} = useWorld()
const { handleSubmit, resetForm, setErrors } = useForm({
  validationSchema: createNamedEntityFormSchema,
  initialValues: emptyForm
})

const onSubmit = handleSubmit(async (values) => {
  const payload = {
    name: values.name
  }

  let saved: NamedEntitySummary | undefined
  if (props.kind === 'language') {
    if (!values.cultureId) {
      setErrors({ cultureId: 'Selecione a cultura do idioma' })
      return
    }
    const languagePayload = { ...payload, cultureId: values.cultureId }
    saved = entity.value
      ? await updateLanguage(entity.value.id, languagePayload)
      : await createLanguage(languagePayload)
  } else {
    saved = entity.value
      ? await updateCulture(entity.value.id, payload)
      : await createCulture(payload)
  }

  if (!saved) {
    applyCreateErrors(createNamedEntityError.value)
    return
  }
  toast.success(copy.value.success)
  open.value = false
})

watch(open, (isOpen) => {
  if (isOpen) {
    fillForm(entity.value)
    return
  }
  resetForm({ values: emptyForm })
  entity.value = null
})

function startCreate(): void {
  entity.value = null
}

function fillForm(item: NamedEntitySummary | LanguageSummary | null): void {
  if (!item) {
    resetForm({ values: emptyForm })
    return
  }

  resetForm({
    values: {
      name: item.name,
      cultureId: 'cultureId' in item ? item.cultureId : undefined
    }
  })
}

function applyCreateErrors(error: IpcError | undefined): void {
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
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button
        type="button"
        class="h-auto gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-primary-hover"
        @click="startCreate"
      >
        <Plus class="size-4" />
        {{ copy.trigger }}
      </Button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex w-130 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card p-8 text-foreground shadow-dialog outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
      >
        <form class="flex flex-col gap-8" @submit="onSubmit">
          <DialogDescription class="sr-only">
            {{ copy.description }}
          </DialogDescription>
          <div class="flex items-center justify-between gap-4">
            <DialogTitle class="font-body text-xl font-bold">{{ copy.title }}</DialogTitle>
            <DialogClose class="text-tertiary" :disabled="isCreatingNamedEntity">
              <X class="size-5" />
              <span class="sr-only">Fechar</span>
            </DialogClose>
          </div>

          <div class="flex flex-col gap-6">
            <FormField v-slot="{ componentField }" name="name" keep-value>
              <FormItem>
                <FormLabel class="text-muted-foreground">{{ copy.nameLabel }}</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    :placeholder="copy.namePlaceholder"
                    autocomplete="off"
                    :disabled="isCreatingNamedEntity"
                    class="h-auto rounded-lg border-border bg-background px-4 py-3 text-sm shadow-none placeholder:text-tertiary"
                    v-bind="componentField"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField
              v-if="kind === 'language'"
              v-slot="{ componentField }"
              name="cultureId"
              keep-value
            >
              <FormItem>
                <FormLabel class="text-muted-foreground">Cultura</FormLabel>
                <Select
                  v-bind="componentField"
                  :disabled="isCreatingNamedEntity || cultures.length === 0"
                >
                  <FormControl>
                    <SelectTrigger
                      class="h-auto w-full rounded-lg border-border bg-background px-4 py-3 text-sm data-placeholder:text-tertiary"
                    >
                      <SelectValue placeholder="Selecione a cultura" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" class="bg-card">
                    <SelectItem v-for="culture in cultures" :key="culture.id" :value="culture.id">
                      {{ culture.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription v-if="cultures.length === 0" class="text-xs text-destructive">
                  Crie uma cultura antes: todo idioma pertence a uma cultura.
                </FormDescription>
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
                :disabled="isCreatingNamedEntity"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              class="h-auto rounded-full px-6 py-3 text-sm font-semibold hover:bg-primary-hover"
              :disabled="isCreatingNamedEntity"
            >
              {{ copy.submit }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
