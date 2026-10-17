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
  actorAgeOptions,
  actorAgeValues,
  actorGenderOptions,
  actorGenderValues
} from '@renderer/constant/actor.constant'
import { useWorld } from '@renderer/composable/world.composable'
import { actorHpLimits, actorTextLimits } from '@renderer/constant/actor.constant'
import { attributeFormShape } from '@renderer/util/attribute.util'
import { coinFormShape } from '@renderer/util/coin.util'
import {
  healthConsistencyIssue,
  healthFormShape,
  isHealthConsistent
} from '@renderer/util/health.util'
import type { NewRelative } from '@schema'
import type { ActorSummary } from '@renderer/composable/world.type'
import AttributeFields from '@renderer/components/custom/AttributeFields.vue'
import ActorPlaceField from '@renderer/components/custom/ActorPlaceField.vue'
import CoinFields from '@renderer/components/custom/CoinFields.vue'
import HealthFields from '@renderer/components/custom/HealthFields.vue'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { Textarea } from '@renderer/components/ui/textarea'
import ActorFamilyPanel from '@renderer/components/custom/ActorFamilyPanel.vue'
import ActorInventoryPicker from '@renderer/components/custom/ActorInventoryPicker.vue'
import { cn } from '@renderer/lib/utils'

const open = defineModel<boolean>('open', { default: false })
const entity = defineModel<ActorSummary | null>('entity', { default: null })

const props = withDefaults(
  defineProps<{
    /** When false, the dialog is controlled only via `open` (no trigger button). */
    showTrigger?: boolean
    /** Health and attributes cannot change anymore, not even by rolling (a running campaign). */
    lockStats?: boolean
  }>(),
  { showTrigger: true, lockStats: false }
)

const emit = defineEmits<{
  saved: [actor: ActorSummary]
}>()

const formFields = [
  'name',
  'profession',
  'age',
  'gender',
  'languageId',
  'cultureId',
  'pointOfInterestId',
  'appearance',
  'personality',
  'background',
  'hpMax',
  'hpCurrent',
  'strength',
  'dexterity',
  'intelligence',
  'goldPieces',
  'silverPieces',
  'bronzePieces'
] as const

type FormFieldName = (typeof formFields)[number]

// Mirrors TEXT_LIMITS in the engine: name/shortText 120, profile texts in ACTOR_TEXT_LIMITS.
const createNpcFormSchema = toTypedSchema(
  z
    .object({
      name: z
        .string('Informe o nome')
        .trim()
        .min(1, 'Informe o nome')
        .max(120, 'O nome pode ter no máximo 120 caracteres'),
      profession: z.string().max(120, 'A profissão pode ter no máximo 120 caracteres'),
      age: z.enum(actorAgeValues, 'Selecione a idade'),
      gender: z.enum(actorGenderValues, 'Selecione o gênero'),
      languageId: z.string().optional(),
      cultureId: z.string().optional(),
      pointOfInterestId: z
        .string('Selecione o ponto de interesse')
        .min(1, 'Selecione o ponto de interesse'),
      appearance: z
        .string()
        .max(
          actorTextLimits.appearance,
          `A aparência pode ter no máximo ${actorTextLimits.appearance} caracteres`
        ),
      personality: z
        .string()
        .max(
          actorTextLimits.personality,
          `A personalidade pode ter no máximo ${actorTextLimits.personality} caracteres`
        ),
      background: z
        .string()
        .max(
          actorTextLimits.background,
          `O background pode ter no máximo ${actorTextLimits.background} caracteres`
        ),
      ...healthFormShape,
      ...attributeFormShape,
      ...coinFormShape
    })
    .refine(isHealthConsistent, healthConsistencyIssue)
)

const emptyForm = {
  name: '',
  profession: '',
  appearance: '',
  personality: '',
  background: '',
  goldPieces: 0,
  silverPieces: 0,
  bronzePieces: 0
}

const isEditing = computed(() => entity.value != null)
const imageInput = ref<HTMLInputElement>()
const imagePreviewUrl = ref<string>()
const imageData = ref<Uint8Array>()
const existingImagePath = ref<string | null>()

const activeTab = ref('profile')
// The items the actor will carry, and the ones it carried when the dialog opened (editing).
const inventoryIds = ref<string[]>([])
const carriedIds = ref<string[]>([])
// The family bonds a new actor is created with; an existing one edits its family live.
const relatives = ref<NewRelative[]>([])

const {
  createActor,
  updateActor,
  isCreatingActor,
  createActorError,
  currentWorld,
  languages,
  cultures,
  places,
  loadInventoryItemIds,
  syncInventory
} = useWorld()
const { handleSubmit, resetForm, setErrors } = useForm({
  validationSchema: createNpcFormSchema,
  initialValues: emptyForm
})

const previewSrc = computed(() => {
  if (imagePreviewUrl.value) return imagePreviewUrl.value
  if (existingImagePath.value) return toImageUrl(existingImagePath.value)
  return undefined
})

const onSubmit = handleSubmit(async (values) => {
  const payload = {
    name: values.name,
    profession: values.profession,
    age: values.age,
    gender: values.gender,
    languageId: values.languageId || null,
    cultureId: values.cultureId || null,
    pointOfInterestId: values.pointOfInterestId,
    appearance: values.appearance,
    personality: values.personality,
    background: values.background,
    // A locked actor sends none of these, so what it has stays untouched.
    hpMax: props.lockStats ? undefined : values.hpMax,
    // The current health is only asked when editing; a new actor starts at full health.
    hpCurrent: isEditing.value && !props.lockStats ? values.hpCurrent : undefined,
    strength: props.lockStats ? undefined : values.strength,
    dexterity: props.lockStats ? undefined : values.dexterity,
    intelligence: props.lockStats ? undefined : values.intelligence,
    goldPieces: values.goldPieces,
    silverPieces: values.silverPieces,
    bronzePieces: values.bronzePieces,
    imageData: imageData.value,
    ...(isEditing.value ? {} : { relatives: relatives.value })
  }

  const editing = isEditing.value
  const saved = entity.value
    ? await updateActor(entity.value.id, payload)
    : await createActor(payload)

  if (!saved) {
    applyCreateErrors(createActorError.value)
    return
  }
  if (inventoryChanged() && !(await syncInventory(saved.id, inventoryIds.value))) {
    toast.warning('Personagem salvo, mas o inventário não foi totalmente atualizado')
  }
  toast.success(editing ? 'Personagem atualizado' : 'Personagem criado')
  emit('saved', saved)
  open.value = false
}, reportInvalidForm)

/** The form refuses to submit; a field on another tab would otherwise fail without a word. */
function reportInvalidForm({
  errors
}: {
  errors: Partial<Record<string, string | undefined>>
}): void {
  const [message] = Object.values(errors).filter(Boolean)
  toast.error(message ?? 'Revise os campos do personagem')
}

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

function inventoryChanged(): boolean {
  const wanted = inventoryIds.value
  return (
    wanted.length !== carriedIds.value.length || wanted.some((id) => !carriedIds.value.includes(id))
  )
}

function startCreate(): void {
  entity.value = null
}

function fillForm(actor: ActorSummary | null): void {
  clearImage()
  activeTab.value = 'profile'
  inventoryIds.value = []
  carriedIds.value = []
  relatives.value = []
  if (!actor) {
    resetForm({ values: emptyForm })
    return
  }

  void loadInventoryItemIds(actor.id).then((ids) => {
    carriedIds.value = ids
    inventoryIds.value = [...ids]
  })
  existingImagePath.value = actor.imagePath ?? null
  resetForm({
    values: {
      name: actor.name,
      profession: actor.profession,
      age: actor.age,
      gender: actor.gender,
      languageId: actor.languageId ?? undefined,
      cultureId: actor.cultureId ?? undefined,
      // An actor may have no place by now; the form then asks for one before saving.
      pointOfInterestId: actor.pointOfInterestId ?? undefined,
      appearance: actor.appearance,
      personality: actor.personality,
      background: actor.background,
      hpMax: actor.hpMax,
      hpCurrent: actor.hpCurrent,
      strength: actor.strength,
      dexterity: actor.dexterity,
      intelligence: actor.intelligence,
      goldPieces: actor.goldPieces,
      silverPieces: actor.silverPieces,
      bronzePieces: actor.bronzePieces
    }
  })
}

function applyCreateErrors(error: IpcError | undefined): void {
  if (error?.kind !== 'invalid_input') return
  const fieldErrors: Partial<Record<FormFieldName, string>> = {}
  const unmatched: string[] = []
  for (const issue of error.issues ?? []) {
    if (isFormField(issue.path)) fieldErrors[issue.path] = issue.message
    else unmatched.push(`${issue.path}: ${issue.message}`)
  }
  setErrors(fieldErrors)
  // `useRequest` leaves invalid input to the form, so what no field shows is told here.
  if (unmatched.length > 0 || Object.keys(fieldErrors).length === 0) {
    toast.error(unmatched.join('; ') || 'Os dados do personagem foram recusados')
  }
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

const tabTriggerClass = cn(
  'h-auto flex-none rounded-none border-0 bg-transparent px-0 pb-3 text-sm font-medium text-tertiary shadow-none',
  'hover:text-foreground data-active:bg-transparent data-active:font-semibold data-active:text-primary',
  'dark:data-active:border-transparent dark:data-active:bg-transparent',
  'after:bg-primary group-data-horizontal/tabs:after:bottom-0 group-data-[variant=line]/tabs-list:data-active:after:opacity-100'
)

const fieldLabelClass = 'text-meta font-medium text-muted-foreground'
const fieldControlClass =
  'h-auto rounded-lg border-border bg-background px-3.5 py-2.5 text-sm shadow-none placeholder:text-tertiary'
const selectTriggerClass =
  'h-auto w-full rounded-lg border-border bg-background px-3.5 py-2.5 text-sm data-placeholder:text-tertiary'
const textareaClass =
  'field-sizing-fixed h-40 resize-none rounded-lg border-border bg-background px-3.5 py-2.5 text-sm shadow-none placeholder:text-tertiary'
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
        Adicionar NPC
      </Button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[680px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-xl border border-border bg-card p-8 text-foreground shadow-dialog outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
      >
        <form class="flex flex-col gap-8" @submit="onSubmit">
          <DialogDescription class="sr-only">
            Informe os dados do personagem: nome, idade, gênero, cultura e descrição.
          </DialogDescription>
          <div class="flex items-center justify-between gap-4">
            <DialogTitle class="font-body text-xl font-bold">
              {{ isEditing ? 'Editar Personagem' : 'Adicionar Personagem' }}
            </DialogTitle>
            <DialogClose class="text-tertiary" :disabled="isCreatingActor">
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
                :disabled="isCreatingActor"
                @change="onImageSelected"
              />
              <button
                type="button"
                class="flex size-20 shrink-0 flex-col items-center justify-center overflow-hidden rounded-full border border-border bg-background text-tertiary"
                :disabled="isCreatingActor"
                @click="openImagePicker"
              >
                <img
                  v-if="previewSrc"
                  :src="previewSrc"
                  alt="Prévia do personagem"
                  class="size-full object-cover"
                />
                <Camera v-else class="size-6" />
                <span class="sr-only">Escolher imagem do personagem</span>
              </button>

              <div class="flex min-w-0 flex-1 flex-col gap-4">
                <FormField v-slot="{ componentField }" name="name" keep-value>
                  <FormItem class="gap-1.5">
                    <FormLabel :class="fieldLabelClass">Nome</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Ex: Elara Moonwhisper"
                        autocomplete="off"
                        :disabled="isCreatingActor"
                        :class="fieldControlClass"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="profession" keep-value>
                  <FormItem class="gap-1.5">
                    <FormLabel :class="fieldLabelClass">Profissão / Classe</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Ex: Arquimaga"
                        autocomplete="off"
                        :disabled="isCreatingActor"
                        :class="fieldControlClass"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <FormField v-slot="{ componentField }" name="age" keep-value>
                <FormItem class="gap-1.5">
                  <FormLabel :class="fieldLabelClass">Idade</FormLabel>
                  <Select v-bind="componentField" :disabled="isCreatingActor">
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
                  <Select v-bind="componentField" :disabled="isCreatingActor">
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
                  <Select v-bind="componentField" :disabled="isCreatingActor">
                    <FormControl>
                      <SelectTrigger :class="selectTriggerClass">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" class="bg-card">
                      <SelectItem
                        v-for="language in languages"
                        :key="language.id"
                        :value="language.id"
                      >
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
                  <Select v-bind="componentField" :disabled="isCreatingActor">
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

            <ActorPlaceField :places="places" :disabled="isCreatingActor" />

            <HealthFields
              :show-current="isEditing"
              :default-max="actorHpLimits.defaultNpc"
              :locked="lockStats"
              :disabled="isCreatingActor"
            />

            <AttributeFields :locked="lockStats" :disabled="isCreatingActor" />

            <Tabs v-model="activeTab" class="flex w-full flex-col gap-5">
              <TabsList
                variant="line"
                class="h-auto w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0"
              >
                <TabsTrigger value="profile" :class="tabTriggerClass">
                  Aparência e História
                </TabsTrigger>
                <TabsTrigger value="inventory" :class="tabTriggerClass">Inventário</TabsTrigger>
                <TabsTrigger value="family" :class="tabTriggerClass">Família</TabsTrigger>
              </TabsList>

              <!-- force-mount: the fields stay registered in the form while the other tab is open. -->
              <TabsContent
                value="profile"
                force-mount
                class="flex flex-col gap-5 outline-none data-[state=inactive]:hidden"
              >
                <FormField v-slot="{ componentField }" name="appearance" keep-value>
                  <FormItem class="gap-1.5">
                    <FormLabel :class="fieldLabelClass">Aparência</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva as características físicas, roupas, marcas..."
                        :disabled="isCreatingActor"
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
                        placeholder="Traços marcantes, medos, motivações..."
                        :disabled="isCreatingActor"
                        :class="textareaClass"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="background" keep-value>
                  <FormItem class="gap-1.5">
                    <FormLabel :class="fieldLabelClass">Background / História</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="De onde veio e o que busca neste mundo..."
                        :disabled="isCreatingActor"
                        :class="textareaClass"
                        v-bind="componentField"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </TabsContent>

              <!-- force-mount: the coin fields stay registered in the form while the other tab is open. -->
              <TabsContent
                value="inventory"
                force-mount
                class="flex flex-col gap-5 outline-none data-[state=inactive]:hidden"
              >
                <CoinFields :disabled="isCreatingActor" />
                <ActorInventoryPicker
                  v-model="inventoryIds"
                  :carried-ids="carriedIds"
                  :disabled="isCreatingActor"
                />
              </TabsContent>

              <TabsContent value="family" class="outline-none">
                <ActorFamilyPanel
                  v-model:draft="relatives"
                  :actor-id="entity?.id"
                  :world-id="currentWorld?.id"
                  editable
                  :disabled="isCreatingActor"
                />
                <p v-if="isEditing" class="mt-3 text-xs text-tertiary">
                  Alterações na família são salvas na hora, sem precisar salvar o personagem.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          <div class="flex justify-end gap-4">
            <DialogClose as-child>
              <Button
                type="button"
                variant="outline"
                class="h-auto rounded-full bg-transparent px-4 py-2.5 text-sm font-semibold"
                :disabled="isCreatingActor"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              class="h-auto rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover"
              :disabled="isCreatingActor"
            >
              {{ isEditing ? 'Salvar Alterações' : 'Salvar Personagem' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
