export const IPC_ERROR_KINDS = [
  'invalid_input',
  'not_found',
  'conflict',
  'forbidden',
  'internal'
] as const

export type IpcErrorKind = (typeof IPC_ERROR_KINDS)[number]

export interface IpcIssue {
  /** Dotted path of the offending field, empty for the input itself. */
  path: string
  message: string
}

/**
 * What the renderer gets when a call fails. A plain object on purpose: Electron only carries the
 * `message` of a thrown error across IPC, and the context bridge drops custom error properties,
 * so the `kind` would be lost.
 */
export interface IpcError {
  kind: IpcErrorKind
  message: string
  /** Only for `invalid_input`: one entry per invalid field. */
  issues?: IpcIssue[]
}

/** Every IPC call resolves with this; it never rejects. */
export type IpcResponse<TData> = { ok: true; data: TData } | { ok: false; error: IpcError }
