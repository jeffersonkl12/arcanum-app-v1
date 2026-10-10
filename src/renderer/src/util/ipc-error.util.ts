import type { IpcError } from '@shared'

/** The messages the engine writes in English (api.md §3.3), as the user should read them. */
const KNOWN_MESSAGES: Record<string, string> = {
  'The world already has a player': 'Este mundo já tem um jogador.',
  'The world already has a party': 'Este mundo já tem um grupo.',
  'The culture does not exist in the actor world, or is still in use':
    'A cultura não existe neste mundo ou ainda está em uso.',
  'The language does not exist in the actor world, or is still in use':
    'O idioma não existe neste mundo ou ainda está em uso.',
  'The party does not exist in the actor world, or is still in use':
    'O grupo não existe neste mundo ou ainda tem membros.',
  'The current health cannot be higher than the maximum':
    'A vida atual não pode ser maior que a vida máxima.',
  'The maximum health must be at least 1': 'A vida máxima deve ser de pelo menos 1.',
  'The current health must be between 0 and the maximum':
    'A vida atual deve ficar entre 0 e a vida máxima.',
  'The operation violates a data constraint': 'A operação viola uma regra dos dados.',
  'The image is too big (the limit is 5 MB)': 'A imagem é grande demais (o limite é 5 MB).',
  'The file is not a PNG, JPEG, WebP or GIF image':
    'O arquivo não é uma imagem PNG, JPEG, WebP ou GIF.',
  'The narrator is already answering in this world': 'O Mestre já está respondendo neste mundo.',
  'Secure storage is not available on this system (no keyring found), so the API key cannot be saved. Set it in the environment instead.':
    'O armazenamento seguro não está disponível neste sistema (nenhum chaveiro encontrado), então a chave de API não pode ser salva. Defina-a no ambiente.',
  'The saved API key can no longer be decrypted (the system keychain changed). Save it again.':
    'A chave de API salva não pode mais ser lida (o chaveiro do sistema mudou). Salve-a novamente.'
}

const ENTITY_LABELS: Record<string, string> = {
  World: 'Mundo',
  Culture: 'Cultura',
  Language: 'Idioma',
  Actor: 'Personagem',
  Party: 'Grupo',
  'Party member': 'Membro do grupo'
}

const NOT_FOUND = /^(.+?) "[^"]*" was not found$/

/**
 * What to tell the user about a failed call. The engine's messages are in English and meant for
 * the log, so each kind has a Portuguese text, and the known conflicts keep their own.
 */
export function translateIpcError(error: IpcError): string {
  const known = KNOWN_MESSAGES[error.message]
  if (known) return known

  switch (error.kind) {
    case 'not_found': {
      const entity = NOT_FOUND.exec(error.message)?.[1]
      return `Não foi possível encontrar: ${(entity && ENTITY_LABELS[entity]) ?? 'o item pedido'}.`
    }
    case 'conflict':
      return 'A operação conflita com os dados existentes.'
    case 'invalid_input':
      return 'Os dados enviados são inválidos.'
    case 'forbidden':
      return 'Operação não permitida.'
    case 'internal':
      return 'Algo deu errado. Tente novamente.'
  }
}
