import { Material, MaterialInstance } from '../../core/v6/models/Material';
import { IMaterialInstanceManager } from '../interfaces/IMaterialInstanceManager';
import { PackingItem } from '../interfaces/IPackingStrategy';

export class MaterialInstanceManager implements IMaterialInstanceManager {
  private readonly MAX_INSTANCES_PER_BATCH = 5;
  private readonly MAX_BATCH_COUNT = 10;

  initializeInstances(materials: Material[]): MaterialInstance[] {
    const instances: MaterialInstance[] = [];
    
    // 如果沒有提供材料，返回空數組
    if (materials.length === 0) {
      return [];
    }
    
    // 先按長度降序排序材料
    const sortedMaterials = [...materials].sort((a, b) => b.length - a.length);
    
    for (const material of sortedMaterials) {
      if (material.quantity === 0) {
        // 無限供應：只創建1個初始實例
        instances.push(this.createInstance(material, 0, true));
      } else {
        // 有限供應：創建指定數量的實例
        for (let i = 0; i < material.quantity; i++) {
          instances.push(this.createInstance(material, i, false));
        }
      }
    }
    
    return instances;
  }

  addNewInstances(
    existingInstances: MaterialInstance[],
    originalMaterials: Material[],
    item: PackingItem
  ): MaterialInstance[] {
    const newInstances: MaterialInstance[] = [];
    
    // 找出無限供應的材料類型
    const unlimitedMaterials = originalMaterials.filter(m => m.quantity === 0);
    
    if (unlimitedMaterials.length > 0) {
      // 優先選擇能容納零件的無限材料
      const suitableUnlimited = unlimitedMaterials.filter(m => m.length >= item.requiredLength);
      if (suitableUnlimited.length === 0) {
        return newInstances;
      }
      
      let addedCount = 0;
      
      for (const material of suitableUnlimited) {
        if (addedCount >= this.MAX_BATCH_COUNT) break;
        
        // 計算現有實例數
        const existingCount = existingInstances.filter(inst => 
          this.isSameMaterial(inst.material, material)
        ).length;
        
        // 創建多個新實例
        const instancesToCreate = Math.min(this.MAX_INSTANCES_PER_BATCH, this.MAX_BATCH_COUNT - addedCount);
        
        for (let i = 0; i < instancesToCreate; i++) {
          newInstances.push(this.createInstance(material, existingCount + i, true));
          addedCount++;
        }
      }
    }
    
    return newInstances;
  }

  canAddNewInstance(material: Material, requiredLength: number): boolean {
    return material.quantity === 0 && material.length >= requiredLength;
  }

  private createInstance(material: Material, instanceId: number, isUnlimited: boolean): MaterialInstance {
    return {
      material: {
        ...material,
        id: `${material.id}_${instanceId}`,
        originalId: material.id,
        isUnlimited
      },
      instanceId,
      usedLength: 0
    };
  }

  private isSameMaterial(materialA: Material, materialB: Material): boolean {
    const idA = materialA.originalId || materialA.id;
    const idB = materialB.originalId || materialB.id;
    return idA === idB || materialA.id.startsWith(materialB.id + '_');
  }
}