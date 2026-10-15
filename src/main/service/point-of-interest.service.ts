import { ConflictError } from '@error'
import type { IPointOfInterestRepository } from '@repository/point-of-interest.repository'
import type {
  CreatePointOfInterest,
  PointOfInterest,
  UpdatePointOfInterest
} from '@schema/point-of-interest.schema'
import { BaseService, type ICrudService } from '@service/base.service'
import { ancestorsOf } from '@util/point-of-interest.util'

export interface IPointOfInterestService extends ICrudService<
  PointOfInterest,
  CreatePointOfInterest,
  UpdatePointOfInterest
> {
  /** Every place of the world, flat; the parent links give the tree. */
  listByWorld(worldId: string): Promise<PointOfInterest[]>
  /** The places directly inside `parentId`, or the ones at the top of the world when it is `null`. */
  listChildren(worldId: string, parentId: string | null): Promise<PointOfInterest[]>
  /** The place and everything it is inside of, from the top down to the place itself. */
  getPath(id: string): Promise<PointOfInterest[]>
}

/**
 * Places that can be inside one another. A parent of another world, or a place that still has
 * places inside, is a `ConflictError` (the database enforces both); so is a move that would put a
 * place inside itself or inside one of its own descendants.
 */
export class PointOfInterestService
  extends BaseService<PointOfInterest, CreatePointOfInterest, UpdatePointOfInterest>
  implements IPointOfInterestService
{
  constructor(private readonly pointOfInterestRepository: IPointOfInterestRepository) {
    super(pointOfInterestRepository, 'PointOfInterest')
  }

  listByWorld(worldId: string): Promise<PointOfInterest[]> {
    return this.pointOfInterestRepository.listByWorld(worldId)
  }

  listChildren(worldId: string, parentId: string | null): Promise<PointOfInterest[]> {
    return this.pointOfInterestRepository.listChildren(worldId, parentId)
  }

  async getPath(id: string): Promise<PointOfInterest[]> {
    const place = await this.get(id)
    const placesById = await this.indexByWorld(place.worldId)

    return ancestorsOf(place, placesById).reverse().concat(place)
  }

  override async update(id: string, patch: UpdatePointOfInterest): Promise<PointOfInterest> {
    // Only a new, non-null parent can close a loop; no parent in the patch leaves the tree as it is.
    if (patch.parentId) await this.assertNotInsideItself(id, patch.parentId)

    return super.update(id, patch)
  }

  /** A place cannot be moved inside itself or inside a place that is (at any depth) inside it. */
  private async assertNotInsideItself(id: string, newParentId: string): Promise<void> {
    const place = await this.get(id)
    const placesById = await this.indexByWorld(place.worldId)
    const newParent = placesById.get(newParentId)

    // A parent that does not exist, or is in another world, is left to the foreign key to report.
    if (!newParent) return

    const lineage = [newParent, ...ancestorsOf(newParent, placesById)]

    if (lineage.some((ancestor) => ancestor.id === id)) {
      throw new ConflictError('A place cannot be inside itself or inside one of its own places')
    }
  }

  private async indexByWorld(worldId: string): Promise<Map<string, PointOfInterest>> {
    const places = await this.pointOfInterestRepository.listByWorld(worldId)

    return new Map(places.map((place) => [place.id, place]))
  }
}
