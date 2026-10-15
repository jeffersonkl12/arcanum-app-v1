<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { ArrowLeft, ArrowRight, Check, Plus, Swords, X } from '@lucide/vue'
import { DialogContent, DialogPortal } from 'reka-ui'
import { useForm } from 'vee-validate'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import StartCampaignCharacterStep from './StartCampaignCharacterStep.vue'
import StartCampaignPartyStep from './StartCampaignPartyStep.vue'
import StartCampaignPrologueStep from './StartCampaignPrologueStep.vue'
import CreateNpcDialog from './CreateNpcDialog.vue'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger
} from '@renderer/components/ui/stepper'
import {
  actorAgeValues,
  actorGenderValues,
  actorTextLimits
} from '@renderer/constant/actor.constant'
import { startCampaignSteps } from '@renderer/constant/campaign.constant'
import { attributeFormShape } from '@renderer/util/attribute.util'
import { healthFormShape } from '@renderer/util/health.util'
import { useCampaign } from '@renderer/composable/campaign.composable'
import type { CampaignPrologueMode, StartCampaignStep } from '@renderer/composable/campaign.type'
import { useStartCampaign } from '@renderer/composable/start-campaign.composable'
import { useWorld } from '@renderer/composable/world.composable'
import type { ActorSummary } from '@renderer/composable/world.type'
import { cn } from '@renderer/lib/utils'
import { toast } from 'vue-sonner'

const startCampaignFormSchema = toTypedSchema(
  z.object({
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
    prologue: z.string().max(5000, 'O prólogo pode ter no máximo 5000 caracteres'),
    // The current health is not asked: a campaign starts at full health.
    hpMax: healthFormShape.hpMax,
    ...attributeFormShape
  })
)

const emptyForm = {
  name: '',
  profession: '',
  appearance: '',
  personality: '',
  background: '',
  prologue: ''
}

withDefaults(
  defineProps<{
    /** When false, the dialog is opened only through the store (no trigger button). */
    showTrigger?: boolean
  }>(),
  { showTrigger: true }
)

const npcOpen = ref(false)
const step = ref<StartCampaignStep>(1)
const prologueMode = ref<CampaignPrologueMode>('custom')
const imagePreviewUrl = ref<string>()
const imageData = ref<Uint8Array>()

const router = useRouter()
const { loadWorld } = useWorld()
const { templateOptions, templateFilter, loadTemplateOptions } = useCampaign()
const {
  isOpen,
  preferredTemplateId,
  templateId,
  languages,
  cultures,
  places,
  partyMemberIds,
  isLoadingOptions,
  isStarting,
  loadOptions,
  reset: resetParty,
  addNpcCandidate,
  addPartyMember,
  startCampaign
} = useStartCampaign()
const { handleSubmit, resetForm, setFieldValue, validateField, values } = useForm({
  validationSchema: startCampaignFormSchema,
  initialValues: emptyForm
})

const templateName = computed(
  () => templateOptions.value.find((option) => option.id === templateId.value)?.name ?? 'Mundo'
)

watch(isOpen, async (opening) => {
  if (!opening) {
    resetForm({ values: emptyForm })
    clearImage()
    resetParty()
    preferredTemplateId.value = undefined
    templateId.value = undefined
    step.value = 1
    prologueMode.value = 'custom'
    return
  }

  step.value = 1
  prologueMode.value = 'custom'
  const options = await loadTemplateOptions()
  const wanted = preferredTemplateId.value ?? templateFilter.value
  const initial = options.find((option) => option.id === wanted) ?? options[0]
  if (initial) await loadOptions(initial.id)
})

onBeforeUnmount(() => {
  clearImage()
})

/** The culture, the language and the place belong to a world, so the ones picked for another one are void. */
async function pickTemplate(id: unknown): Promise<void> {
  if (typeof id !== 'string' || id === templateId.value) return
  setFieldValue('languageId', undefined)
  setFieldValue('cultureId', undefined)
  setFieldValue('pointOfInterestId', undefined)
  await loadOptions(id)
}

function clearImage(): void {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
  imagePreviewUrl.value = undefined
  imageData.value = undefined
}

async function onImageSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  clearImage()
  imagePreviewUrl.value = URL.createObjectURL(file)
  imageData.value = new Uint8Array(await file.arrayBuffer())
}

async function goNext(): Promise<void> {
  if (step.value === 1) {
    if (!templateId.value) {
      toast.error('Escolha o mundo da campanha')
      return
    }
    const fields = [
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
      'strength',
      'dexterity',
      'intelligence'
    ] as const
    const results = await Promise.all(fields.map((field) => validateField(field)))
    if (results.some((result) => !result.valid)) return
    step.value = 2
    return
  }
  if (step.value === 2) {
    step.value = 3
  }
}

function goBack(): void {
  if (step.value === 1) return
  step.value = (step.value - 1) as StartCampaignStep
}

const onStart = handleSubmit(async (formValues) => {
  if (!templateId.value) return
  if (prologueMode.value === 'custom') {
    const prologueResult = await validateField('prologue')
    if (!prologueResult.valid) return
  }

  const campaignId = await startCampaign({
    templateId: templateId.value,
    character: {
      name: formValues.name,
      profession: formValues.profession,
      age: formValues.age,
      gender: formValues.gender,
      languageId: formValues.languageId,
      cultureId: formValues.cultureId,
      pointOfInterestId: formValues.pointOfInterestId,
      appearance: formValues.appearance,
      personality: formValues.personality,
      background: formValues.background,
      hpMax: formValues.hpMax,
      strength: formValues.strength,
      dexterity: formValues.dexterity,
      intelligence: formValues.intelligence,
      imageData: imageData.value
    },
    partyMemberIds: [...partyMemberIds.value],
    prologueMode: prologueMode.value,
    prologue: formValues.prologue
  })
  if (!campaignId) return

  toast.success('Campanha iniciada')
  isOpen.value = false
  void router.push({ name: 'game', params: { worldId: campaignId } })
})

/** A new NPC is made in the template, so the dialog works on it as the open world. */
async function onCreateNpc(): Promise<void> {
  if (!templateId.value) return
  await loadWorld(templateId.value)
  npcOpen.value = true
}

function onNpcCreated(actor: ActorSummary): void {
  addNpcCandidate({
    id: actor.id,
    name: actor.name,
    subtitle: actor.subtitle,
    imagePath: actor.imagePath
  })
  addPartyMember(actor.id)
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger v-if="showTrigger" as-child>
      <Button
        type="button"
        class="h-auto gap-2 rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-primary-hover"
      >
        <Plus class="size-4.5" />
        Nova Campanha
      </Button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="bg-black/60 supports-backdrop-filter:backdrop-blur-none" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[800px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-xl border border-border bg-card p-8 text-foreground shadow-dialog outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
      >
        <form class="flex flex-col gap-6" @submit.prevent>
          <DialogDescription class="sr-only">
            Assistente em três passos para iniciar uma nova campanha.
          </DialogDescription>

          <div class="flex flex-col gap-6">
            <div class="flex items-center justify-between gap-4">
              <DialogTitle class="font-body text-xl font-bold">Iniciar Nova Campanha</DialogTitle>
              <DialogClose class="text-tertiary" :disabled="isStarting">
                <X class="size-5" />
                <span class="sr-only">Fechar</span>
              </DialogClose>
            </div>

            <Stepper
              v-model="step"
              class="w-full items-center justify-between px-10"
              :linear="true"
            >
              <StepperItem
                v-for="(item, index) in startCampaignSteps"
                :key="item.step"
                v-slot="{ state }"
                :step="item.step"
                class="flex items-center gap-2"
                :completed="step > item.step"
              >
                <StepperTrigger
                  class="flex items-center gap-2 rounded-none p-0 disabled:opacity-100"
                >
                  <StepperIndicator
                    :class="
                      cn(
                        'size-7 text-meta font-bold',
                        state === 'active' && 'bg-primary text-primary-foreground',
                        state === 'completed' && 'border border-primary bg-primary/20 text-primary',
                        state === 'inactive' && 'border border-border bg-transparent text-tertiary'
                      )
                    "
                  >
                    <Check v-if="state === 'completed'" class="size-3.5" />
                    <span v-else>{{ item.step }}</span>
                  </StepperIndicator>
                  <StepperTitle
                    :class="
                      cn(
                        'text-sm',
                        state === 'active' && 'font-semibold text-foreground',
                        state === 'completed' && 'font-medium text-foreground',
                        state === 'inactive' && 'font-medium text-tertiary'
                      )
                    "
                  >
                    {{ item.title }}
                  </StepperTitle>
                </StepperTrigger>
                <!-- A separator only works inside its item, which it reads the state from. -->
                <StepperSeparator
                  v-if="index < startCampaignSteps.length - 1"
                  :class="
                    cn(
                      'mx-2 h-0.5 w-15 shrink-0 rounded-none',
                      step > item.step ? 'bg-primary' : 'bg-border'
                    )
                  "
                />
              </StepperItem>
            </Stepper>
          </div>

          <div v-if="step === 1" class="flex flex-col gap-1.5">
            <span class="text-meta font-medium text-muted-foreground">Mundo da campanha</span>
            <Select
              :model-value="templateId"
              :disabled="isStarting || templateOptions.length === 0"
              @update:model-value="void pickTemplate($event)"
            >
              <SelectTrigger
                class="h-auto w-full rounded-lg border-border bg-background px-3 py-2.5 text-meta data-placeholder:text-tertiary"
              >
                <SelectValue placeholder="Selecione um mundo" />
              </SelectTrigger>
              <SelectContent position="popper" class="bg-card">
                <SelectItem v-for="option in templateOptions" :key="option.id" :value="option.id">
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="templateOptions.length === 0" class="text-meta text-tertiary">
              Crie um mundo antes de iniciar uma campanha.
            </p>
          </div>

          <StartCampaignCharacterStep
            v-if="step === 1"
            :languages="languages"
            :cultures="cultures"
            :places="places"
            :image-preview-url="imagePreviewUrl"
            :disabled="isStarting"
            @image-selected="onImageSelected"
          />
          <StartCampaignPartyStep
            v-else-if="step === 2"
            :player-name="values.name ?? ''"
            :world-name="templateName"
            :disabled="isStarting"
            @create-npc="void onCreateNpc()"
          />
          <StartCampaignPrologueStep
            v-else
            v-model:prologue-mode="prologueMode"
            :disabled="isStarting"
          />

          <div class="flex items-center justify-between gap-4">
            <DialogClose v-if="step === 1" as-child>
              <Button
                type="button"
                variant="outline"
                class="h-auto rounded-full bg-transparent px-4 py-2.5 text-sm font-semibold"
                :disabled="isStarting"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              v-else
              type="button"
              variant="outline"
              class="h-auto gap-2 rounded-full bg-transparent px-4 py-2.5 text-sm font-semibold"
              :disabled="isStarting"
              @click="goBack"
            >
              <ArrowLeft class="size-4" />
              Voltar
            </Button>

            <Button
              v-if="step < 3"
              type="button"
              class="h-auto gap-2 rounded-full px-6 py-2.5 text-sm font-bold hover:bg-primary-hover"
              :disabled="isStarting || isLoadingOptions"
              @click="goNext"
            >
              Próximo
              <ArrowRight class="size-4" />
            </Button>
            <Button
              v-else
              type="button"
              class="h-auto gap-2 rounded-full px-6 py-3 text-sm font-bold hover:bg-primary-hover"
              :disabled="isStarting"
              @click="onStart"
            >
              <Swords class="size-4.5" />
              Iniciar Aventura!
            </Button>
          </div>
        </form>
        <CreateNpcDialog v-model:open="npcOpen" :show-trigger="false" @saved="onNpcCreated" />
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
