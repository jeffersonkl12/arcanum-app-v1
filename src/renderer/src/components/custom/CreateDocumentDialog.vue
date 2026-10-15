<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Plus, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { documentLimits } from '@renderer/constant/text-limit.constant'
import { useWorld } from '@renderer/composable/world.composable'
import type { DocumentSummary } from '@renderer/composable/world.type'
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
import { Textarea } from '@renderer/components/ui/textarea'
import type { IpcError } from '@shared'

const open = defineModel<boolean>('open', { default: false })
const entity = defineModel<DocumentSummary | null>('entity', { default: null })

withDefaults(
  defineProps<{
    /** When false, the dialog is controlled only via `open` (no trigger button). */
    showTrigger?: boolean
  }>(),
  { showTrigger: true }
)

const formFields = ['subject', 'category', 'content'] as const

type FormFieldName = (typeof formFields)[number]

const documentFormSchema = toTypedSchema(
  z.object({
    subject: z
      .string('Informe o assunto')
      .trim()
      .min(1, 'Informe o assunto')
      .max(
        documentLimits.subject,
        `O assunto pode ter no máximo ${documentLimits.subject} caracteres`
      ),
    category: z
      .string('Informe a categoria')
      .trim()
      .min(1, 'Informe a categoria')
      .max(
        documentLimits.category,
        `A categoria pode ter no máximo ${documentLimits.category} caracteres`
      ),
    content: z
      .string('Informe o conteúdo')
      .trim()
      .min(1, 'Informe o conteúdo')
      .max(
        documentLimits.content,
        `O conteúdo pode ter no máximo ${documentLimits.content} caracteres`
      )
  })
)

const emptyForm = { subject: '', category: '', content: '' }

const isEditing = computed(() => entity.value != null)

const { documents, createDocument, updateDocument, isSavingDocument, saveDocumentError } =
  useWorld()
const { handleSubmit, resetForm, setErrors, values } = useForm({
  validationSchema: documentFormSchema,
  initialValues: emptyForm
})

// Categories already used in the world, offered as suggestions so the same one is spelled alike.
const categorySuggestions = computed(() => [
  ...new Set(documents.value.map((item) => item.category))
])
const contentLength = computed(() => (values.content ?? '').length)

const onSubmit = handleSubmit(async (formValues) => {
  const saved = entity.value
    ? await updateDocument(entity.value.id, formValues)
    : await createDocument(formValues)

  if (!saved) {
    applySaveErrors(saveDocumentError.value)
    return
  }
  toast.success(isEditing.value ? 'Documento atualizado' : 'Documento criado')
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

function fillForm(item: DocumentSummary | null): void {
  resetForm({
    values: item
      ? { subject: item.subject, category: item.category, content: item.content }
      : emptyForm
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

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const fieldControlClass =
  'h-auto rounded-lg border-border bg-background px-3.5 py-2.5 text-sm shadow-none placeholder:text-tertiary'
const textareaClass =
  'field-sizing-fixed h-48 resize-none rounded-lg border-border bg-background px-3.5 py-2.5 text-sm shadow-none placeholder:text-tertiary'
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
        Adicionar Documento
      </Button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-150 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-xl border border-border bg-card p-8 text-foreground shadow-dialog outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
      >
        <form class="flex flex-col gap-8" @submit="onSubmit">
          <DialogDescription class="sr-only">
            Informe o assunto, a categoria e o conteúdo do documento.
          </DialogDescription>
          <div class="flex items-center justify-between gap-4">
            <DialogTitle class="font-body text-xl font-bold">
              {{ isEditing ? 'Editar Documento' : 'Adicionar Documento' }}
            </DialogTitle>
            <DialogClose class="text-tertiary" :disabled="isSavingDocument">
              <X class="size-5" />
              <span class="sr-only">Fechar</span>
            </DialogClose>
          </div>

          <div class="flex flex-col gap-5">
            <div class="grid grid-cols-2 gap-4">
              <FormField v-slot="{ componentField }" name="subject" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Assunto</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Ex: Casa Lobam"
                      autocomplete="off"
                      :disabled="isSavingDocument"
                      :class="fieldControlClass"
                      v-bind="componentField"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="category" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Categoria</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      list="document-categories"
                      placeholder="Ex: economia"
                      autocomplete="off"
                      :disabled="isSavingDocument"
                      :class="fieldControlClass"
                      v-bind="componentField"
                    />
                  </FormControl>
                  <datalist id="document-categories">
                    <option
                      v-for="category in categorySuggestions"
                      :key="category"
                      :value="category"
                    />
                  </datalist>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <FormField v-slot="{ componentField }" name="content" keep-value>
              <FormItem class="gap-1.5">
                <FormLabel :class="fieldLabelClass">Conteúdo</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="O que o mundo sabe sobre este assunto."
                    :disabled="isSavingDocument"
                    :class="textareaClass"
                    v-bind="componentField"
                  />
                </FormControl>
                <FormDescription
                  class="text-badge"
                  :class="contentLength > documentLimits.content ? 'text-destructive' : ''"
                >
                  {{ contentLength }}/{{ documentLimits.content }} caracteres
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
                :disabled="isSavingDocument"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              class="h-auto rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover"
              :disabled="isSavingDocument"
            >
              {{ isEditing ? 'Salvar Alterações' : 'Salvar Documento' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
