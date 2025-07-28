import { Material, MaterialInstance } from '../../core/v6/models/Material';
import { PackingItem } from './IPackingStrategy';

export interface IMaterialInstanceManager {
  initializeInstances(materials: Material[]): MaterialInstance[];
  addNewInstances(
    existingInstances: MaterialInstance[],
    originalMaterials: Material[],
    item: PackingItem
  ): MaterialInstance[];
  canAddNewInstance(material: Material, requiredLength: number): boolean;
}