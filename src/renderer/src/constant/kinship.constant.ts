import type { KinshipInput, KinshipRelation } from '@constant'

/** The word for each relation by the relative's gender. The key order is the order a family is listed in. */
const kinshipRelationLabels: Record<KinshipRelation, { male: string; female: string }> = {
  parent: { male: 'Pai', female: 'Mãe' },
  spouse: { male: 'Marido', female: 'Esposa' },
  child: { male: 'Filho', female: 'Filha' },
  sibling: { male: 'Irmão', female: 'Irmã' },
  half_sibling: { male: 'Meio-irmão', female: 'Meia-irmã' },
  step_parent: { male: 'Padrasto', female: 'Madrasta' },
  step_child: { male: 'Enteado', female: 'Enteada' },
  grandparent: { male: 'Avô', female: 'Avó' },
  grandchild: { male: 'Neto', female: 'Neta' },
  uncle_aunt: { male: 'Tio', female: 'Tia' },
  nibling: { male: 'Sobrinho', female: 'Sobrinha' },
  cousin: { male: 'Primo', female: 'Prima' },
  parent_in_law: { male: 'Sogro', female: 'Sogra' },
  child_in_law: { male: 'Genro', female: 'Nora' },
  sibling_in_law: { male: 'Cunhado', female: 'Cunhada' }
}

/** What the player can record; the engine derives every other relation from these. */
export const kinshipInputOptions: { value: KinshipInput; label: string }[] = [
  { value: 'parent', label: 'Pai ou mãe' },
  { value: 'child', label: 'Filho ou filha' },
  { value: 'spouse', label: 'Cônjuge' }
]

const relationOrder = Object.keys(kinshipRelationLabels)

export function kinshipLabel(relation: KinshipRelation, gender: string): string {
  return kinshipRelationLabels[relation][gender === 'female' ? 'female' : 'male']
}

/** Closest relations first. */
export function compareKinship(a: KinshipRelation, b: KinshipRelation): number {
  return relationOrder.indexOf(a) - relationOrder.indexOf(b)
}
