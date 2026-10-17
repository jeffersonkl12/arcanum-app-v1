import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import { partyLimits } from '@renderer/constant/party.constant'
import type { Actor, Item, NewRelative } from '@schema'
import { AI_PROLOGUE_REQUEST } from '@renderer/constant/campaign.constant'
import { translateIpcError } from '@renderer/util/ipc-error.util'
import { mapClonedIds } from '@renderer/util/clone-mapping.util'
import { emptyToNull } from '@renderer/util/text.util'
import { toCampaignNpcCandidate } from './campaign.mapper'
import type { CampaignNpcCandidate, StartCampaignDraft } from './campaign.type'
import { useCampaign } from './campaign.composable'
import { useRequest } from './request.composable'
import { toNamedEntitySummary, toPlaceSummaries } from './world.mapper'
import type { NamedEntitySummary, PlaceSummary } from './world.type'
import { useCampaignWizardStore } from '@renderer/store/campaign-wizard.store'
import { useGameStore } from '@renderer/store/game.store'

// The engine caps a world name at 120 characters (TEXT_LIMITS.name).
const MAX_NAME_LENGTH = 120

export function useStartCampaign(): {
  isOpen: Ref<boolean>
  preferredTemplateId: Ref<string | undefined>
  templateId: Ref<string | undefined>
  languages: Ref<NamedEntitySummary[]>
  cultures: Ref<NamedEntitySummary[]>
  places: Ref<PlaceSummary[]>
  npcSearch: Ref<string>
  partyMemberIds: Ref<string[]>
  visibleNpcs: ComputedRef<CampaignNpcCandidate[]>
  partyMembers: ComputedRef<CampaignNpcCandidate[]>
  isLoadingOptions: Ref<boolean>
  isStarting: Ref<boolean>
  openWizard: (templateId?: string) => void
  loadOptions: (templateId: string) => Promise<void>
  addNpcCandidate: (npc: CampaignNpcCandidate) => void
  addPartyMember: (npcId: string) => void
  removePartyMember: (npcId: string) => void
  reset: () => void
  startCampaign: (draft: StartCampaignDraft) => Promise<string | undefined>
} {
  const wizard = useCampaignWizardStore()
  const {
    isOpen,
    preferredTemplateId,
    templateId,
    languages,
    cultures,
    places,
    npcs,
    npcSearch,
    partyMemberIds,
    isLoadingOptions
  } = storeToRefs(wizard)
  const { templateOptions, loadCampaigns } = useCampaign()
  const game = useGameStore()

  const { error, request, execute } = useRequest()
  // Not `isLoading`: that drops to false between the calls of the sequence.
  const isStarting = ref(false)
  // `party:findByWorld` answers `undefined` when there is no party, which is not a failure.
  const partyLookup = useRequest()

  const visibleNpcs = computed(() => {
    const term = npcSearch.value.trim().toLocaleLowerCase()
    const available = npcs.value.filter((npc) => !partyMemberIds.value.includes(npc.id))
    if (term.length === 0) return available
    return available.filter(
      (npc) =>
        npc.name.toLocaleLowerCase().includes(term) ||
        npc.subtitle.toLocaleLowerCase().includes(term)
    )
  })

  const partyMembers = computed(() =>
    npcs.value.filter((npc) => partyMemberIds.value.includes(npc.id))
  )

  /** An NPC made while the wizard is open: the template has it now, so it can be picked. */
  function addNpcCandidate(npc: CampaignNpcCandidate): void {
    npcs.value = [...npcs.value, npc]
  }

  function addPartyMember(npcId: string): void {
    if (partyMemberIds.value.includes(npcId)) return
    if (partyMemberIds.value.length >= partyLimits.maxNpcs) {
      toast.error(`O grupo aceita no máximo ${partyLimits.maxNpcs} NPCs, além de você`)
      return
    }
    partyMemberIds.value = [...partyMemberIds.value, npcId]
  }

  function removePartyMember(npcId: string): void {
    partyMemberIds.value = partyMemberIds.value.filter((id) => id !== npcId)
  }

  function openWizard(preferredId?: string): void {
    preferredTemplateId.value = preferredId
    isOpen.value = true
  }

  function reset(): void {
    npcSearch.value = ''
    partyMemberIds.value = []
  }

  /** What the chosen template offers: its languages, cultures and NPCs, and who is already in its party. */
  async function loadOptions(sourceId: string): Promise<void> {
    templateId.value = sourceId
    languages.value = []
    cultures.value = []
    places.value = []
    npcs.value = []
    reset()

    isLoadingOptions.value = true
    try {
      const [languageList, cultureList, placeList, actorList, party] = await Promise.all([
        request('language:listByWorld', sourceId),
        request('culture:listByWorld', sourceId),
        request('pointOfInterest:listByWorld', sourceId),
        request('actor:listByWorld', sourceId),
        partyLookup.request('party:findByWorld', sourceId)
      ])
      // The user may have picked another template while this one was loading.
      if (templateId.value !== sourceId) return

      languages.value = (languageList ?? []).map(toNamedEntitySummary)
      cultures.value = (cultureList ?? []).map(toNamedEntitySummary)
      places.value = toPlaceSummaries(placeList ?? [])
      const npcActors = (actorList ?? []).filter((actor) => actor.isNpc)
      npcs.value = npcActors.map((actor) => toCampaignNpcCandidate(actor, cultures.value))
      partyMemberIds.value = party
        ? npcActors
            .filter((actor) => actor.partyId === party.id)
            .map((actor) => actor.id)
            .slice(0, partyLimits.maxNpcs)
        : []
    } finally {
      isLoadingOptions.value = false
    }
  }

  /**
   * Clones the template, then makes the clone a campaign: the player's character, the party and
   * the NPCs the player chose. Nothing is decided here beyond which engine calls to make. If any
   * step fails, the half-made campaign is deleted so it does not litter the list.
   * Returns the id of the campaign (a world), or `undefined` if it could not be made.
   */
  async function startCampaign(draft: StartCampaignDraft): Promise<string | undefined> {
    if (isStarting.value) return undefined
    isStarting.value = true
    try {
      return await cloneAndAssemble(draft)
    } finally {
      isStarting.value = false
    }
  }

  async function cloneAndAssemble(draft: StartCampaignDraft): Promise<string | undefined> {
    const template = templateOptions.value.find((option) => option.id === draft.templateId)
    const name = `${template?.name ?? 'Campanha'}: ${draft.character.name}`.slice(
      0,
      MAX_NAME_LENGTH
    )

    const campaign = await request('world:clone', { sourceWorldId: draft.templateId, name })
    if (!campaign) {
      reportInvalidInput()
      return undefined
    }

    const isReady = await assembleCampaign(campaign.id, draft)
    if (!isReady) {
      reportInvalidInput()
      await execute('world:delete', campaign.id)
      return undefined
    }

    game.pendingOpening = { worldId: campaign.id, message: openingMessage(draft) }
    await loadCampaigns()
    return campaign.id
  }

  /** `request` leaves `invalid_input` to forms, and the wizard has no field for what failed. */
  function reportInvalidInput(): void {
    const failure = error.value
    if (failure?.kind !== 'invalid_input') return

    const fields = failure.issues?.map((issue) => issue.path).filter(Boolean) ?? []
    toast.error(translateIpcError(failure), {
      description: fields.length > 0 ? `Revise: ${fields.join(', ')}` : undefined
    })
  }

  function openingMessage(draft: StartCampaignDraft): string {
    const prologue = draft.prologue.trim()
    return draft.prologueMode === 'custom' && prologue ? prologue : AI_PROLOGUE_REQUEST
  }

  async function assembleCampaign(worldId: string, draft: StartCampaignDraft): Promise<boolean> {
    const [clonedCultures, clonedLanguages, clonedPlaces, clonedActors, clonedItems] =
      await Promise.all([
        request('culture:listByWorld', worldId),
        request('language:listByWorld', worldId),
        request('pointOfInterest:listByWorld', worldId),
        request('actor:listByWorld', worldId),
        request('item:listByWorld', worldId)
      ])
    if (!clonedCultures || !clonedLanguages || !clonedPlaces || !clonedActors || !clonedItems) {
      return false
    }

    // The clone has new ids for everything, so what the player picked in the template is matched
    // to its copy.
    const cultureIds = mapClonedIds(cultures.value, clonedCultures)
    const languageIds = mapClonedIds(languages.value, clonedLanguages)
    // Both lists are in tree order, which is what pairs equal names under different parents.
    const placeIds = mapClonedIds(places.value, toPlaceSummaries(clonedPlaces))
    const pointOfInterestId = placeIds.get(draft.character.pointOfInterestId)
    if (!pointOfInterestId) return false
    const npcIds = mapClonedIds(
      npcs.value,
      clonedActors.filter((actor) => actor.isNpc)
    )

    const { character } = draft
    const bonds = await cloneBonds(draft, clonedActors, clonedItems)
    if (!bonds) return false
    const fields = {
      name: character.name,
      age: character.age,
      gender: character.gender,
      profession: emptyToNull(character.profession),
      appearance: emptyToNull(character.appearance),
      personality: emptyToNull(character.personality),
      background: emptyToNull(character.background),
      // A campaign starts at full health. Omitted, a new player gets the engine's default.
      ...(character.hpMax === undefined
        ? {}
        : { hpMax: character.hpMax, hpCurrent: character.hpMax }),
      // Omitted, a score is the engine's default (or what the template's player already has).
      ...(character.strength === undefined ? {} : { strength: character.strength }),
      ...(character.dexterity === undefined ? {} : { dexterity: character.dexterity }),
      ...(character.intelligence === undefined ? {} : { intelligence: character.intelligence }),
      goldPieces: character.goldPieces,
      silverPieces: character.silverPieces,
      bronzePieces: character.bronzePieces,
      pointOfInterestId,
      cultureId: (character.cultureId && cultureIds.get(character.cultureId)) || null,
      languageId: (character.languageId && languageIds.get(character.languageId)) || null
    }

    // A template may already carry a player, and a world has at most one.
    const existingPlayer = clonedActors.find((actor) => !actor.isNpc)
    const player = existingPlayer
      ? await request('actor:update', { id: existingPlayer.id, patch: fields })
      : await request('actor:create', {
          ...fields,
          worldId,
          isNpc: false,
          relatives: bonds.relatives
        })
    if (!player) return false

    // An existing player cannot be created with its family, so the bonds are recorded one by one.
    if (existingPlayer) {
      for (const { relativeId, relation } of bonds.relatives) {
        const recorded = await request('kinship:set', {
          actorId: player.id,
          relativeId,
          relation
        })
        if (!recorded) return false
      }
    }
    for (const itemId of bonds.itemIds) {
      if (!(await request('item:give', { itemId, actorId: player.id }))) return false
    }

    if (character.imageData) {
      const data = new Uint8Array(character.imageData)
      if (!(await request('actor:setImage', { id: player.id, data }))) return false
    }

    const wantedIds = new Set([
      player.id,
      ...draft.partyMemberIds.flatMap((id) => npcIds.get(id) ?? [])
    ])
    return fillParty(worldId, clonedActors, wantedIds)
  }

  /**
   * The character's relatives and items, as the campaign's copies of what the player picked in the
   * template. `undefined` when the template cannot be read.
   */
  async function cloneBonds(
    draft: StartCampaignDraft,
    clonedActors: Actor[],
    clonedItems: Item[]
  ): Promise<{ relatives: NewRelative[]; itemIds: string[] } | undefined> {
    const { relatives, inventoryItemIds } = draft.character
    if (relatives.length === 0 && inventoryItemIds.length === 0) {
      return { relatives: [], itemIds: [] }
    }

    const [templateActors, templateItems] = await Promise.all([
      request('actor:listByWorld', draft.templateId),
      request('item:listByWorld', draft.templateId)
    ])
    if (!templateActors || !templateItems) return undefined

    const actorIds = mapClonedIds(templateActors, clonedActors)
    const itemIds = mapClonedIds(templateItems, clonedItems)
    return {
      relatives: relatives.flatMap(({ relativeId, relation }) => {
        const copy = actorIds.get(relativeId)
        return copy ? [{ relativeId: copy, relation }] : []
      }),
      itemIds: inventoryItemIds.flatMap((id) => itemIds.get(id) ?? [])
    }
  }

  /** Makes the world's party have exactly the wanted members, creating the party if needed. */
  async function fillParty(
    worldId: string,
    actors: Actor[],
    wantedIds: Set<string>
  ): Promise<boolean> {
    const existing = await partyLookup.request('party:findByWorld', worldId)
    if (partyLookup.error.value) return false

    const party = existing ?? (await request('party:create', { worldId }))
    if (!party) return false

    const currentIds = new Set(
      actors.filter((actor) => actor.partyId === party.id).map((actor) => actor.id)
    )
    for (const actorId of currentIds) {
      if (wantedIds.has(actorId)) continue
      if (!(await request('party:removeMember', { partyId: party.id, actorId }))) return false
    }
    for (const actorId of wantedIds) {
      if (currentIds.has(actorId)) continue
      if (!(await request('party:addMember', { partyId: party.id, actorId }))) return false
    }
    return true
  }

  return {
    isOpen,
    preferredTemplateId,
    templateId,
    languages,
    cultures,
    places,
    npcSearch,
    partyMemberIds,
    visibleNpcs,
    partyMembers,
    isLoadingOptions,
    isStarting,
    openWizard,
    loadOptions,
    addNpcCandidate,
    addPartyMember,
    removePartyMember,
    reset,
    startCampaign
  }
}
