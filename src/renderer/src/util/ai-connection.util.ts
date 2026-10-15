import type { AiConnectionFailure } from '@schema'

const FAILURE_MESSAGES: Record<AiConnectionFailure, string> = {
  missing_key: 'Nenhuma chave informada, salva ou no ambiente para este provedor.',
  invalid_key: 'A chave foi recusada pelo provedor. Confira se está completa e ativa.',
  quota: 'Limite de uso ou saldo esgotado nesta chave. Verifique o plano do provedor.',
  model_not_found: 'O provedor não reconhece este modelo ou a chave não tem acesso a ele.',
  timeout: 'O provedor demorou demais para responder. Tente novamente.',
  network: 'Não foi possível alcançar o provedor. Verifique a sua conexão.',
  unknown: 'O teste falhou por um motivo inesperado. Os detalhes estão no log do app.'
}

export function translateConnectionFailure(reason: AiConnectionFailure): string {
  return FAILURE_MESSAGES[reason]
}
