import { Material, MaterialInstance } from '../core/v6/models/Material';
import { PackingItem } from './interfaces/IPackingStrategy';

/**
 * 優化的材料管理器 V2
 * 改進版：更積極的材料實例創建策略
 */
export class OptimizedMaterialManagerV2 {
  private readonly MIN_UTILIZATION_THRESHOLD = 0.6; // 降低利用率閾值以允許更多實例
  private readonly BATCH_SIZE_MULTIPLIER = 1.5; // 增加批次大小乘數

  /**
   * 創建材料實例以容納所有項目
   */
  createMaterialInstances(
    materials: Material[],
    items: PackingItem[]
  ): MaterialInstance[] {
    if (items.length === 0) return [];

    // 按長度排序材料（從長到短）
    const sortedMaterials = [...materials].sort((a, b) => 
      (b.length || 0) - (a.length || 0)
    );

    const instances: MaterialInstance[] = [];
    
    // 對於中大批量零件，使用更積極的策略
    if (items.length > 500) { // 降低閾值從1000到500
      console.log(`[MaterialManager] 檢測到 ${items.length} 個零件，使用大批量策略`);
      return this.createInstancesForLargeBatch(sortedMaterials, items);
    }

    // 標準策略
    const remainingItems = [...items];

    // 分配項目到不同材料類型
    for (const material of sortedMaterials) {
      if (remainingItems.length === 0) break;

      // 找出最適合此材料的項目
      const bestFitItems = this.findBestFitItems(remainingItems, material, sortedMaterials);
      
      if (bestFitItems.length === 0) continue;

      // 估算需要的實例數
      const estimatedCount = this.estimateRequiredInstancesForItems(material, bestFitItems);
      // 根據系統規格：母材沒有數量上限，系統會自動創建所需數量的母材實例
      const actualCount = estimatedCount;

      // 創建實例
      const currentMaterialInstances = instances.filter(inst => inst.material.id === material.id).length;
      for (let i = 0; i < actualCount; i++) {
        instances.push({
          material,
          instanceId: currentMaterialInstances + i,
          usedLength: 0
        });
      }

      // 更新剩餘項目
      if (actualCount > 0) {
        const processedCount = Math.min(
          bestFitItems.length,
          actualCount * this.estimateItemsPerInstance(material, bestFitItems)
        );
        
        for (let i = 0; i < processedCount && remainingItems.length > 0; i++) {
          const index = remainingItems.findIndex(item => 
            bestFitItems.some(bfi => bfi === item)
          );
          if (index !== -1) {
            remainingItems.splice(index, 1);
          }
        }
      }
    }

    // 處理剩餘項目
    if (remainingItems.length > 0) {
      const unlimitedMaterials = sortedMaterials.filter(m => !m.quantity || m.quantity === 0);
      if (unlimitedMaterials.length > 0) {
        const bestMaterial = unlimitedMaterials[0];
        const additionalCount = this.estimateRequiredInstancesForItems(bestMaterial, remainingItems);
        const currentCount = instances.filter(inst => inst.material.id === bestMaterial.id).length;
        
        for (let i = 0; i < additionalCount; i++) {
          instances.push({
            material: bestMaterial,
            instanceId: currentCount + i,
            usedLength: 0
          });
        }
      }
    }

    return instances;
  }

  /**
   * 為大批量零件創建材料實例（改進版）
   */
  private createInstancesForLargeBatch(
    materials: Material[],
    items: PackingItem[]
  ): MaterialInstance[] {
    const instances: MaterialInstance[] = [];
    
    // 找出最大的無限供應材料
    const unlimitedMaterials = materials.filter(m => !m.quantity || m.quantity === 0);
    const bestMaterial = unlimitedMaterials.length > 0 
      ? unlimitedMaterials[0] 
      : materials[0];

    if (!bestMaterial) return instances;

    // 計算更合理的初始實例數量
    // 對於大批量零件，需要創建足夠的實例以避免大量失敗
    const totalRequiredLength = items.reduce((sum, item) => sum + item.requiredLength, 0);
    const avgUtilization = 0.85; // 假設 85% 的平均利用率
    const effectiveMaterialLength = (bestMaterial.length || 0) * avgUtilization;
    const theoreticalMinInstances = Math.ceil(totalRequiredLength / effectiveMaterialLength);
    
    console.log(`[MaterialManager] 計算材料需求：`);
    console.log(`  - 總需求長度：${totalRequiredLength}mm`);
    console.log(`  - 最佳材料長度：${bestMaterial.length}mm`);
    console.log(`  - 理論最小實例數：${theoreticalMinInstances}`);
    
    // 創建足夠的初始實例，確保能容納大部分零件
    // 基於100個零件需要73個實例的經驗，使用0.75的比例
    const experiencedRatio = 0.75;
    const initialInstanceCount = Math.max(
      theoreticalMinInstances * 2.5,           // 理論最小值的 250%
      Math.ceil(items.length * experiencedRatio) // 零件數的 75%
    );
    
    console.log(`  - 計劃創建實例數：${initialInstanceCount}`);
    
    for (let i = 0; i < initialInstanceCount; i++) {
      instances.push({
        material: bestMaterial,
        instanceId: i,
        usedLength: 0
      });
    }

    // 為其他材料創建實例（根據材料長度分配比例）
    const otherMaterials = materials.filter(m => m.id !== bestMaterial.id);
    
    // 計算每種材料應該創建的實例數
    const totalMaterialLength = materials.reduce((sum, m) => sum + (m.length || 0), 0);
    
    for (const material of otherMaterials) {
      // 根據系統規格：母材沒有數量上限，系統會自動創建所需數量的母材實例
      // 根據材料長度比例創建實例
      const materialRatio = (material.length || 0) / totalMaterialLength;
      const supplementCount = Math.max(
        100, // 至少100個
        Math.ceil(initialInstanceCount * materialRatio * 0.5) // 根據長度比例分配
      );
      
      console.log(`[MaterialManager] 為材料 ${material.id}（${material.length}mm）創建 ${supplementCount} 個實例`);
      
      for (let i = 0; i < supplementCount; i++) {
        instances.push({
          material,
          instanceId: i,
          usedLength: 0
        });
      }
    }

    return instances;
  }

  /**
   * 創建額外的材料實例（改進版）
   */
  createAdditionalInstances(
    materials: Material[],
    unplacedItems: PackingItem[],
    existingCount: number
  ): MaterialInstance[] {
    if (unplacedItems.length === 0) return [];

    const instances: MaterialInstance[] = [];
    
    // 找出最適合的材料（優先選擇較大的材料）
    const bestMaterial = this.findBestMaterialForItems(materials, unplacedItems);
    if (!bestMaterial) return instances;

    // 計算需要的額外實例數（使用更積極的公式）
    const itemsPerInstance = this.estimateItemsPerInstance(bestMaterial, unplacedItems);
    const additionalCount = Math.ceil(unplacedItems.length / Math.max(1, itemsPerInstance));

    // 檢查材料數量限制
    const currentMaterialCount = existingCount; // 這裡應該按材料類型計算
    const maxAllowed = bestMaterial.quantity !== undefined && bestMaterial.quantity > 0
      ? bestMaterial.quantity - currentMaterialCount
      : additionalCount;

    const actualCount = Math.min(additionalCount, Math.max(0, maxAllowed));

    // 創建額外實例
    for (let i = 0; i < actualCount; i++) {
      instances.push({
        material: bestMaterial,
        instanceId: existingCount + i,
        usedLength: 0
      });
    }

    return instances;
  }

  /**
   * 估算需要的材料實例數量
   */
  estimateRequiredInstances(material: Material, items: PackingItem[]): number {
    return this.estimateRequiredInstancesForItems(material, items);
  }

  /**
   * 為特定項目估算需要的材料實例數量（改進版）
   */
  private estimateRequiredInstancesForItems(material: Material, items: PackingItem[]): number {
    const materialLength = material.length || 0;
    if (materialLength === 0) return 0;

    // 過濾出可以放入此材料的項目
    const fittingItems = items.filter(item => 
      item.actualLength <= materialLength
    );

    if (fittingItems.length === 0) return 0;

    // 使用更準確的打包模擬
    const sortedItems = [...fittingItems].sort((a, b) => b.actualLength - a.actualLength);
    const bins: number[] = [];

    for (const item of sortedItems) {
      let placed = false;
      
      // 嘗試放入現有的箱子（考慮 5% 的損耗空間）
      for (let i = 0; i < bins.length; i++) {
        if (bins[i] + item.requiredLength <= materialLength * 0.95) {
          bins[i] += item.requiredLength;
          placed = true;
          break;
        }
      }

      // 如果無法放入現有箱子，創建新箱子
      if (!placed) {
        bins.push(item.requiredLength);
      }
    }

    return bins.length;
  }

  /**
   * 找出最適合項目的材料（改進版）
   */
  private findBestMaterialForItems(
    materials: Material[],
    items: PackingItem[]
  ): Material | null {
    let bestMaterial: Material | null = null;
    let bestScore = -1;

    // 優先選擇無限供應的材料
    const unlimitedMaterials = materials.filter(m => !m.quantity || m.quantity === 0);
    const candidateMaterials = unlimitedMaterials.length > 0 ? unlimitedMaterials : materials;

    for (const material of candidateMaterials) {
      const score = this.calculateMaterialScore(material, items);
      
      // 對於較大的材料給予額外加分
      const sizeBonus = (material.length || 0) / 10000;
      const adjustedScore = score + sizeBonus;
      
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMaterial = material;
      }
    }

    return bestMaterial;
  }

  /**
   * 計算材料對項目的適合度分數
   */
  private calculateMaterialScore(
    material: Material,
    items: PackingItem[]
  ): number {
    const materialLength = material.length || 0;
    if (materialLength === 0) return -1;

    // 計算可以放入的項目數
    const fittingItems = items.filter(item => 
      item.actualLength <= materialLength
    );

    if (fittingItems.length === 0) return -1;

    // 計算平均利用率
    const avgItemLength = fittingItems.reduce((sum, item) => 
      sum + item.requiredLength, 0
    ) / fittingItems.length;

    const itemsPerInstance = Math.floor(materialLength / avgItemLength);
    const utilization = (itemsPerInstance * avgItemLength) / materialLength;

    // 分數 = 可放入項目比例 * 利用率 * 材料可用性因子
    const availabilityFactor = (!material.quantity || material.quantity === 0) ? 1.5 : 1.0;
    return (fittingItems.length / items.length) * utilization * availabilityFactor;
  }

  /**
   * 估算每個實例可以容納的項目數
   */
  private estimateItemsPerInstance(
    material: Material,
    items: PackingItem[]
  ): number {
    const materialLength = material.length || 0;
    if (materialLength === 0) return 1;

    const avgItemLength = items.reduce((sum, item) => 
      sum + item.requiredLength, 0
    ) / items.length;

    return Math.max(1, Math.floor(materialLength / avgItemLength));
  }

  /**
   * 找出最適合特定材料的項目
   */
  private findBestFitItems(
    items: PackingItem[],
    material: Material,
    allMaterials: Material[]
  ): PackingItem[] {
    const materialLength = material.length || 0;
    
    // 過濾出可以放入此材料的項目
    const fittingItems = items.filter(item => 
      item.actualLength <= materialLength
    );
    
    // 如果沒有其他材料，返回所有適合的項目
    if (allMaterials.length === 1) {
      return fittingItems;
    }
    
    // 找出最適合此材料的項目
    return fittingItems.filter(item => {
      // 檢查是否有更小的材料也能容納此項目
      const hasSmallerFit = allMaterials.some(other => 
        other.id !== material.id &&
        (other.length || 0) < materialLength &&
        item.actualLength <= (other.length || 0) &&
        (!other.quantity || other.quantity > 0)
      );
      
      // 如果有更小的材料能容納，優先使用小材料
      // 但如果項目長度超過材料長度的 60%，則使用當前材料
      return !hasSmallerFit || (item.actualLength / materialLength > 0.6);
    });
  }
}