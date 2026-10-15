import type { MemoryKind, RelationshipLevel } from '@constant'

export const relationshipLevelLabels: Record<RelationshipLevel, string> = {
  nemesis: 'Inimigo mortal',
  enemy: 'Inimigo',
  unfriendly: 'Desconfiado',
  neutral: 'Neutro',
  friendly: 'Amigável',
  ally: 'Aliado',
  devoted: 'Devotado'
}

export const memoryKindLabels: Record<MemoryKind, string> = {
  betrayal: 'Traição',
  revelation: 'Revelação',
  secret: 'Segredo',
  promise: 'Promessa',
  conflict: 'Conflito',
  favor: 'Favor',
  bond: 'Vínculo',
  shared_moment: 'Momento compartilhado',
  loss: 'Perda',
  other: 'Outro'
}
