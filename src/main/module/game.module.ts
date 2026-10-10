import { NarratorGateway } from '@lib/narrator.lib'
import { SecretCipher } from '@lib/secret-cipher.lib'
import { database } from '@module/database.module'
import { diceCheckService } from '@module/dice.module'
import { loadMastra } from '@module/mastra.module'
import { ActorRepository } from '@repository/actor.repository'
import { AiSettingRepository } from '@repository/ai-setting.repository'
import { CultureRepository } from '@repository/culture.repository'
import { LanguageRepository } from '@repository/language.repository'
import { PartyRepository } from '@repository/party.repository'
import { WorldCloneRepository } from '@repository/world-clone.repository'
import { WorldRepository } from '@repository/world.repository'
import { ActorService, type IActorService } from '@service/actor.service'
import { AiSettingService, type IAiSettingService } from '@service/ai-setting.service'
import { CultureService, type ICultureService } from '@service/culture.service'
import { GameMasterService, type IGameMasterService } from '@service/game-master.service'
import { LanguageService, type ILanguageService } from '@service/language.service'
import { PartyService, type IPartyService } from '@service/party.service'
import { WorldCloneService, type IWorldCloneService } from '@service/world-clone.service'
import { WorldService, type IWorldService } from '@service/world.service'

const actorRepository = new ActorRepository(database)

export const worldService: IWorldService = new WorldService(new WorldRepository(database))
export const worldCloneService: IWorldCloneService = new WorldCloneService(
  new WorldCloneRepository(database)
)
export const cultureService: ICultureService = new CultureService(new CultureRepository(database))
export const languageService: ILanguageService = new LanguageService(
  new LanguageRepository(database)
)
export const actorService: IActorService = new ActorService(actorRepository)
export const partyService: IPartyService = new PartyService(
  new PartyRepository(database),
  actorRepository
)
export const aiSettingService: IAiSettingService = new AiSettingService(
  new AiSettingRepository(database),
  new SecretCipher()
)
export const gameMasterService: IGameMasterService = new GameMasterService(
  new NarratorGateway(loadMastra),
  worldService,
  aiSettingService,
  actorService,
  partyService,
  diceCheckService
)
