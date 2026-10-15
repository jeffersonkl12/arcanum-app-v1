<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import {
  CircleCheck,
  CircleX,
  Eye,
  EyeOff,
  KeyRound,
  PlugZap,
  Save,
  ShieldAlert
} from '@lucide/vue'
import { useForm } from 'vee-validate'
import { computed, onMounted, ref, watch } from 'vue'
import { z } from 'zod'
import type { AiConnectionResult, TestAiConnection, UpdateAiSetting } from '@schema'
import type { IpcError } from '@shared'
import { translateConnectionFailure } from '@renderer/util/ai-connection.util'
import { useAiSetting } from '@renderer/composable/ai-setting.composable'
import { Button } from '@renderer/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@renderer/components/ui/form'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@renderer/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Slider } from '@renderer/components/ui/slider'
import { Spinner } from '@renderer/components/ui/spinner'

const formFields = [
  'provider',
  'model',
  'temperature',
  'apiKey',
  'embeddingProvider',
  'embeddingApiKey'
] as const

type FormFieldName = (typeof formFields)[number]

const settingsFormSchema = toTypedSchema(
  z.object({
    provider: z.string().min(1, 'Selecione um provedor'),
    model: z.string().min(1, 'Selecione um modelo'),
    temperature: z.number().min(0, 'A temperatura deve ser no mínimo 0'),
    apiKey: z.string().max(512, 'A chave pode ter no máximo 512 caracteres').optional(),
    embeddingProvider: z.string().min(1, 'Selecione um provedor de embeddings'),
    embeddingApiKey: z.string().max(512, 'A chave pode ter no máximo 512 caracteres').optional()
  })
)

const showApiKey = ref(false)
const showEmbeddingApiKey = ref(false)
const {
  setting,
  catalog,
  isLoading,
  saveError,
  loadAiSetting,
  saveAiSetting,
  clearApiKey,
  clearEmbeddingApiKey,
  isTesting,
  testConnection
} = useAiSetting()

const { handleSubmit, resetForm, setFieldValue, setErrors, values } = useForm({
  validationSchema: settingsFormSchema,
  initialValues: {
    provider: '',
    model: '',
    temperature: 0.7,
    apiKey: '',
    embeddingProvider: '',
    embeddingApiKey: ''
  }
})

const selectedCatalog = computed(() => catalog.value.find((entry) => entry.id === values.provider))

const embeddingProviders = computed(() => catalog.value.filter((entry) => entry.supportsEmbeddings))

const embeddingProviderLabel = computed(
  () => embeddingProviders.value.find((entry) => entry.id === values.embeddingProvider)?.label
)

const models = computed(() => selectedCatalog.value?.models ?? [])

const maxTemperature = computed(() => selectedCatalog.value?.maxTemperature ?? 2)

const apiKeyPlaceholder = computed(() => {
  const status = setting.value?.apiKey
  if (!status) return 'Cole a chave de API'
  if (status.source === 'stored' && status.hint) {
    return `Chave salva terminando em ${status.hint}`
  }
  if (status.source === 'environment') return 'Usando chave do ambiente'
  return 'Cole a chave de API'
})

const hasStoredApiKey = computed(() => setting.value?.apiKey.source === 'stored')

const embeddingApiKeyPlaceholder = computed(() => {
  const status = setting.value?.embeddingApiKey
  if (status?.source === 'stored' && status.hint) return `Chave salva terminando em ${status.hint}`
  if (status?.source === 'chat') return 'Usando a chave do Mestre IA'
  if (status?.source === 'environment') return 'Usando chave do ambiente'
  return `Cole a chave de API ${embeddingProviderLabel.value ? `(${embeddingProviderLabel.value})` : ''}`.trim()
})

const hasStoredEmbeddingApiKey = computed(() => setting.value?.embeddingApiKey.source === 'stored')

const memoryUnavailable = computed(() => setting.value?.embeddingApiKey.configured === false)

type TestTarget = TestAiConnection['target']

const testResults = ref<Partial<Record<TestTarget, AiConnectionResult>>>({})
const testing = ref<TestTarget>()

// A result describes the key and model it was run with, so any change to them invalidates it.
watch(
  () => [values.provider, values.model, values.apiKey],
  () => delete testResults.value.chat
)
watch(
  () => [values.embeddingProvider, values.embeddingApiKey, values.provider, values.apiKey],
  () => delete testResults.value.embedding
)

function buildTest(target: TestTarget): TestAiConnection | undefined {
  const apiKey = values.apiKey?.trim() || undefined

  if (target === 'chat') {
    if (!values.provider || !values.model) return undefined
    return {
      target,
      provider: values.provider as Extract<TestAiConnection, { target: 'chat' }>['provider'],
      model: values.model,
      ...(apiKey ? { apiKey } : {})
    }
  }

  if (!values.embeddingProvider) return undefined
  // With no key of its own, the embeddings use the narrator's while both share a provider.
  const embeddingApiKey =
    values.embeddingApiKey?.trim() ||
    (values.embeddingProvider === values.provider ? apiKey : undefined)
  return {
    target,
    provider: values.embeddingProvider as Extract<
      TestAiConnection,
      { target: 'embedding' }
    >['provider'],
    ...(embeddingApiKey ? { apiKey: embeddingApiKey } : {})
  }
}

async function runTest(target: TestTarget): Promise<void> {
  const input = buildTest(target)
  if (!input) return
  testing.value = target
  delete testResults.value[target]
  try {
    const result = await testConnection(input)
    if (result) testResults.value[target] = result
  } finally {
    testing.value = undefined
  }
}

const temperatureLabel = computed(() => Number(values.temperature ?? 0).toFixed(1))

watch(
  () => values.provider,
  (provider, previous) => {
    if (!provider || provider === previous) return
    const entry = catalog.value.find((item) => item.id === provider)
    if (!entry) return
    const stillValid = entry.models.some((model) => model.id === values.model)
    if (!stillValid) setFieldValue('model', entry.models[0]?.id ?? '')
    if ((values.temperature ?? 0) > entry.maxTemperature) {
      setFieldValue('temperature', entry.maxTemperature)
    }
  }
)

onMounted(async () => {
  await loadAiSetting()
  syncFormFromSetting()
})

watch(setting, () => syncFormFromSetting())

function syncFormFromSetting(): void {
  if (!setting.value) return
  resetForm({
    values: {
      provider: setting.value.provider,
      model: setting.value.model,
      temperature: setting.value.temperature,
      apiKey: '',
      embeddingProvider: setting.value.embeddingProvider,
      embeddingApiKey: ''
    }
  })
}

const onSubmit = handleSubmit(async (formValues) => {
  const apiKey = formValues.apiKey?.trim()
  const embeddingApiKey = formValues.embeddingApiKey?.trim()
  const payload: UpdateAiSetting = {
    provider: formValues.provider as UpdateAiSetting['provider'],
    model: formValues.model,
    temperature: formValues.temperature,
    embeddingProvider: formValues.embeddingProvider as UpdateAiSetting['embeddingProvider'],
    ...(apiKey ? { apiKey } : {}),
    ...(embeddingApiKey ? { embeddingApiKey } : {})
  }
  const saved = await saveAiSetting(payload)
  if (!saved) {
    applySaveErrors(saveError.value)
    return
  }
  showApiKey.value = false
  showEmbeddingApiKey.value = false
})

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

function onTemperatureChange(value: number[] | undefined): void {
  setFieldValue('temperature', value?.[0] ?? 0)
}
</script>

<template>
  <section class="flex flex-col gap-8">
    <div class="flex max-w-xl flex-col gap-2">
      <h2 class="text-lg font-bold text-foreground">Configurações do Mestre IA</h2>
      <p class="text-sm text-muted-foreground">
        Escolha o motor de inteligência artificial responsável por narrar as suas campanhas,
        controlar os NPCs e guiar a aventura.
      </p>
    </div>

    <form class="flex flex-col gap-8" @submit="onSubmit">
      <div class="flex flex-col gap-6 rounded-xl border border-border bg-card p-8">
        <div class="flex gap-6">
          <FormField v-slot="{ componentField }" name="provider">
            <FormItem class="flex flex-1 flex-col gap-2">
              <FormLabel class="text-sm font-medium text-foreground">Provedor</FormLabel>
              <Select
                :model-value="componentField.modelValue"
                :disabled="isLoading"
                @update:model-value="componentField['onUpdate:modelValue']"
              >
                <FormControl>
                  <SelectTrigger
                    class="h-auto w-full rounded-lg border-border bg-background px-4 py-3 text-sm"
                  >
                    <SelectValue placeholder="Selecione um provedor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem v-for="entry in catalog" :key="entry.id" :value="entry.id">
                    {{ entry.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="model">
            <FormItem class="flex flex-1 flex-col gap-2">
              <FormLabel class="text-sm font-medium text-foreground">Modelo</FormLabel>
              <Select
                :model-value="componentField.modelValue"
                :disabled="isLoading || models.length === 0"
                @update:model-value="componentField['onUpdate:modelValue']"
              >
                <FormControl>
                  <SelectTrigger
                    class="h-auto w-full rounded-lg border-border bg-background px-4 py-3 text-sm"
                  >
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem v-for="model in models" :key="model.id" :value="model.id">
                    {{ model.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <FormField name="temperature">
          <FormItem class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <FormLabel class="text-sm font-medium text-foreground">
                Temperatura (Criatividade)
              </FormLabel>
              <span class="text-sm font-bold text-primary">{{ temperatureLabel }}</span>
            </div>
            <FormControl>
              <Slider
                :model-value="[Number(values.temperature ?? 0)]"
                :min="0"
                :max="maxTemperature"
                :step="0.1"
                :disabled="isLoading"
                class="py-1"
                @update:model-value="onTemperatureChange"
              />
            </FormControl>
            <div class="flex justify-between">
              <span class="text-xs text-tertiary">Preciso</span>
              <span class="text-xs text-tertiary">Criativo</span>
            </div>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="apiKey">
          <FormItem class="flex flex-col gap-2">
            <FormLabel class="text-sm font-medium text-foreground">
              Chave de API (API Key)
            </FormLabel>
            <FormControl>
              <InputGroup class="h-auto rounded-lg border-border bg-background">
                <InputGroupInput
                  v-bind="componentField"
                  :type="showApiKey ? 'text' : 'password'"
                  :placeholder="apiKeyPlaceholder"
                  :disabled="isLoading"
                  autocomplete="off"
                  class="h-auto px-4 py-3 text-sm"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    class="text-tertiary"
                    :aria-label="showApiKey ? 'Ocultar chave' : 'Mostrar chave'"
                    @click="showApiKey = !showApiKey"
                  >
                    <EyeOff v-if="!showApiKey" class="size-4" />
                    <Eye v-else class="size-4" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </FormControl>
            <div class="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="gap-2 rounded-full bg-transparent"
                :disabled="isLoading || isTesting"
                @click="runTest('chat')"
              >
                <Spinner v-if="testing === 'chat'" class="size-4" />
                <PlugZap v-else class="size-4" />
                Testar chave do Mestre IA
              </Button>
              <p v-if="testResults.chat?.ok" class="flex items-center gap-1 text-xs text-primary">
                <CircleCheck class="size-4" />
                Funcionando ({{ testResults.chat.latencyMs }} ms)
              </p>
              <p
                v-else-if="testResults.chat"
                class="flex items-center gap-1 text-xs text-destructive"
              >
                <CircleX class="size-4 shrink-0" />
                {{ translateConnectionFailure(testResults.chat.reason) }}
              </p>
            </div>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="embeddingProvider">
          <FormItem class="flex flex-col gap-2">
            <FormLabel class="text-sm font-medium text-foreground">
              Provedor da memória (Embeddings)
            </FormLabel>
            <Select
              :model-value="componentField.modelValue"
              :disabled="isLoading"
              @update:model-value="componentField['onUpdate:modelValue']"
            >
              <FormControl>
                <SelectTrigger
                  class="h-auto w-full rounded-lg border-border bg-background px-4 py-3 text-sm"
                >
                  <SelectValue placeholder="Selecione um provedor" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem v-for="entry in embeddingProviders" :key="entry.id" :value="entry.id">
                  {{ entry.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-tertiary">
              Trocar de provedor não apaga as memórias: cada um guarda as suas, e elas voltam a ser
              lidas quando você escolher o provedor de novo.
            </p>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="embeddingApiKey">
          <FormItem class="flex flex-col gap-2">
            <FormLabel class="text-sm font-medium text-foreground">
              Chave de API para a memória (Embeddings)
            </FormLabel>
            <FormControl>
              <InputGroup class="h-auto rounded-lg border-border bg-background">
                <InputGroupInput
                  v-bind="componentField"
                  :type="showEmbeddingApiKey ? 'text' : 'password'"
                  :placeholder="embeddingApiKeyPlaceholder"
                  :disabled="isLoading"
                  autocomplete="off"
                  class="h-auto px-4 py-3 text-sm"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    class="text-tertiary"
                    :aria-label="showEmbeddingApiKey ? 'Ocultar chave' : 'Mostrar chave'"
                    @click="showEmbeddingApiKey = !showEmbeddingApiKey"
                  >
                    <EyeOff v-if="!showEmbeddingApiKey" class="size-4" />
                    <Eye v-else class="size-4" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </FormControl>
            <p class="text-xs text-tertiary">
              Usada só para a memória dos personagens (busca por significado). É a chave do provedor
              de embeddings acima, qualquer que seja o provedor do Mestre IA.
            </p>
            <p v-if="memoryUnavailable" class="text-xs text-destructive">
              Sem esta chave a memória dos personagens fica desativada: nada é gravado nem buscado.
            </p>
            <div class="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="gap-2 rounded-full bg-transparent"
                :disabled="isLoading || isTesting"
                @click="runTest('embedding')"
              >
                <Spinner v-if="testing === 'embedding'" class="size-4" />
                <PlugZap v-else class="size-4" />
                Testar embeddings
              </Button>
              <p
                v-if="testResults.embedding?.ok"
                class="flex items-center gap-1 text-xs text-primary"
              >
                <CircleCheck class="size-4" />
                Funcionando ({{ testResults.embedding.latencyMs }} ms)
              </p>
              <p
                v-else-if="testResults.embedding"
                class="flex items-center gap-1 text-xs text-destructive"
              >
                <CircleX class="size-4 shrink-0" />
                {{ translateConnectionFailure(testResults.embedding.reason) }}
              </p>
            </div>
            <FormMessage />
          </FormItem>
        </FormField>

        <div
          class="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3"
        >
          <ShieldAlert class="mt-0.5 size-4 shrink-0 text-destructive" />
          <p class="text-meta text-muted-foreground">
            Sua chave de API fica armazenada localmente e nunca é enviada para os nossos servidores.
          </p>
        </div>
      </div>

      <div class="flex justify-end gap-4">
        <Button
          v-if="hasStoredApiKey"
          type="button"
          variant="outline"
          class="h-auto gap-2 rounded-full bg-transparent px-6 py-3 text-sm font-semibold"
          :disabled="isLoading"
          @click="void clearApiKey()"
        >
          <KeyRound class="size-4.5" />
          Remover chave salva
        </Button>
        <Button
          v-if="hasStoredEmbeddingApiKey"
          type="button"
          variant="outline"
          class="h-auto gap-2 rounded-full bg-transparent px-6 py-3 text-sm font-semibold"
          :disabled="isLoading"
          @click="void clearEmbeddingApiKey()"
        >
          <KeyRound class="size-4.5" />
          Remover chave de embeddings
        </Button>
        <Button
          type="submit"
          class="h-auto gap-2 rounded-full px-6 py-3 text-sm font-bold hover:bg-primary-hover"
          :disabled="isLoading"
        >
          <Save class="size-4.5" />
          Salvar Configurações
        </Button>
      </div>
    </form>
  </section>
</template>
