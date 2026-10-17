<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { toImageUrl } from '@shared'
import type { Actor, FamilyMember, NewRelative } from '@schema'
import type { KinshipInput } from '@constant'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Spinner } from '@renderer/components/ui/spinner'
import { useRequest } from '@renderer/composable/request.composable'
import {
  compareKinship,
  kinshipInputOptions,
  kinshipLabel
} from '@renderer/constant/kinship.constant'

/**
 * The family of an actor. Only the direct bonds (parent, child, spouse) are recorded; siblings,
 * grandparents, uncles, cousins and in-laws are derived by the engine and shown as read-only.
 * With an `actorId` the bonds are saved at once; without one (the actor is being created) they are
 * kept in `draft` and sent along with the actor.
 */
const props = withDefaults(
  defineProps<{
    actorId?: string
    /** Where to find the possible relatives; needed to edit. */
    worldId?: string
    editable?: boolean
    /** Offer to make a new relative when the world has nobody to pick (the parent opens the form). */
    creatable?: boolean
    disabled?: boolean
  }>(),
  { actorId: undefined, worldId: undefined, editable: false, creatable: false, disabled: false }
)

const emit = defineEmits<{
  create: []
}>()

const draft = defineModel<NewRelative[]>('draft', { default: () => [] })

interface Row {
  actorId: string
  name: string
  imagePath: string | null
  label: string
  /** The bond the player recorded, or `null` when the engine derived this relative. */
  direct: KinshipInput | null
}

const { isLoading, request } = useRequest()
const family = ref<FamilyMember[]>()
const candidates = ref<Actor[]>([])
const pickedId = ref<string>()
const pickedRelation = ref<KinshipInput>('parent')

const rows = computed<Row[]>(() => {
  if (props.actorId) {
    return [...(family.value ?? [])]
      .sort((a, b) => compareKinship(a.relation, b.relation))
      .map((member) => ({
        actorId: member.actorId,
        name: member.name,
        imagePath: member.imagePath,
        label: kinshipLabel(member.relation, member.gender),
        direct: member.direct
      }))
  }

  return draft.value.flatMap(({ relativeId, relation }) => {
    const relative = candidates.value.find((actor) => actor.id === relativeId)
    if (!relative) return []

    return [
      {
        actorId: relativeId,
        name: relative.name,
        imagePath: relative.imagePath,
        label: kinshipLabel(relation, relative.gender),
        direct: relation
      }
    ]
  })
})

// Whoever already has a recorded bond is edited in place, not added again.
const options = computed(() => {
  const taken = new Set(rows.value.filter((row) => row.direct).map((row) => row.actorId))

  return candidates.value.filter((actor) => actor.id !== props.actorId && !taken.has(actor.id))
})

async function loadFamily(): Promise<void> {
  family.value = props.actorId ? await request('kinship:listByActor', props.actorId) : undefined
}

async function add(): Promise<void> {
  const relativeId = pickedId.value
  if (!relativeId) return

  if (await save(relativeId, pickedRelation.value)) pickedId.value = undefined
}

/** Records or changes the bond with the relative; whether the engine accepted it. */
async function save(relativeId: string, relation: KinshipInput): Promise<boolean> {
  if (props.actorId) {
    const updated = await request('kinship:set', { actorId: props.actorId, relativeId, relation })
    if (!updated) return false

    family.value = updated
    return true
  }

  draft.value = [
    ...draft.value.filter((entry) => entry.relativeId !== relativeId),
    { relativeId, relation }
  ]
  return true
}

async function remove(relativeId: string): Promise<void> {
  if (props.actorId) {
    family.value =
      (await request('kinship:remove', { actorId: props.actorId, relativeId })) ?? family.value
    return
  }

  draft.value = draft.value.filter((entry) => entry.relativeId !== relativeId)
}

async function loadCandidates(): Promise<void> {
  candidates.value =
    props.editable && props.worldId
      ? ((await request('actor:listByWorld', props.worldId)) ?? [])
      : []
}

/** Reads the world's actors again, e.g. after the parent made a new one; it is then preselected. */
async function reload(selectId?: string): Promise<void> {
  await loadCandidates()
  if (selectId && candidates.value.some((actor) => actor.id === selectId)) pickedId.value = selectId
}

defineExpose({ reload })

watch(() => props.actorId, loadFamily)
watch(() => props.worldId, loadCandidates)

onMounted(async () => {
  await loadFamily()
  await loadCandidates()
})

const selectTriggerClass =
  'h-auto w-full rounded-lg border-border bg-background px-3.5 py-2.5 text-sm data-placeholder:text-tertiary'
</script>

<template>
  <div v-if="props.actorId && !family" class="flex items-center justify-center py-12">
    <Spinner v-if="isLoading" class="size-6 text-primary" />
  </div>

  <div v-else class="flex flex-col gap-4">
    <div v-if="editable" class="flex flex-col gap-3">
      <div class="flex gap-3">
        <Select v-model="pickedId" :disabled="disabled || options.length === 0">
          <SelectTrigger :class="selectTriggerClass">
            <SelectValue placeholder="Selecione o parente" />
          </SelectTrigger>
          <SelectContent position="popper" class="bg-card">
            <SelectItem v-for="actor in options" :key="actor.id" :value="actor.id">
              {{ actor.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="pickedRelation" :disabled="disabled">
          <SelectTrigger :class="selectTriggerClass">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" class="bg-card">
            <SelectItem
              v-for="option in kinshipInputOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          class="h-auto shrink-0 gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-primary-hover"
          :disabled="disabled || !pickedId"
          @click="add"
        >
          <Plus class="size-4" />
          Adicionar
        </Button>
      </div>
      <div v-if="creatable" class="flex items-center justify-between gap-3">
        <p v-if="options.length === 0" class="text-xs text-tertiary">
          Não há ninguém neste mundo para escolher como parente.
        </p>
        <span v-else />
        <Button
          type="button"
          variant="outline"
          class="h-auto shrink-0 gap-2 rounded-full bg-transparent px-4 py-2 text-sm font-semibold"
          :disabled="disabled"
          @click="emit('create')"
        >
          <Plus class="size-4" />
          Criar novo parente
        </Button>
      </div>
      <p class="text-xs text-tertiary">
        A pessoa escolhida é
        {{ kinshipInputOptions.find((o) => o.value === pickedRelation)?.label.toLowerCase() }}
        deste personagem. Irmãos, avós, tios e primos são calculados a partir de pais e cônjuge.
      </p>
    </div>

    <p v-if="rows.length === 0" class="py-8 text-center text-sm text-tertiary">
      Nenhum parente registrado.
    </p>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="row in rows"
        :key="row.actorId"
        class="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
      >
        <Avatar class="size-9 rounded-lg after:border-transparent">
          <AvatarImage v-if="row.imagePath" :src="toImageUrl(row.imagePath)" :alt="row.name" />
          <AvatarFallback class="rounded-lg">{{ row.name.slice(0, 1) }}</AvatarFallback>
        </Avatar>
        <span class="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {{ row.name }}
        </span>
        <Badge
          class="h-auto rounded-full border-transparent px-3 py-1 text-badge font-bold tracking-wide uppercase"
          :class="row.direct ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'"
        >
          {{ row.label }}
        </Badge>
        <template v-if="editable && row.direct">
          <Select
            :model-value="row.direct"
            :disabled="disabled"
            @update:model-value="(value) => save(row.actorId, value as KinshipInput)"
          >
            <SelectTrigger
              class="h-auto w-40 rounded-lg border-border bg-background px-3 py-1.5 text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" class="bg-card">
              <SelectItem
                v-for="option in kinshipInputOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="text-destructive hover:bg-destructive/10 hover:text-destructive"
            :disabled="disabled"
            @click="remove(row.actorId)"
          >
            <Trash2 class="size-4" />
            <span class="sr-only">Remover {{ row.name }}</span>
          </Button>
        </template>
        <span v-else-if="!row.direct" class="text-xs text-tertiary">calculado</span>
      </div>
    </div>
  </div>
</template>
