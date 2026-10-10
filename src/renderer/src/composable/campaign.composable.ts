import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { CampaignNpcCandidate, CampaignSummary, StartCampaignDraft } from './campaign.type'

// Proposed: campaign:list is not in ipcContract yet.
const campaigns = ref<CampaignSummary[]>([
  {
    id: 'shattered-realms',
    worldId: 'eldoria',
    name: 'Os Reinos Despedaçados',
    genre: 'Fantasia Épica',
    description:
      'Um reino fragmentado por guerras civis, onde facções rivais disputam o poder enquanto antigas magias despertam das ruínas.',
    status: 'in_progress'
  },
  {
    id: 'neon-whispers',
    worldId: 'neo-veridia',
    name: 'Sussurros do Neon',
    genre: 'Cyberpunk',
    description:
      'Em uma metrópole dominada por megacorporações, hackers e mercenários navegam entre neon e sombra em busca de segredos corporativos.',
    status: 'in_progress'
  },
  {
    id: 'path-of-ruin',
    worldId: 'dead-wastes',
    name: 'Caminho da Ruína',
    genre: 'Fantasia Sombria',
    description:
      'Uma jornada sombria por terras devastadas, onde sobreviventes enfrentam horrores ancestrais em busca de redenção.',
    status: 'in_progress'
  },
  {
    id: 'forgotten-tomb',
    worldId: 'eldoria',
    name: 'A Tumba Esquecida',
    genre: 'Terror Arqueológico',
    description:
      'Exploradores desvendam os mistérios de uma tumba selada há séculos, enfrentando armadilhas mortais e segredos proibidos.',
    status: 'in_progress'
  }
])

const search = ref('')

// Proposed: campaign:listNpcs / actor:listByWorld during start-campaign is not wired for this flow yet.
const worldNpcs = ref<CampaignNpcCandidate[]>([
  {
    id: 'elara',
    name: 'Elara Moonwhisper',
    subtitle: 'Arquimaga de Sylaris • Elfa'
  },
  {
    id: 'thorek',
    name: 'Thorek Ironbrow',
    subtitle: 'Capitão da Guarda Aérea • Anão'
  },
  {
    id: 'vaelin',
    name: 'Vaelin o Silencioso',
    subtitle: 'Informante da Guilda das Sombras • Humano'
  }
])

const npcSearch = ref('')
const partyMemberIds = ref<string[]>(['thorek'])

const visibleCampaigns = computed(() => {
  const term = search.value.trim().toLocaleLowerCase()
  if (term.length === 0) return campaigns.value
  return campaigns.value.filter(
    (campaign) =>
      campaign.name.toLocaleLowerCase().includes(term) ||
      campaign.genre.toLocaleLowerCase().includes(term) ||
      campaign.description.toLocaleLowerCase().includes(term)
  )
})

const visibleWorldNpcs = computed(() => {
  const term = npcSearch.value.trim().toLocaleLowerCase()
  const available = worldNpcs.value.filter((npc) => !partyMemberIds.value.includes(npc.id))
  if (term.length === 0) return available
  return available.filter(
    (npc) =>
      npc.name.toLocaleLowerCase().includes(term) || npc.subtitle.toLocaleLowerCase().includes(term)
  )
})

const partyMembers = computed(() =>
  worldNpcs.value.filter((npc) => partyMemberIds.value.includes(npc.id))
)

function addPartyMember(npcId: string): void {
  if (partyMemberIds.value.includes(npcId)) return
  partyMemberIds.value = [...partyMemberIds.value, npcId]
}

function removePartyMember(npcId: string): void {
  partyMemberIds.value = partyMemberIds.value.filter((id) => id !== npcId)
}

function resetWizardParty(): void {
  npcSearch.value = ''
  partyMemberIds.value = ['thorek']
}

// Proposed: campaign:start is not in ipcContract yet.
function startCampaign(draft: StartCampaignDraft): CampaignSummary {
  const created: CampaignSummary = {
    id: crypto.randomUUID(),
    worldId: draft.worldId,
    name: draft.character.name
      ? `Campanha de ${draft.character.name}`
      : `Nova campanha em ${draft.worldName}`,
    genre: 'Fantasia Épica',
    description:
      draft.prologueMode === 'custom' && draft.prologue.trim().length > 0
        ? draft.prologue.trim()
        : `Uma nova aventura começa em ${draft.worldName}.`,
    status: 'in_progress'
  }
  campaigns.value = [created, ...campaigns.value]
  return created
}

export function useCampaign(): {
  campaigns: Ref<CampaignSummary[]>
  search: Ref<string>
  visibleCampaigns: ComputedRef<CampaignSummary[]>
  worldNpcs: Ref<CampaignNpcCandidate[]>
  npcSearch: Ref<string>
  visibleWorldNpcs: ComputedRef<CampaignNpcCandidate[]>
  partyMembers: ComputedRef<CampaignNpcCandidate[]>
  partyMemberIds: Ref<string[]>
  addPartyMember: (npcId: string) => void
  removePartyMember: (npcId: string) => void
  resetWizardParty: () => void
  startCampaign: (draft: StartCampaignDraft) => CampaignSummary
} {
  return {
    campaigns,
    search,
    visibleCampaigns,
    worldNpcs,
    npcSearch,
    visibleWorldNpcs,
    partyMembers,
    partyMemberIds,
    addPartyMember,
    removePartyMember,
    resetWizardParty,
    startCampaign
  }
}
