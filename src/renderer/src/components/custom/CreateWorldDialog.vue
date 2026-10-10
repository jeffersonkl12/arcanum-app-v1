<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Plus, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import {
  worldGenreOptions,
  worldGenreValues,
  worldGenreValue
} from '@renderer/constant/world-genre.constant'
import { useWorld } from '@renderer/composable/world.composable'
import type { WorldDetail } from '@renderer/composable/world.type'
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
import type { IpcError } from '@shared'

const open = defineModel<boolean>('open', { default: false })
const entity = defineModel<WorldDetail | null>('entity', { default: null })

withDefaults(
  defineProps<{
    /** When false, the dialog is controlled only via `open` (no trigger button). */
    showTrigger?: boolean
  }>(),
  { showTrigger: true }
)

const formFields = ['name', 'genre', 'description'] as const

type FormFieldName = (typeof formFields)[number]

// Mirrors TEXT_LIMITS in the engine: name 120, long text 5000.
const createWorldFormSchema = toTypedSchema(
  z.object({
    name: z
      .string('Informe o nome do mundo')
      .trim()
      .min(1, 'Informe o nome do mundo')
      .max(120, 'O nome pode ter no máximo 120 caracteres'),
    genre: z.enum(worldGenreValues, 'Selecione um gênero'),
    description: z
      .string('A descrição é inválida')
      .max(5000, 'A descrição pode ter no máximo 5000 caracteres')
  })
)

const emptyForm = {
  name: '',
  description: ''
}

const isEditing = computed(() => entity.value != null)
const { createWorld, updateWorld, isCreating, createError } = useWorld()
const { handleSubmit, resetForm, setErrors } = useForm({
  validationSchema: createWorldFormSchema,
  initialValues: emptyForm
})

const onSubmit = handleSubmit(async (values) => {
  const payload = {
    name: values.name,
    genre: values.genre,
    description: values.description
  }

  const editing = isEditing.value
  const saved = entity.value
    ? await updateWorld(entity.value.id, payload)
    : await createWorld({ ...payload, isTemplate: false })

  if (!saved) {
    applyCreateErrors(createError.value)
    return
  }
  toast.success(editing ? 'Mundo atualizado' : 'Mundo criado')
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

function fillForm(world: WorldDetail | null): void {
  if (!world) {
    resetForm({ values: emptyForm })
    return
  }

  resetForm({
    values: {
      name: world.name,
      genre: worldGenreValue(world.genre),
      description: world.description
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
    <DialogTrigger v-if="showTrigger" as-child>
      <Button
        type="button"
        class="h-auto gap-2 rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover"
        @click="startCreate"
      >
        <Plus class="size-4.5" />
        Novo Mundo
      </Button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex w-[520px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card p-8 text-foreground shadow-dialog outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
      >
        <form class="flex flex-col gap-8" @submit="onSubmit">
          <DialogDescription class="sr-only">
            Informe o nome, o gênero e a descrição do mundo.
          </DialogDescription>
          <div class="flex items-center justify-between gap-4">
            <DialogTitle class="font-body text-xl font-bold">
              {{ isEditing ? 'Editar Mundo' : 'Criar Novo Mundo' }}
            </DialogTitle>
            <DialogClose class="text-tertiary" :disabled="isCreating">
              <X class="size-5" />
              <span class="sr-only">Fechar</span>
            </DialogClose>
          </div>

          <div class="flex flex-col gap-6">
            <FormField v-slot="{ componentField }" name="name" keep-value>
              <FormItem>
                <FormLabel class="text-muted-foreground">Nome do Mundo</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Ex: Eldoria"
                    autocomplete="off"
                    :disabled="isCreating"
                    class="h-auto rounded-lg border-border bg-background px-4 py-3 text-sm shadow-none placeholder:text-tertiary"
                    v-bind="componentField"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="genre" keep-value>
              <FormItem>
                <FormLabel class="text-muted-foreground">Gênero</FormLabel>
                <Select v-bind="componentField" :disabled="isCreating">
                  <FormControl>
                    <SelectTrigger
                      class="h-auto w-full rounded-lg border-border bg-background px-4 py-3 text-sm data-placeholder:text-tertiary"
                    >
                      <SelectValue placeholder="Selecione um gênero" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" class="bg-card">
                    <SelectItem
                      v-for="option in worldGenreOptions"
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

            <FormField v-slot="{ componentField }" name="description" keep-value>
              <FormItem>
                <FormLabel class="text-muted-foreground">Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Uma breve descrição sobre a lore e as regras deste mundo..."
                    :disabled="isCreating"
                    class="field-sizing-fixed h-[120px] resize-none rounded-lg border-border bg-background px-4 py-3 text-sm shadow-none placeholder:text-tertiary"
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
                :disabled="isCreating"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              class="h-auto rounded-full px-6 py-3 text-sm font-semibold hover:bg-primary-hover"
              :disabled="isCreating"
            >
              {{ isEditing ? 'Salvar Alterações' : 'Criar Mundo' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
