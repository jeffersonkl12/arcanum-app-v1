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
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger
} from '@renderer/components/ui/stepper'
import { actorAgeValues, actorGenderValues } from '@renderer/constant/actor.constant'
import { startCampaignSteps } from '@renderer/constant/campaign.constant'
import { useCampaign } from '@renderer/composable/campaign.composable'
import type { CampaignPrologueMode, StartCampaignStep } from '@renderer/composable/campaign.type'
import { useWorld } from '@renderer/composable/world.composable'
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
    appearance: z.string().max(5000, 'A aparência pode ter no máximo 5000 caracteres'),
    personality: z.string().max(5000, 'A personalidade pode ter no máximo 5000 caracteres'),
    background: z.string().max(5000, 'O background pode ter no máximo 5000 caracteres'),
    prologue: z.string().max(5000, 'O prólogo pode ter no máximo 5000 caracteres')
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

const open = ref(false)
const step = ref<StartCampaignStep>(1)
const prologueMode = ref<CampaignPrologueMode>('custom')
const imagePreviewUrl = ref<string>()
const imageData = ref<Uint8Array>()
const isStarting = ref(false)

const router = useRouter()
const { startCampaign, resetWizardParty, partyMemberIds } = useCampaign()
const { languages, cultures, currentWorld, loadWorld, visibleWorlds } = useWorld()
const { handleSubmit, resetForm, validateField, values } = useForm({
  validationSchema: startCampaignFormSchema,
  initialValues: emptyForm
})

const worldId = computed(() => currentWorld.value?.id ?? visibleWorlds.value[0]?.id ?? 'eldoria')
const worldName = computed(
  () => currentWorld.value?.name ?? visibleWorlds.value[0]?.name ?? 'Eldoria'
)

watch(open, async (isOpen) => {
  if (isOpen) {
    step.value = 1
    prologueMode.value = 'custom'
    resetWizardParty()
    await loadWorld(worldId.value)
    return
  }
  resetForm({ values: emptyForm })
  clearImage()
  step.value = 1
  prologueMode.value = 'custom'
  resetWizardParty()
})

onBeforeUnmount(() => {
  clearImage()
})

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
    const fields = [
      'name',
      'profession',
      'age',
      'gender',
      'languageId',
      'cultureId',
      'appearance',
      'personality',
      'background'
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
  if (prologueMode.value === 'custom') {
    const prologueResult = await validateField('prologue')
    if (!prologueResult.valid) return
  }

  isStarting.value = true
  try {
    startCampaign({
      worldId: worldId.value,
      worldName: worldName.value,
      character: {
        name: formValues.name,
        profession: formValues.profession,
        age: formValues.age,
        gender: formValues.gender,
        languageId: formValues.languageId,
        cultureId: formValues.cultureId,
        appearance: formValues.appearance,
        personality: formValues.personality,
        background: formValues.background
      },
      partyMemberIds: [...partyMemberIds.value],
      prologueMode: prologueMode.value,
      prologue: formValues.prologue
    })
    // Proposed: campaign:start not in ipcContract; draft stays local until the engine owns this flow.
    void imageData.value
    toast.success('Campanha iniciada')
    open.value = false
    void router.push({ name: 'game', params: { worldId: worldId.value } })
  } finally {
    isStarting.value = false
  }
})

function onCreateNpc(): void {
  toast.message('Crie NPCs pelo detalhe do mundo por enquanto.')
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
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
              <template v-for="(item, index) in startCampaignSteps" :key="item.step">
                <StepperItem
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
                          state === 'completed' &&
                            'border border-primary bg-primary/20 text-primary',
                          state === 'inactive' &&
                            'border border-border bg-transparent text-tertiary'
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
                </StepperItem>
                <StepperSeparator
                  v-if="index < startCampaignSteps.length - 1"
                  :class="
                    cn(
                      'mx-2 h-0.5 w-15 shrink-0 rounded-none',
                      step > item.step ? 'bg-primary' : 'bg-border'
                    )
                  "
                />
              </template>
            </Stepper>
          </div>

          <StartCampaignCharacterStep
            v-if="step === 1"
            :languages="languages"
            :cultures="cultures"
            :image-preview-url="imagePreviewUrl"
            :disabled="isStarting"
            @image-selected="onImageSelected"
          />
          <StartCampaignPartyStep
            v-else-if="step === 2"
            :player-name="values.name ?? ''"
            :world-name="worldName"
            :disabled="isStarting"
            @create-npc="onCreateNpc"
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
              :disabled="isStarting"
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
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>
