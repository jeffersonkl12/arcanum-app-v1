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
  SetImage,
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
import type { CheckResult } from '@service/dice-check.service'
import type { IpcError } from '@shared/ipc-response.shared'
import type { RollMode } from '@shared/roll-mode.shared'
import type { NarrationDeltaEvent, NarrationDoneEvent } from '@shared/narrator-ui.shared'

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
  /** Sets or replaces the world's image with the bytes of the file; returns the new `imagePath`. */
  'world:setImage': channel<SetImage, string>(),
  'world:removeImage': channel<string, void>(),

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
  /** Sets or replaces the actor's image with the bytes of the file; returns the new `imagePath`. */
  'actor:setImage': channel<SetImage, string>(),
  'actor:removeImage': channel<string, void>(),

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

  /**
   * Resolves a check whose dice the player rolled on screen: the faces are only the entropy, the
   * engine validates them (`conflict` if they are not those of a roll in this mode) and decides
   * the outcome by its rules.
   */
  'dice:resolveCheck': channel<{ mode: RollMode; dice: number[] }, CheckResult>(),

  /** Plays one turn of the campaign; slow, because the narrator is an LLM. */
  'gameMaster:takeTurn': channel<{ worldId: string; message: string }, string>(),
  /**
   * Starts a turn and returns as soon as it is accepted; the narration arrives as `TurnEvent`s on
   * `gameMaster:turnEvent`. The renderer picks the `turnId` (a uuid) so it can listen before the
   * first event, which may come before this call resolves. Fails with `conflict` if the world
   * already has a turn running.
   */
  'gameMaster:streamTurn': channel<{ turnId: string; worldId: string; message: string }, void>(),
  'gameMaster:listHistory': channel<string, CampaignMessage[]>()
} as const

/**
 * What main tells the renderer for a streamed turn. `delta` carries only the new text of one
 * segment of the reply (prose or a UI block), so the renderer appends it to the segment at that
 * position; `done` carries the whole reply and its final segments, which replace what it
 * accumulated (and match what `gameMaster:listHistory` returns later). Every turn ends with
 * `done` or `error`.
 */
export type TurnEvent = { turnId: string } & (
  NarrationDeltaEvent | NarrationDoneEvent | { type: 'error'; error: IpcError }
)

/** Types only exist at compile time, so an event carries its payload as a phantom. */
interface EventTypes<TPayload> {
  readonly payload: TPayload
}

function event<TPayload>(): EventTypes<TPayload> {
  return {} as EventTypes<TPayload>
}

/**
 * Messages that flow the other way, main to renderer, with no reply. The preload only lets the
 * renderer subscribe to these channels. Like `ipcContract`, this file may only import types.
 */
export const ipcEventContract = {
  'gameMaster:turnEvent': event<TurnEvent>()
} as const

export type IpcEventContract = typeof ipcEventContract

export type IpcEventChannel = keyof IpcEventContract

/** The only event channels the preload lets the renderer listen to. */
export const IPC_EVENT_CHANNELS = Object.keys(ipcEventContract) as IpcEventChannel[]

export type IpcEventPayload<TChannel extends IpcEventChannel> =
  IpcEventContract[TChannel]['payload']

export type IpcContract = typeof ipcContract

export type IpcChannel = keyof IpcContract

/** The only channels the preload forwards. */
export const IPC_CHANNELS = Object.keys(ipcContract) as IpcChannel[]

export type IpcInput<TChannel extends IpcChannel> = IpcContract[TChannel]['input']

export type IpcOutput<TChannel extends IpcChannel> = IpcContract[TChannel]['output']

/** The input is an optional argument when the channel accepts `undefined`. */
export type IpcInputArgs<TChannel extends IpcChannel> =
  undefined extends IpcInput<TChannel> ? [input?: IpcInput<TChannel>] : [input: IpcInput<TChannel>]
