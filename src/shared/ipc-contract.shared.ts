import type { CampaignMessage } from '@lib/narrator.lib'
import type {
  Actor,
  CloneWorld,
  CreateActor,
  CreateCulture,
  CreateLanguage,
  CreateParty,
  CreateWorld,
  Culture,
  Language,
  Party,
  UpdateActor,
  UpdateCulture,
  UpdateLanguage,
  UpdateWorld,
  UpdateAiSetting,
  World,
  AiSettingView,
  WorldFilter
} from '@schema'
import type { AiProviderCatalogEntry } from '@service/ai-setting.service'

/** Types only exist at compile time, so a channel carries them as a phantom. */
interface ChannelTypes<TInput, TOutput> {
  readonly input: TInput
  readonly output: TOutput
}

function channel<TInput, TOutput>(): ChannelTypes<TInput, TOutput> {
  return {} as ChannelTypes<TInput, TOutput>
}

/** An update names the entity and carries only the fields that change. */
interface Update<TPatch> {
  id: string
  patch: TPatch
}

interface PartyMembership {
  partyId: string
  actorId: string
}

/**
 * Single source of truth of the IPC between renderer and main: its keys are the only channels the
 * preload lets through, and the types say what each one takes and returns. Main must implement
 * every channel (checked by the compiler), and the renderer is typed by it. This file may only
 * import types, because the preload bundles it.
 */
export const ipcContract = {
  'world:list': channel<WorldFilter | undefined, World[]>(),
  'world:get': channel<string, World>(),
  'world:create': channel<CreateWorld, World>(),
  'world:update': channel<Update<UpdateWorld>, World>(),
  'world:delete': channel<string, void>(),
  /** Copies a whole world (typically a template) to start a new campaign. */
  'world:clone': channel<CloneWorld, World>(),

  'culture:listByWorld': channel<string, Culture[]>(),
  'culture:get': channel<string, Culture>(),
  'culture:create': channel<CreateCulture, Culture>(),
  'culture:update': channel<Update<UpdateCulture>, Culture>(),
  'culture:delete': channel<string, void>(),

  'language:listByWorld': channel<string, Language[]>(),
  'language:get': channel<string, Language>(),
  'language:create': channel<CreateLanguage, Language>(),
  'language:update': channel<Update<UpdateLanguage>, Language>(),
  'language:delete': channel<string, void>(),

  'actor:listByWorld': channel<string, Actor[]>(),
  'actor:get': channel<string, Actor>(),
  'actor:create': channel<CreateActor, Actor>(),
  'actor:update': channel<Update<UpdateActor>, Actor>(),
  'actor:delete': channel<string, void>(),

  'party:findByWorld': channel<string, Party | undefined>(),
  'party:create': channel<CreateParty, Party>(),
  'party:delete': channel<string, void>(),
  'party:listMembers': channel<string, Actor[]>(),
  'party:addMember': channel<PartyMembership, Actor>(),
  'party:removeMember': channel<PartyMembership, Actor>(),

  /** Providers and models to pick from, most capable first, and whether the environment has each key. */
  'aiSetting:catalog': channel<undefined, AiProviderCatalogEntry[]>(),
  /** The global AI setting (the default until one is saved); the API key is reported, never sent. */
  'aiSetting:get': channel<undefined, AiSettingView>(),
  /** Saves provider, model, temperature and, if sent, the API key; all kept across restarts. */
  'aiSetting:update': channel<UpdateAiSetting, AiSettingView>(),
  /** Forgets the saved API key. */
  'aiSetting:clearApiKey': channel<undefined, AiSettingView>(),

  /** Plays one turn of the campaign; slow, because the narrator is an LLM. */
  'gameMaster:takeTurn': channel<{ worldId: string; message: string }, string>(),
  'gameMaster:listHistory': channel<string, CampaignMessage[]>()
} as const

export type IpcContract = typeof ipcContract

export type IpcChannel = keyof IpcContract

/** The only channels the preload forwards. */
export const IPC_CHANNELS = Object.keys(ipcContract) as IpcChannel[]

export type IpcInput<TChannel extends IpcChannel> = IpcContract[TChannel]['input']

export type IpcOutput<TChannel extends IpcChannel> = IpcContract[TChannel]['output']

/** The input is an optional argument when the channel accepts `undefined`. */
export type IpcInputArgs<TChannel extends IpcChannel> =
  undefined extends IpcInput<TChannel> ? [input?: IpcInput<TChannel>] : [input: IpcInput<TChannel>]
