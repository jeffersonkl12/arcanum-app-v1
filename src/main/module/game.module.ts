import { AiProbe } from '@lib/ai-probe.lib'
import { CachedEmbedder } from '@lib/cached-embedder.lib'
import { Embedder } from '@lib/embedder.lib'
import { NarratorGateway } from '@lib/narrator.lib'
import { SecretCipher } from '@lib/secret-cipher.lib'
import { database } from '@module/database.module'
import { diceRoller } from '@module/dice.module'
import { imageStorage } from '@module/image.module'
import { loadMastra } from '@module/mastra.module'
import { ActorRepository } from '@repository/actor.repository'
import { AiSettingRepository } from '@repository/ai-setting.repository'
import { CultureRepository } from '@repository/culture.repository'
import { ItemRepository } from '@repository/item.repository'
import { MemoryRepository } from '@repository/memory.repository'
import { MessageRatingRepository } from '@repository/message-rating.repository'
import { LanguageRepository } from '@repository/language.repository'
import { DocumentRepository } from '@repository/document.repository'
import { CampaignRepository } from '@repository/campaign.repository'
import { PartyRepository } from '@repository/party.repository'
import { PointOfInterestRepository } from '@repository/point-of-interest.repository'
import { KinshipRepository } from '@repository/kinship.repository'
import { RelationshipRepository } from '@repository/relationship.repository'
import { WorldCloneRepository } from '@repository/world-clone.repository'
import { WorldRepository } from '@repository/world.repository'
import { ActorService, type IActorService } from '@service/actor.service'
import { AiConnectionService, type IAiConnectionService } from '@service/ai-connection.service'
import { AiSettingService, type IAiSettingService } from '@service/ai-setting.service'
import { CoinRegistryService } from '@service/coin-registry.service'
import { CoinService } from '@service/coin.service'
import { ContextWindowService } from '@service/context-window.service'
import { CultureService, type ICultureService } from '@service/culture.service'
import { DiceCheckService, type IDiceCheckService } from '@service/dice-check.service'
import { GameMasterService, type IGameMasterService } from '@service/game-master.service'
import { InventoryService, type IInventoryService } from '@service/inventory.service'
import { TradeRegistryService } from '@service/trade-registry.service'
import { TradeService } from '@service/trade.service'
import { ItemRegistryService } from '@service/item-registry.service'
import { LanguageService, type ILanguageService } from '@service/language.service'
import { LiveContextService } from '@service/live-context.service'
import { DocumentContextService } from '@service/document-context.service'
import { DocumentRegistryService } from '@service/document-registry.service'
import { DocumentService, type IDocumentService } from '@service/document.service'
import { MemoryContextService } from '@service/memory-context.service'
import { MemoryRegistryService } from '@service/memory-registry.service'
import { MemoryService, type IMemoryService } from '@service/memory.service'
import { MessageRatingService } from '@service/message-rating.service'
import { CampaignRegistryService } from '@service/campaign-registry.service'
import { CampaignService, type ICampaignService } from '@service/campaign.service'
import { NpcSceneService } from '@service/npc-scene.service'
import { PartyService, type IPartyService } from '@service/party.service'
import { PointOfInterestRegistryService } from '@service/point-of-interest-registry.service'
import {
  PointOfInterestService,
  type IPointOfInterestService
} from '@service/point-of-interest.service'
import { KinshipService, type IKinshipService } from '@service/kinship.service'
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
export const kinshipService: IKinshipService = new KinshipService(
  new KinshipRepository(database),
  actorRepository,
  actorService
)
export const relationshipService: IRelationshipService = new RelationshipService(
  new RelationshipRepository(database),
  actorRepository
)
export const pointOfInterestService: IPointOfInterestService = new PointOfInterestService(
  new PointOfInterestRepository(database)
)
const pointOfInterestRegistry = new PointOfInterestRegistryService(
  pointOfInterestService,
  actorService,
  partyService
)
export const aiSettingService: IAiSettingService = new AiSettingService(
  new AiSettingRepository(database),
  new SecretCipher()
)
export const aiConnectionService: IAiConnectionService = new AiConnectionService(
  aiSettingService,
  new AiProbe()
)
// Embeddings come from the provider the player picked: the key saved for them in the app (or the chat
// key while the narrator is of the same provider), else that provider's environment variable. Without
// any, memory is simply unavailable.
// Wrapped so the player's message, searched by the memories and by the documents on every turn, is
// embedded once.
const embedder = new CachedEmbedder(
  new Embedder(async () => {
    const { embeddingProvider, embeddingApiKey } = await aiSettingService.resolve()

    return { provider: embeddingProvider, apiKey: embeddingApiKey }
  })
)
export const documentService: IDocumentService = new DocumentService(
  new DocumentRepository(database),
  embedder
)
export const memoryService: IMemoryService = new MemoryService(
  new MemoryRepository(database),
  embedder,
  actorService
)
const coinService = new CoinService(actorRepository)
const itemRegistry = new ItemRegistryService(inventoryService, actorService)
const npcSceneService = new NpcSceneService(
  actorService,
  partyService,
  relationshipService,
  kinshipService,
  cultureService,
  languageService,
  itemRegistry
)
const contextWindowService = new ContextWindowService()
const memoryContextService = new MemoryContextService(memoryService, contextWindowService)
const documentContextService = new DocumentContextService(documentService, contextWindowService)
const documentRegistry = new DocumentRegistryService(documentService, documentContextService)
// The sources of dynamic context for the narrator's prompt; list a new source here to bring it in.
const liveContextService = new LiveContextService(contextWindowService, [
  memoryContextService,
  documentContextService,
  npcSceneService
])

export const gameMasterService: IGameMasterService = new GameMasterService(
  new NarratorGateway(loadMastra),
  worldService,
  aiSettingService,
  actorService,
  partyService,
  diceCheckService,
  itemRegistry,
  new CoinRegistryService(coinService, actorService),
  new TradeRegistryService(
    new TradeService(actorService, inventoryService, coinService),
    actorService,
    inventoryService
  ),
  pointOfInterestRegistry,
  new MemoryRegistryService(memoryService, memoryContextService),
  documentRegistry,
  memoryService,
  liveContextService,
  relationshipService,
  new RelationshipRegistryService(relationshipService, actorService),
  campaignService,
  new CampaignRegistryService(campaignService),
  new MessageRatingService(new MessageRatingRepository(database)),
  pointOfInterestService,
  cultureService,
  languageService,
  npcSceneService,
  kinshipService
)
