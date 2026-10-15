import { Embedder } from '@lib/embedder.lib'
import { LanceMemoryVectorStore } from '@lib/memory-vector.lib'
import { NarratorGateway } from '@lib/narrator.lib'
import { resolveMemoryVectorFolder } from '@lib/paths.lib'
import { SecretCipher } from '@lib/secret-cipher.lib'
import { database } from '@module/database.module'
import { diceRoller } from '@module/dice.module'
import { imageStorage } from '@module/image.module'
import { loadMastra } from '@module/mastra.module'
import { ActorRepository } from '@repository/actor.repository'
import { AiSettingRepository } from '@repository/ai-setting.repository'
import { CultureRepository } from '@repository/culture.repository'
import { ItemRepository } from '@repository/item.repository'
import { LanguageRepository } from '@repository/language.repository'
import { CampaignRepository } from '@repository/campaign.repository'
import { PartyRepository } from '@repository/party.repository'
import { RelationshipRepository } from '@repository/relationship.repository'
import { WorldCloneRepository } from '@repository/world-clone.repository'
import { WorldRepository } from '@repository/world.repository'
import { ActorService, type IActorService } from '@service/actor.service'
import { AiSettingService, type IAiSettingService } from '@service/ai-setting.service'
import { CoinRegistryService } from '@service/coin-registry.service'
import { CoinService } from '@service/coin.service'
import { ContextWindowService } from '@service/context-window.service'
import { CultureService, type ICultureService } from '@service/culture.service'
import { DiceCheckService, type IDiceCheckService } from '@service/dice-check.service'
import { GameMasterService, type IGameMasterService } from '@service/game-master.service'
import { InventoryService, type IInventoryService } from '@service/inventory.service'
import { ItemRegistryService } from '@service/item-registry.service'
import { LanguageService, type ILanguageService } from '@service/language.service'
import { LiveContextService } from '@service/live-context.service'
import { MemoryContextService } from '@service/memory-context.service'
import { MemoryRegistryService } from '@service/memory-registry.service'
import { MemoryService, type IMemoryService } from '@service/memory.service'
import { CampaignRegistryService } from '@service/campaign-registry.service'
import { CampaignService, type ICampaignService } from '@service/campaign.service'
import { PartyService, type IPartyService } from '@service/party.service'
import { RelationshipRegistryService } from '@service/relationship-registry.service'
import { RelationshipService, type IRelationshipService } from '@service/relationship.service'
import { WorldCloneService, type IWorldCloneService } from '@service/world-clone.service'
import { WorldService, type IWorldService } from '@service/world.service'

const actorRepository = new ActorRepository(database)
const itemRepository = new ItemRepository(database)
const worldRepository = new WorldRepository(database)

export const worldService: IWorldService = new WorldService(worldRepository)
export const worldCloneService: IWorldCloneService = new WorldCloneService(
  new WorldCloneRepository(database),
  imageStorage
)
export const cultureService: ICultureService = new CultureService(new CultureRepository(database))
export const languageService: ILanguageService = new LanguageService(
  new LanguageRepository(database)
)
export const actorService: IActorService = new ActorService(actorRepository, itemRepository)
export const diceCheckService: IDiceCheckService = new DiceCheckService(diceRoller, actorService)
export const inventoryService: IInventoryService = new InventoryService(
  itemRepository,
  actorRepository,
  worldRepository
)
export const campaignService: ICampaignService = new CampaignService(
  new CampaignRepository(database),
  worldRepository
)
export const partyService: IPartyService = new PartyService(
  new PartyRepository(database),
  actorRepository
)
export const relationshipService: IRelationshipService = new RelationshipService(
  new RelationshipRepository(database),
  actorRepository
)
export const aiSettingService: IAiSettingService = new AiSettingService(
  new AiSettingRepository(database),
  new SecretCipher()
)
// Embeddings come from the provider the player picked: the key saved for them in the app (or the chat
// key while the narrator is of the same provider), else that provider's environment variable. Without
// any, memory is simply unavailable.
const embedder = new Embedder(async () => {
  const { embeddingProvider, embeddingApiKey } = await aiSettingService.resolve()

  return { provider: embeddingProvider, apiKey: embeddingApiKey }
})
export const memoryService: IMemoryService = new MemoryService(
  new LanceMemoryVectorStore(resolveMemoryVectorFolder()),
  embedder,
  actorService
)
const contextWindowService = new ContextWindowService()
const memoryContextService = new MemoryContextService(memoryService, contextWindowService)
// The sources of dynamic context for the narrator's prompt; list a new source here to bring it in.
const liveContextService = new LiveContextService(contextWindowService, [memoryContextService])

export const gameMasterService: IGameMasterService = new GameMasterService(
  new NarratorGateway(loadMastra),
  worldService,
  aiSettingService,
  actorService,
  partyService,
  diceCheckService,
  new ItemRegistryService(inventoryService, actorService),
  new CoinRegistryService(new CoinService(actorRepository), actorService),
  new MemoryRegistryService(memoryService, memoryContextService),
  memoryService,
  liveContextService,
  relationshipService,
  new RelationshipRegistryService(relationshipService, actorService),
  campaignService,
  new CampaignRegistryService(campaignService)
)
