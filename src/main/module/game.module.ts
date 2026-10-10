import { database } from '@module/database.module'
import { ActorRepository } from '@repository/actor.repository'
import { CultureRepository } from '@repository/culture.repository'
import { LanguageRepository } from '@repository/language.repository'
import { PartyRepository } from '@repository/party.repository'
import { WorldRepository } from '@repository/world.repository'
import { ActorService, type IActorService } from '@service/actor.service'
import { CultureService, type ICultureService } from '@service/culture.service'
import { LanguageService, type ILanguageService } from '@service/language.service'
import { PartyService, type IPartyService } from '@service/party.service'
import { WorldService, type IWorldService } from '@service/world.service'

const actorRepository = new ActorRepository(database)

export const worldService: IWorldService = new WorldService(new WorldRepository(database))
export const cultureService: ICultureService = new CultureService(new CultureRepository(database))
export const languageService: ILanguageService = new LanguageService(
  new LanguageRepository(database)
)
export const actorService: IActorService = new ActorService(actorRepository)
export const partyService: IPartyService = new PartyService(
  new PartyRepository(database),
  actorRepository
)
