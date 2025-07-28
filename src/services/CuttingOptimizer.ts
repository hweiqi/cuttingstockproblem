/**
 * 排版優化演算法
 * 實現切割庫存問題的核心演算法，最小化母材使用量
 */

import { 
  Material, 
  Part, 
  CuttingSettings, 
  CuttingResult, 
  MaterialUsagePlan, 
  PlacedPart,
  SharedCutChain,
  DEFAULT_CUTTING_SETTINGS 
} from '../types/core';
import { MaterialManager } from './MaterialManager';
import { PartManager } from './PartManager';
import { SharedCutChainBuilder } from './SharedCutChainBuilder';

interface PartInstance {
  partId: string;
  instanceIndex: number;
  length: number;
  angles: Part['angles'];
  thickness: number;
}

interface MaterialInstance {
  materialId: string;
  instanceIndex: number;
  length: number;
  usedLength: number;
  placedParts: PlacedPart[];
}

export class CuttingOptimizer {
  private settings: CuttingSettings;
  private chainBuilder: SharedCutChainBuilder;

  constructor(settings: Partial<CuttingSettings> = {}) {
    this.settings = { ...DEFAULT_CUTTING_SETTINGS, ...settings };
    this.chainBuilder = new SharedCutChainBuilder(
      this.settings.angleTolerance,
      this.settings.maxChainLength
    );
  }

  /**
   * 執行排版優化
   * @param materials 母材列表
   * @param parts 零件列表
   * @returns 排版結果
   */
  optimize(materials: Material[], parts: Part[]): CuttingResult {
    const startTime = Date.now();

    // 如果沒有零件，返回空結果
    if (parts.length === 0) {
      return this.createEmptyResult(Date.now() - startTime);
    }

    // 展開零件實例
    const partInstances = this.expandPartInstances(parts);

    // 建立共刀鏈
    const chainResult = this.chainBuilder.buildChains(parts);
    
    // 創建材料實例管理器
    const availableMaterials = this.createExtendedMaterialList(materials, partInstances);
    
    // 執行排版
    const materialUsagePlans = this.performPlacement(
      availableMaterials, 
      partInstances, 
      chainResult.chains
    );

    // 計算結果
    const processingTime = Date.now() - startTime;
    return this.calculateResult(materialUsagePlans, chainResult.chains, partInstances.length, processingTime);
  }

  /**
   * 展開零件實例
   * @param parts 零件列表
   * @returns 零件實例列表
   */
  private expandPartInstances(parts: Part[]): PartInstance[] {
    const instances: PartInstance[] = [];
    
    for (const part of parts) {
      for (let i = 0; i < part.quantity; i++) {
        instances.push({
          partId: part.id,
          instanceIndex: i,
          length: part.length,
          angles: { ...part.angles },
          thickness: part.thickness || 10
        });
      }
    }

    return instances;
  }

  /**
   * 創建擴展的材料列表（支援無限供應）
   * @param materials 原始材料列表
   * @param partInstances 零件實例列表
   * @returns 擴展的材料列表
   */
  private createExtendedMaterialList(materials: Material[], partInstances: PartInstance[]): Material[] {
    const extendedMaterials = [...materials];
    
    // 如果沒有提供材料，或者現有材料不足，自動創建適合的材料
    if (materials.length === 0) {
      // 創建一個足夠長的母材來容納最長的零件
      const maxPartLength = Math.max(...partInstances.map(p => p.length));
      const requiredLength = maxPartLength + this.settings.frontCuttingLoss + this.settings.cuttingLoss;
      extendedMaterials.push({
        id: 'auto-generated-1',
        length: Math.max(requiredLength, 6000) // 至少6000mm
      });
    }

    // 為每種材料創建多個實例以支援無限供應
    const expandedMaterials: Material[] = [];
    const maxInstancesPerMaterial = Math.ceil(partInstances.length / 2) + 5; // 確保有足夠的實例

    for (const material of extendedMaterials) {
      for (let i = 0; i < maxInstancesPerMaterial; i++) {
        expandedMaterials.push({
          id: `${material.id}-instance-${i}`,
          length: material.length
        });
      }
    }

    return expandedMaterials;
  }

  /**
   * 執行排版
   * @param materials 材料列表
   * @param partInstances 零件實例列表
   * @param sharedCutChains 共刀鏈列表
   * @returns 材料使用計劃列表
   */
  private performPlacement(
    materials: Material[], 
    partInstances: PartInstance[], 
    sharedCutChains: SharedCutChain[]
  ): MaterialUsagePlan[] {
    const materialInstances: MaterialInstance[] = materials.map((material, index) => ({
      materialId: material.id,
      instanceIndex: index,
      length: material.length,
      usedLength: this.settings.frontCuttingLoss, // 從前端損耗開始
      placedParts: []
    }));

    const usedMaterials: MaterialUsagePlan[] = [];
    const remainingParts = [...partInstances];
    const chainMap = new Map<string, SharedCutChain>();
    
    // 建立零件到鏈的映射
    sharedCutChains.forEach(chain => {
      chain.partIds.forEach(partId => {
        chainMap.set(partId, chain);
      });
    });

    // 先處理共刀鏈
    for (const chain of sharedCutChains) {
      const chainParts = chain.partIds.map(partId => 
        remainingParts.find(p => p.partId === partId)
      ).filter(Boolean) as PartInstance[];

      if (chainParts.length > 0) {
        const materialInstance = this.findBestFitMaterial(materialInstances, chain.totalLength, chain.totalSavings);
        if (materialInstance) {
          this.placeChain(materialInstance, chainParts, chain);
          
          // 從剩餘零件中移除已放置的零件
          chainParts.forEach(part => {
            const index = remainingParts.findIndex(p => 
              p.partId === part.partId && p.instanceIndex === part.instanceIndex
            );
            if (index >= 0) {
              remainingParts.splice(index, 1);
            }
          });
        }
      }
    }

    // 處理剩餘的單獨零件
    remainingParts.sort((a, b) => b.length - a.length); // 按長度降序排列

    for (const part of remainingParts) {
      const materialInstance = this.findBestFitMaterial(materialInstances, part.length);
      if (materialInstance) {
        this.placeSinglePart(materialInstance, part);
      }
    }

    // 轉換為使用計劃
    for (const materialInstance of materialInstances) {
      if (materialInstance.placedParts.length > 0) {
        const plan = this.createMaterialUsagePlan(materialInstance);
        usedMaterials.push(plan);
      }
    }

    return usedMaterials;
  }

  /**
   * 找到最適合的材料
   * @param materialInstances 材料實例列表
   * @param requiredLength 需要的長度
   * @param sharedCutSavings 共刀節省量（可選）
   * @returns 最適合的材料實例
   */
  private findBestFitMaterial(
    materialInstances: MaterialInstance[], 
    requiredLength: number, 
    sharedCutSavings: number = 0
  ): MaterialInstance | null {
    const actualRequiredLength = requiredLength + this.settings.cuttingLoss - sharedCutSavings;
    
    // 找到所有能容納的材料
    const suitableMaterials = materialInstances.filter(material => {
      const availableLength = material.length - material.usedLength;
      return availableLength >= actualRequiredLength;
    });

    if (suitableMaterials.length === 0) {
      // 如果沒有合適的材料，創建一個新的
      const newLength = Math.max(actualRequiredLength + this.settings.frontCuttingLoss, 6000);
      const newMaterial: MaterialInstance = {
        materialId: `auto-created-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        instanceIndex: materialInstances.length,
        length: newLength,
        usedLength: this.settings.frontCuttingLoss,
        placedParts: []
      };
      materialInstances.push(newMaterial);
      return newMaterial;
    }

    // Best Fit: 選擇剩餘空間最小但足夠的材料
    return suitableMaterials.reduce((best, current) => {
      const bestRemaining = best.length - best.usedLength;
      const currentRemaining = current.length - current.usedLength;
      
      return currentRemaining < bestRemaining ? current : best;
    });
  }

  /**
   * 放置共刀鏈
   * @param materialInstance 材料實例
   * @param chainParts 鏈中的零件
   * @param chain 共刀鏈
   */
  private placeChain(materialInstance: MaterialInstance, chainParts: PartInstance[], chain: SharedCutChain): void {
    let currentPosition = materialInstance.usedLength;

    for (let i = 0; i < chainParts.length; i++) {
      const part = chainParts[i];
      const placedPart: PlacedPart = {
        partId: part.partId,
        partInstanceIndex: part.instanceIndex,
        materialId: materialInstance.materialId,
        materialInstanceIndex: materialInstance.instanceIndex,
        position: currentPosition,
        length: part.length,
        isInSharedCutChain: true,
        sharedCutInfo: {
          chainId: chain.id,
          positionInChain: i,
          previousConnection: i > 0 ? chain.connections[i - 1] : undefined,
          nextConnection: i < chain.connections.length ? chain.connections[i] : undefined
        }
      };

      materialInstance.placedParts.push(placedPart);
      
      // 計算下一個位置
      if (i < chainParts.length - 1) {
        const connection = chain.connections[i];
        currentPosition += part.length + this.settings.cuttingLoss - connection.savings;
      } else {
        materialInstance.usedLength = currentPosition + part.length;
      }
    }
  }

  /**
   * 放置單個零件
   * @param materialInstance 材料實例
   * @param part 零件
   */
  private placeSinglePart(materialInstance: MaterialInstance, part: PartInstance): void {
    const placedPart: PlacedPart = {
      partId: part.partId,
      partInstanceIndex: part.instanceIndex,
      materialId: materialInstance.materialId,
      materialInstanceIndex: materialInstance.instanceIndex,
      position: materialInstance.usedLength,
      length: part.length,
      isInSharedCutChain: false
    };

    materialInstance.placedParts.push(placedPart);
    materialInstance.usedLength += part.length + this.settings.cuttingLoss;
  }

  /**
   * 創建材料使用計劃
   * @param materialInstance 材料實例
   * @returns 材料使用計劃
   */
  private createMaterialUsagePlan(materialInstance: MaterialInstance): MaterialUsagePlan {
    const usedLength = materialInstance.usedLength;
    const wasteLength = materialInstance.length - usedLength;
    const utilization = usedLength / materialInstance.length;

    return {
      materialId: materialInstance.materialId,
      materialInstanceIndex: materialInstance.instanceIndex,
      materialLength: materialInstance.length,
      placedParts: [...materialInstance.placedParts],
      usedLength,
      wasteLength,
      utilization
    };
  }

  /**
   * 計算最終結果
   * @param materialUsagePlans 材料使用計劃
   * @param sharedCutChains 共刀鏈
   * @param totalParts 總零件數
   * @param processingTime 處理時間
   * @returns 切割結果
   */
  private calculateResult(
    materialUsagePlans: MaterialUsagePlan[], 
    sharedCutChains: SharedCutChain[], 
    totalParts: number,
    processingTime: number
  ): CuttingResult {
    const totalMaterialsUsed = materialUsagePlans.length;
    const totalWasteLength = materialUsagePlans.reduce((sum, plan) => sum + plan.wasteLength, 0);
    const totalSavingsFromSharedCuts = sharedCutChains.reduce((sum, chain) => sum + chain.totalSavings, 0);
    
    const totalUsedLength = materialUsagePlans.reduce((sum, plan) => sum + plan.usedLength, 0);
    const totalMaterialLength = materialUsagePlans.reduce((sum, plan) => sum + plan.materialLength, 0);
    const overallUtilization = totalMaterialLength > 0 ? totalUsedLength / totalMaterialLength : 0;

    const placedPartsCount = materialUsagePlans.reduce((sum, plan) => sum + plan.placedParts.length, 0);
    const allPartsPlaced = placedPartsCount === totalParts;

    return {
      materialUsagePlans,
      sharedCutChains,
      totalMaterialsUsed,
      totalWasteLength,
      totalSavingsFromSharedCuts,
      overallUtilization,
      allPartsPlaced,
      unplacedParts: [], // 根據我們的演算法，所有零件都會被放置
      processingTime,
      summary: {
        totalParts: placedPartsCount,
        totalMaterials: totalMaterialsUsed,
        sharedCutPairs: sharedCutChains.reduce((sum, chain) => sum + chain.connections.length, 0),
        materialUtilization: `${(overallUtilization * 100).toFixed(1)}%`
      }
    };
  }

  /**
   * 創建空結果
   * @param processingTime 處理時間
   * @returns 空的切割結果
   */
  private createEmptyResult(processingTime: number): CuttingResult {
    return {
      materialUsagePlans: [],
      sharedCutChains: [],
      totalMaterialsUsed: 0,
      totalWasteLength: 0,
      totalSavingsFromSharedCuts: 0,
      overallUtilization: 0,
      allPartsPlaced: true,
      unplacedParts: [],
      processingTime,
      summary: {
        totalParts: 0,
        totalMaterials: 0,
        sharedCutPairs: 0,
        materialUtilization: '0.0%'
      }
    };
  }

  /**
   * 獲取當前設定
   * @returns 當前設定
   */
  getSettings(): CuttingSettings {
    return { ...this.settings };
  }

  /**
   * 更新設定
   * @param newSettings 新設定
   */
  updateSettings(newSettings: Partial<CuttingSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // 更新共刀鏈建立器的設定
    this.chainBuilder.updateAngleTolerance(this.settings.angleTolerance);
    this.chainBuilder.updateMaxChainLength(this.settings.maxChainLength);
  }

  /**
   * 獲取優化統計資訊
   * @param materials 材料列表
   * @param parts 零件列表
   * @returns 統計資訊
   */
  getOptimizationStatistics(materials: Material[], parts: Part[]) {
    const result = this.optimize(materials, parts);
    
    return {
      totalParts: parts.reduce((sum, part) => sum + part.quantity, 0),
      totalMaterials: result.totalMaterialsUsed,
      materialUtilization: result.overallUtilization,
      totalWaste: result.totalWasteLength,
      sharedCutSavings: result.totalSavingsFromSharedCuts,
      processingTime: result.processingTime,
      allPartsPlaced: result.allPartsPlaced
    };
  }
}