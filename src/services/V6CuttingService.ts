import { V6System, ProgressCallback } from '../core/v6/system/V6System';
import { PartWithQuantity } from '../core/v6/models/Part';
import { Material as V6Material, PlacementResult } from '../core/v6/models/Material';
import { Material, Part, CutPlan } from '../types';
import { OptimizationReportService } from './OptimizationReportService';

/**
 * V6切割優化服務
 * 將V6系統適配到現有的應用介面
 */
export class V6CuttingService {
  private v6System: V6System;
  private reportService: OptimizationReportService;
  private currentConstraints: {
    cuttingLoss: number;
    frontEndLoss: number;
  };

  constructor() {
    this.currentConstraints = {
      cuttingLoss: 3,
      frontEndLoss: 10
    };
    
    this.v6System = new V6System({
      angleTolerance: 5,
      prioritizeMixedChains: true,
      constraints: this.currentConstraints
    });
    
    this.reportService = new OptimizationReportService(5);
  }

  /**
   * 更新切割損耗配置
   */
  updateConstraints(cuttingLoss: number, frontEndLoss: number): void {
    this.currentConstraints = {
      cuttingLoss,
      frontEndLoss
    };
    
    // 重新建立系統以應用新配置
    this.v6System = new V6System({
      angleTolerance: 5,
      prioritizeMixedChains: true,
      constraints: this.currentConstraints
    });
  }

  /**
   * 將 Web Worker 結果轉換為應用格式
   */
  convertWorkerResult(workerResult: any, materials: Material[], parts: Part[], cuttingLoss: number, frontCuttingLoss: number): any {
    // 更新切割損耗設置
    this.updateConstraints(cuttingLoss, frontCuttingLoss);
    
    // 轉換 cutPlans
    const cutPlans = this.convertToCutPlans(workerResult, materials);
    
    // 計算統計資料
    const totalMaterialsUsed = cutPlans.length;
    const totalWaste = cutPlans.reduce((sum, plan) => sum + (plan.waste || plan.wasteLength || 0), 0);
    const totalUsedLength = cutPlans.reduce((sum, plan) => {
      const materialLength = plan.materialLength;
      const wasteLength = plan.waste || plan.wasteLength || 0;
      return sum + (materialLength - wasteLength);
    }, 0);
    const totalMaterialLength = cutPlans.reduce((sum, plan) => sum + plan.materialLength, 0);
    const overallEfficiency = totalMaterialLength > 0 ? (totalUsedLength / totalMaterialLength) * 100 : 0;
    
    // 處理未排版零件 - 保留詳細原因資訊
    let unplacedParts: Array<{partId: string; instanceId: number; reason: string}> = [];
    if (workerResult.unplacedParts && workerResult.unplacedParts.length > 0) {
      // 直接使用 Worker 返回的詳細未排版資訊
      unplacedParts = workerResult.unplacedParts.map((up: any) => ({
        partId: up.partId || up.id,
        instanceId: up.instanceId || 0,
        reason: up.reason || '未知原因'
      }));
      
      console.log(`[V6CuttingService] 未排版零件詳細資訊:`, unplacedParts.slice(0, 5));
    } else if (workerResult.placedParts) {
      // 基於已排版零件來推算未排版零件
      const placedPartInstanceKeys = new Set();
      workerResult.placedParts.forEach((placedPart: any) => {
        placedPartInstanceKeys.add(`${placedPart.partId}_${placedPart.partInstanceId || 0}`);
      });
      
      // 為每個零件的每個實例檢查是否已排版
      parts.forEach(part => {
        for (let i = 0; i < part.quantity; i++) {
          const instanceKey = `${part.id}_${i}`;
          if (!placedPartInstanceKeys.has(instanceKey)) {
            unplacedParts.push({
              partId: part.id,
              instanceId: i,
              reason: '未能找到合適的排版位置'
            });
          }
        }
      });
    }
    
    // 統計共刀資訊
    let totalSharedCuts = 0;
    let totalSharedSavings = workerResult.totalSavings || 0;
    cutPlans.forEach(plan => {
      (plan.parts || plan.cuts || []).forEach(part => {
        if (part.isSharedCut) {
          totalSharedCuts++;
          if (part.angleSavings && totalSharedSavings === 0) {
            totalSharedSavings += part.angleSavings;
          }
        }
      });
    });
    
    return {
      cutPlans,
      totalMaterialsUsed,
      totalWaste,
      overallEfficiency,
      executionTime: workerResult.report?.processingTime || 0,
      unplacedParts,
      materialUtilization: overallEfficiency / 100,
      report: workerResult.report ? this.formatWorkerReport(workerResult) : '',
      sharedCuttingInfo: {
        totalSharedCuts,
        totalSavings: totalSharedSavings
      }
    };
  }

  /**
   * 格式化 Worker 報告
   */
  private formatWorkerReport(workerResult: any): string {
    return this.reportService.formatForWorker(workerResult);
  }

  /**
   * 執行切割優化 
   */
  optimize(materials: Material[], parts: Part[], cuttingLoss: number, frontCuttingLoss: number, onProgress?: ProgressCallback): any {
    // 更新切割損耗設置
    this.updateConstraints(cuttingLoss, frontCuttingLoss);
    
    // 首先獲取 V6 系統的完整結果
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

    const v6Materials: Material[] = materials.map(mat => ({
      id: mat.id,
      length: mat.length,
      quantity: 0 // 設為0表示無限供應
    }));

    const v6Result = this.v6System.optimize(v6Parts, v6Materials, onProgress);
    
    // 執行優化並獲取詳細結果
    const cutPlans = this.convertToCutPlans(v6Result, materials);
    const report = this.v6System.generateOptimizationReport(v6Result);
    
    // 計算統計資料
    const totalMaterialsUsed = cutPlans.length;
    const totalWaste = cutPlans.reduce((sum, plan) => sum + (plan.waste || plan.wasteLength || 0), 0);
    const totalUsedLength = cutPlans.reduce((sum, plan) => {
      const materialLength = plan.materialLength;
      const wasteLength = plan.waste || plan.wasteLength || 0;
      return sum + (materialLength - wasteLength);
    }, 0);
    const totalMaterialLength = cutPlans.reduce((sum, plan) => sum + plan.materialLength, 0);
    const overallEfficiency = totalMaterialLength > 0 ? (totalUsedLength / totalMaterialLength) * 100 : 0;
    
    // 從 V6 系統結果收集已排版的零件 ID
    const placedPartIds = new Set();
    if (v6Result.placedParts) {
      v6Result.placedParts.forEach(placedPart => {
        placedPartIds.add(placedPart.partId);
      });
    }
    
    // 如果 V6 系統返回了 unplacedParts，使用它們的詳細資訊
    let unplacedParts: Array<{partId: string; instanceId: number; reason: string}> = [];
    if (v6Result.unplacedParts && v6Result.unplacedParts.length > 0) {
      // 直接使用 V6 的詳細未排版資訊
      unplacedParts = v6Result.unplacedParts.map(up => ({
        partId: up.partId,
        instanceId: up.instanceId,
        reason: up.reason || '未知原因'
      }));
    } else {
      // 備用方案：基於已排版零件來推算未排版零件
      const unplacedPartsList = parts.filter(part => !placedPartIds.has(part.id));
      unplacedParts = unplacedPartsList.map(part => ({
        partId: part.id,
        instanceId: 0,
        reason: '未能找到合適的排版位置'
      }));
    }
    
    // 統計共刀資訊
    let totalSharedCuts = 0;
    let totalSharedSavings = 0;
    cutPlans.forEach(plan => {
      (plan.parts || plan.cuts || []).forEach(part => {
        if (part.isSharedCut) {
          totalSharedCuts++;
          totalSharedSavings += part.angleSavings || 0;
        }
      });
    });
    
    // 如果沒有從切割方案中找到共刀資訊，使用 V6 結果中的資訊
    if (totalSharedSavings === 0 && v6Result.totalSavings) {
      totalSharedSavings = v6Result.totalSavings;
    }
    
    return {
      cutPlans,
      totalMaterialsUsed,
      totalWaste,
      overallEfficiency,
      executionTime: 0, // 將由外部計算
      unplacedParts,
      materialUtilization: overallEfficiency / 100,
      report,
      sharedCuttingInfo: {
        totalSharedCuts,
        totalSavings: totalSharedSavings
      }
    };
  }

  /**
   * 執行切割優化（內部方法）
   */
  optimizeCutting(materials: Material[], parts: Part[], onProgress?: ProgressCallback): CutPlan[] {
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
      quantity: 0 // 設為0表示無限供應，符合系統規格：母材沒有數量上限
    }));

    // 執行優化
    const result = this.v6System.optimize(v6Parts, v6Materials, onProgress);

    // 轉換結果格式
    return this.convertToCutPlans(result, materials);
  }

  /**
   * 轉換V6結果到應用格式
   */
  private convertToCutPlans(result: PlacementResult, originalMaterials: Material[]): CutPlan[] {
    const cutPlans: CutPlan[] = [];
    
    if (!result.placedParts || result.placedParts.length === 0) {
      console.log('No placed parts in result, returning empty cut plans');
      return cutPlans;
    }

    const materialMap = new Map(originalMaterials.map(m => [m.id, m]));

    // 按材料實例分組零件
    const partsByMaterialInstance = new Map<string, typeof result.placedParts>();
    
    for (const placedPart of result.placedParts) {
      const instanceKey = `${placedPart.materialId}_${placedPart.materialInstanceId}`;
      if (!partsByMaterialInstance.has(instanceKey)) {
        partsByMaterialInstance.set(instanceKey, []);
      }
      partsByMaterialInstance.get(instanceKey)!.push(placedPart);
    }

    // 為每個材料實例創建切割計劃
    for (const [instanceKey, instanceParts] of partsByMaterialInstance) {
      const materialId = instanceParts[0]?.materialId?.split('_')[0] || instanceParts[0]?.materialId;
      const material = materialMap.get(materialId);
      
      if (!material) {
        console.warn(`Material not found for ID: ${materialId}`);
        continue;
      }

      const sortedParts = instanceParts.sort((a, b) => a.position - b.position);
      
      const cuts = sortedParts.map(p => ({
        partId: p.partId,
        position: p.position,
        length: p.length,
        isSharedCut: !!p.sharedCuttingInfo,
        sharedWith: p.sharedCuttingInfo?.pairedWithPartId,
        angleSavings: p.sharedCuttingInfo?.savings
      }));
      
      const cutPlan: CutPlan = {
        materialId: materialId,
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
        wasteLength: this.calculateWasteFromUsedMaterials(instanceKey, result.usedMaterials, material.length),
        efficiency: this.calculateEfficiencyFromUsedMaterials(instanceKey, result.usedMaterials),
        utilization: this.calculateUtilizationFromUsedMaterials(instanceKey, result.usedMaterials),
        waste: this.calculateWasteFromUsedMaterials(instanceKey, result.usedMaterials, material.length),
        instanceId: instanceParts[0]?.materialInstanceId || 0
      };
      
      cutPlans.push(cutPlan);
    }

    console.log(`Generated ${cutPlans.length} cut plans from ${result.placedParts.length} placed parts`);
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
    
    // 實際使用長度 = 最後一個零件的位置 + 零件長度
    const actualUsedLength = lastPart.position + lastPart.length;
    
    return actualUsedLength;
  }

  /**
   * 基於 usedMaterials 計算浪費長度
   */
  private calculateWasteFromUsedMaterials(instanceKey: string, usedMaterials: any[], materialLength: number): number {
    const materialInfo = usedMaterials.find(m => 
      `${m.material.id}_${m.instanceId}` === instanceKey
    );
    
    if (!materialInfo) {
      return materialLength; // 如果找不到使用信息，假設全部浪費
    }
    
    // 利用率 * 材料長度 = 使用長度
    const usedLength = materialInfo.utilization * materialLength;
    return Math.max(0, materialLength - usedLength);
  }

  /**
   * 基於 usedMaterials 計算利用率
   */
  private calculateUtilizationFromUsedMaterials(instanceKey: string, usedMaterials: any[]): number {
    const materialInfo = usedMaterials.find(m => 
      `${m.material.id}_${m.instanceId}` === instanceKey
    );
    
    return materialInfo?.utilization || 0;
  }

  /**
   * 基於 usedMaterials 計算效率
   */
  private calculateEfficiencyFromUsedMaterials(instanceKey: string, usedMaterials: any[]): number {
    const utilization = this.calculateUtilizationFromUsedMaterials(instanceKey, usedMaterials);
    return utilization * 100;
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
      quantity: 0 // 設為0表示無限供應，符合系統規格：母材沒有數量上限
    }));

    const result = this.v6System.optimize(v6Parts, v6Materials);
    return this.v6System.generateOptimizationReport(result);
  }
}