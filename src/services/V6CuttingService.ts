import { V6System } from '../core/v6/system/V6System';
import { PartWithQuantity } from '../core/v6/models/Part';
import { Material as V6Material, PlacementResult } from '../core/v6/models/Material';
import { Material, Part, CutPlan } from '../types';

/**
 * V6切割優化服務
 * 將V6系統適配到現有的應用介面
 */
export class V6CuttingService {
  private v6System: V6System;
  private currentConstraints: {
    cuttingLoss: number;
    frontEndLoss: number;
    backEndLoss: number;
  };

  constructor() {
    this.currentConstraints = {
      cuttingLoss: 3,
      frontEndLoss: 10,
      backEndLoss: 10
    };
    
    this.v6System = new V6System({
      angleTolerance: 5,
      prioritizeMixedChains: true,
      constraints: this.currentConstraints
    });
  }

  /**
   * 更新切割損耗配置
   */
  updateConstraints(cuttingLoss: number, frontEndLoss: number): void {
    this.currentConstraints = {
      cuttingLoss,
      frontEndLoss,
      backEndLoss: 10 // 固定後端損耗為10
    };
    
    // 重新建立系統以應用新配置
    this.v6System = new V6System({
      angleTolerance: 5,
      prioritizeMixedChains: true,
      constraints: this.currentConstraints
    });
  }

  /**
   * 執行切割優化
   */
  optimizeCutting(materials: Material[], parts: Part[]): CutPlan[] {
    // 轉換輸入格式
    const v6Parts: PartWithQuantity[] = parts.map(part => ({
      id: part.id,
      length: part.length,
      quantity: part.quantity || 1,
      angles: part.angles || {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      },
      thickness: part.thickness || 20
    }));

    const v6Materials: V6Material[] = materials.map(mat => ({
      id: mat.id,
      length: mat.length,
      quantity: mat.quantity !== undefined ? mat.quantity : 1
    }));

    // 執行優化
    const result = this.v6System.optimize(v6Parts, v6Materials);

    // 轉換結果格式
    return this.convertToCutPlans(result, materials);
  }

  /**
   * 轉換V6結果到應用格式
   */
  private convertToCutPlans(result: PlacementResult, originalMaterials: Material[]): CutPlan[] {
    const cutPlans: CutPlan[] = [];
    const materialMap = new Map(originalMaterials.map(m => [m.id, m]));

    // 按材料分組零件
    const partsByMaterial = new Map<string, typeof result.placedParts>();
    
    for (const placedPart of result.placedParts) {
      const baseMatId = placedPart.materialId.split('_')[0];
      if (!partsByMaterial.has(baseMatId)) {
        partsByMaterial.set(baseMatId, []);
      }
      partsByMaterial.get(baseMatId)!.push(placedPart);
    }

    // 為每個使用的材料創建切割計劃
    for (const [matId, placedParts] of partsByMaterial) {
      const material = materialMap.get(matId);
      if (!material) continue;

      // 按材料實例分組
      const instanceGroups = new Map<string, typeof placedParts>();
      for (const part of placedParts) {
        const instanceKey = `${part.materialId}`;
        if (!instanceGroups.has(instanceKey)) {
          instanceGroups.set(instanceKey, []);
        }
        instanceGroups.get(instanceKey)!.push(part);
      }

      // 為每個實例創建計劃
      let instanceIndex = 0;
      for (const [instanceKey, instanceParts] of instanceGroups) {
        const sortedParts = instanceParts.sort((a, b) => a.position - b.position);
        
        const cuts = sortedParts.map(p => ({
          partId: p.partId,
          position: p.position,
          length: p.length,
          isSharedCut: !!p.sharedCuttingInfo || (p as any).isSharedCut,
          sharedWith: (p as any).sharedWith,
          angleSavings: (p as any).angleSavings || p.sharedCuttingInfo?.savings
        }));
        
        const cutPlan: CutPlan = {
          materialId: matId,
          materialLength: material.length,
          parts: cuts.map(c => ({
            partId: c.partId,
            length: c.length,
            position: c.position,
            isSharedCut: c.isSharedCut,
            sharedWith: c.sharedWith,
            angleSavings: c.angleSavings
          })),
          cuts: cuts,
          wasteLength: this.calculateWaste(sortedParts, material.length),
          efficiency: this.calculateEfficiency(sortedParts, material.length),
          utilization: this.calculateUtilization(sortedParts, material.length),
          waste: this.calculateWaste(sortedParts, material.length),
          instanceId: instanceIndex++
        };
        
        cutPlans.push(cutPlan);
      }
    }


    return cutPlans;
  }

  /**
   * 計算材料利用率
   */
  private calculateUtilization(parts: any[], materialLength: number): number {
    if (parts.length === 0) return 0;
    
    // 計算實際使用的長度（包括所有損耗）
    const actualUsedLength = this.calculateActualUsedLength(parts);
    return Math.min(actualUsedLength / materialLength, 1);
  }

  /**
   * 計算效率（百分比）
   * 效率 = 實際使用長度 / 材料長度 * 100
   * 如果有浪費，效率必定小於100%
   */
  private calculateEfficiency(parts: any[], materialLength: number): number {
    const utilization = this.calculateUtilization(parts, materialLength);
    return utilization * 100;
  }

  /**
   * 計算浪費長度
   */
  private calculateWaste(parts: any[], materialLength: number): number {
    if (parts.length === 0) return materialLength;
    
    const actualUsedLength = this.calculateActualUsedLength(parts);
    return Math.max(0, materialLength - actualUsedLength);
  }

  /**
   * 計算實際使用的長度
   * 基於零件的實際位置，而不是理論計算
   */
  private calculateActualUsedLength(parts: any[]): number {
    if (parts.length === 0) return 0;
    
    // 找到最後一個零件
    const lastPart = parts[parts.length - 1];
    
    // 實際使用長度 = 最後一個零件的位置 + 零件長度 + 後端損耗
    const actualUsedLength = lastPart.position + lastPart.length + this.currentConstraints.backEndLoss;
    
    return actualUsedLength;
  }

  /**
   * 獲取優化報告
   */
  getOptimizationReport(materials: Material[], parts: Part[]): string {
    const v6Parts: PartWithQuantity[] = parts.map(part => ({
      id: part.id,
      length: part.length,
      quantity: part.quantity || 1,
      angles: part.angles || {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      },
      thickness: part.thickness || 20
    }));

    const v6Materials: V6Material[] = materials.map(mat => ({
      id: mat.id,
      length: mat.length,
      quantity: mat.quantity !== undefined ? mat.quantity : 1
    }));

    const result = this.v6System.optimize(v6Parts, v6Materials);
    return this.v6System.generateOptimizationReport(result);
  }
}