<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import ConfirmDialog from '@renderer/components/custom/ConfirmDialog.vue'
import CreateDocumentDialog from '@renderer/components/custom/CreateDocumentDialog.vue'
import DocumentCard from '@renderer/components/custom/DocumentCard.vue'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { NativeSelect } from '@renderer/components/ui/native-select'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { useGame } from '@renderer/composable/game.composable'
import { useWorld } from '@renderer/composable/world.composable'
import type { DocumentSummary } from '@renderer/composable/world.type'

const { session } = useGame()
const { currentWorld, documents, loadWorld, deleteDocument } = useWorld()

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

const search = ref('')
const categoryFilter = ref('')
const formOpen = ref(false)
const editingDocument = ref<DocumentSummary | null>(null)
const pendingDelete = ref<DocumentSummary | null>(null)
const deleteConfirmOpen = ref(false)
const isDeleting = ref(false)

// The dialog saves into the open world, so the campaign's world is loaded when the tab opens.
const isReady = computed(
  () => currentWorld.value !== undefined && currentWorld.value.id === session.value?.worldId
)

onMounted(() => {
  if (session.value) void loadWorld(session.value.worldId)
})

const categories = computed(() =>
  [...new Set(documents.value.map((entry) => entry.category))].sort(collator.compare)
)

function openCreate(): void {
  editingDocument.value = null
  formOpen.value = true
}

function openEdit(entry: DocumentSummary): void {
  editingDocument.value = entry
  formOpen.value = true
}

function requestDelete(entry: DocumentSummary): void {
  pendingDelete.value = entry
  deleteConfirmOpen.value = true
}

async function confirmDelete(): Promise<void> {
  const target = pendingDelete.value
  if (!target || isDeleting.value) return

  isDeleting.value = true
  try {
    // On failure the engine's message was already shown.
    if (!(await deleteDocument(target.id))) return

    toast.success('Documento removido')
    deleteConfirmOpen.value = false
    pendingDelete.value = null
  } finally {
    isDeleting.value = false
  }
}

const deleteDescription = computed(() =>
  pendingDelete.value
    ? `Tem certeza que deseja apagar ${pendingDelete.value.subject}? Esta ação não pode ser desfeita.`
    : 'Esta ação não pode ser desfeita.'
)

const shown = computed(() => {
  const term = search.value.trim().toLocaleLowerCase()
  return documents.value
    .filter(
      (entry) =>
        (!categoryFilter.value || entry.category === categoryFilter.value) &&
        (!term ||
          `${entry.subject} ${entry.category} ${entry.content}`.toLocaleLowerCase().includes(term))
    )
    .sort((a, b) => collator.compare(a.subject, b.subject))
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex flex-col gap-2 border-b border-border p-4">
      <Input v-model="search" placeholder="Buscar documento..." />
      <div class="grid grid-cols-[1fr_auto] gap-2">
        <NativeSelect v-model="categoryFilter" class="w-full" aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </NativeSelect>
        <Button
          type="button"
          class="h-auto gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-primary-hover"
          :disabled="!isReady"
          @click="openCreate"
        >
          <Plus class="size-4" />
          Novo
        </Button>
      </div>
    </div>
    <ScrollArea class="min-h-0 flex-1">
      <div class="flex flex-col gap-3 p-4">
        <p v-if="!isReady" class="text-sm text-tertiary">Carregando documentos...</p>
        <template v-else>
          <DocumentCard
            v-for="entry in shown"
            :key="entry.id"
            :document="entry"
            @edit="openEdit(entry)"
            @remove="requestDelete(entry)"
          />
          <p v-if="shown.length === 0" class="text-sm text-tertiary">
            Nenhum documento encontrado.
          </p>
        </template>
      </div>
    </ScrollArea>
    <CreateDocumentDialog
      v-model:open="formOpen"
      v-model:entity="editingDocument"
      :show-trigger="false"
    />
    <ConfirmDialog
      v-model:open="deleteConfirmOpen"
      title="Apagar documento"
      :description="deleteDescription"
      confirm-label="Apagar"
      cancel-label="Cancelar"
      confirm-variant="destructive"
      :confirming="isDeleting"
      @confirm="void confirmDelete()"
    />
  </div>
</template>
