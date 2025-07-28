import { PartWithQuantity, PartInstance } from '../core/v6/models/Part';
import { Material, MaterialInstance, PlacedPart, PlacementResult, PlacementReport, PlacementConstraints } from '../core/v6/models/Material';
import { SharedCutChain } from '../core/v6/models/Chain';
import { BestFitDecreasingStrategy } from './strategies/BestFitDecreasingStrategy';
import { MaterialInstanceManager } from './utils/MaterialInstanceManager';
import { ChainPlacer } from './utils/ChainPlacer';
import { PackingItem, MaterialBin } from './interfaces/IPackingStrategy';

export class OptimizedPlacerV2 {
  private readonly DEFAULT_CONSTRAINTS: PlacementConstraints = {
    cuttingLoss: 5,
    frontEndLoss: 20,
    backEndLoss: 15,
    minPartSpacing: 0
  };
  
  private constraints: PlacementConstraints;
  private packingStrategy: BestFitDecreasingStrategy;
  private materialManager: MaterialInstanceManager;
  private chainPlacer: ChainPlacer;

  constructor(constraints?: Partial<PlacementConstraints>) {
    this.constraints = { ...this.DEFAULT_CONSTRAINTS, ...constraints };
    this.packingStrategy = new BestFitDecreasingStrategy(this.constraints);
    this.materialManager = new MaterialInstanceManager();
    this.chainPlacer = new ChainPlacer(this.constraints);
  }

  placeParts(parts: PartWithQuantity[], materials: Material[]): PlacementResult {
    return this.placePartsWithChains(parts, materials, []);
  }

  placePartsWithChains(
    parts: PartWithQuantity[],
    materials: Material[],
    chains: SharedCutChain[]
  ): PlacementResult {
    const startTime = performance.now();
    
    // 展開零件實例
    const partInstances = this.expandPartInstances(parts);
    
    // 初始化材料實例
    const materialInstances = this.materialManager.initializeInstances(materials);
    
    // 放置結果
    const placedParts: PlacedPart[] = [];
    const unplacedParts: Array<{ partId: string; instanceId: number; reason: string }> = [];
    const usedInstances = new Set<string>();
    
    // 步驟1：優先處理共刀鏈
    if (chains.length > 0) {
      this.chainPlacer.placeChains(chains, partInstances, materialInstances, placedParts, usedInstances);
    }
    
    // 步驟2：收集剩餘零件
    const remainingInstances = partInstances.filter(inst => 
      !usedInstances.has(this.getInstanceKey(inst))
    );
    
    // 步驟3：使用優化算法排版剩餘零件
    const packingResult = this.optimizedPacking(remainingInstances, materialInstances, materials);
    
    // 步驟4：轉換結果
    this.convertPackingToPlacement(packingResult.bins, placedParts, usedInstances);
    
    // 步驟5：處理未能放置的零件
    for (const item of packingResult.unplaced) {
      unplacedParts.push({
        partId: item.instance.part.id,
        instanceId: item.instance.instanceId,
        reason: item.requiredLength > Math.max(...materials.map(m => m.length || 0)) 
          ? `零件長度(${item.instance.part.length}mm)超出所有材料長度不足`
          : '沒有足夠的材料空間'
      });
    }
    
    // 步驟6：嘗試更積極的排版策略
    if (unplacedParts.length > 0) {
      const improvedPlacement = this.attemptAggressivePlacement(
        unplacedParts,
        partInstances,
        materialInstances,
        placedParts,
        usedInstances,
        materials
      );
      
      unplacedParts.length = 0;
      unplacedParts.push(...improvedPlacement.stillUnplaced);
    }
    
    const endTime = performance.now();
    
    return this.calculateResult(
      placedParts,
      unplacedParts,
      materialInstances,
      partInstances.length,
      endTime - startTime,
      chains
    );
  }

  private optimizedPacking(
    instances: PartInstance[], 
    materialInstances: MaterialInstance[],
    originalMaterials: Material[]
  ): { bins: MaterialBin[]; unplaced: PackingItem[] } {
    // 準備打包項目
    const items: PackingItem[] = instances.map(inst => ({
      instance: inst,
      requiredLength: this.constraints.frontEndLoss + inst.part.length + this.constraints.backEndLoss,
      actualLength: inst.part.length
    }));
    
    // 初始化材料箱
    const bins: MaterialBin[] = materialInstances.map(mat => ({
      material: mat,
      items: [],
      usedLength: 0,
      remainingLength: mat.material.length - mat.usedLength
    }));
    
    // 檢查是否有零件超出所有材料長度
    const maxMaterialLength = Math.max(...originalMaterials.map(m => m.length || 0));
    const oversizedItems = items.filter(item => item.actualLength > maxMaterialLength);
    if (oversizedItems.length > 0 && maxMaterialLength > 0) {
      return { bins, unplaced: oversizedItems };
    }
    
    // 第一輪：正常打包
    let result = this.packingStrategy.pack(items, bins);
    
    // 動態添加材料實例處理未放置的零件
    let attempts = 0;
    const maxAttempts = 20;
    
    while (result.unplaced.length > 0 && attempts < maxAttempts) {
      const currentUnplaced = [...result.unplaced];
      result.unplaced = [];
      
      for (const item of currentUnplaced) {
        // 嘗試添加新材料實例
        const newInstances = this.materialManager.addNewInstances(
          materialInstances,
          originalMaterials,
          item
        );
        
        if (newInstances.length > 0) {
          // 添加新實例到材料列表和bins
          materialInstances.push(...newInstances);
          
          const newBins: MaterialBin[] = newInstances.map(inst => ({
            material: inst,
            items: [],
            usedLength: 0,
            remainingLength: inst.material.length
          }));
          
          bins.push(...newBins);
          
          // 重新嘗試打包這個項目
          const tempResult = this.packingStrategy.pack([item], bins);
          if (tempResult.unplaced.length > 0) {
            result.unplaced.push(item);
          }
        } else {
          result.unplaced.push(item);
        }
      }
      
      attempts++;
    }
    
    return result;
  }

  private attemptAggressivePlacement(
    unplacedList: Array<{ partId: string; instanceId: number; reason: string }>,
    partInstances: PartInstance[],
    materialInstances: MaterialInstance[],
    placedParts: PlacedPart[],
    usedInstances: Set<string>,
    originalMaterials: Material[]
  ): { stillUnplaced: Array<{ partId: string; instanceId: number; reason: string }> } {
    const stillUnplaced: Array<{ partId: string; instanceId: number; reason: string }> = [];
    
    // 收集剩餘的零件實例
    const remainingInstances: PartInstance[] = [];
    for (const unplaced of unplacedList) {
      const instance = partInstances.find(inst => 
        inst.part.id === unplaced.partId && inst.instanceId === unplaced.instanceId
      );
      if (instance) {
        remainingInstances.push(instance);
      }
    }
    
    // 按長度排序
    remainingInstances.sort((a, b) => b.part.length - a.part.length);
    
    // 定義多輪嘗試策略
    const strategies = [
      {
        name: '標準損耗',
        frontLoss: this.constraints.frontEndLoss,
        backLoss: this.constraints.backEndLoss,
        cuttingLoss: this.constraints.cuttingLoss
      },
      {
        name: '減少端部損耗',
        frontLoss: Math.min(10, this.constraints.frontEndLoss / 2),
        backLoss: Math.min(10, this.constraints.backEndLoss / 2),
        cuttingLoss: this.constraints.cuttingLoss
      },
      {
        name: '最小損耗',
        frontLoss: 5,
        backLoss: 5,
        cuttingLoss: Math.min(3, this.constraints.cuttingLoss)
      },
      {
        name: '極限損耗',
        frontLoss: 2,
        backLoss: 2,
        cuttingLoss: 2
      }
    ];
    
    // 多輪嘗試
    for (const strategy of strategies) {
      const toPlace = [...remainingInstances];
      const placed: PartInstance[] = [];
      
      for (const instance of toPlace) {
        let isPlaced = false;
        
        // 嘗試在所有材料中找到位置
        for (const matInstance of materialInstances) {
          // 檢查材料本身是否足夠長
          if (matInstance.material.length < instance.part.length + strategy.frontLoss + strategy.backLoss) {
            continue;
          }
          
          const availableLength = matInstance.material.length - matInstance.usedLength;
          const isFirstPart = matInstance.usedLength === 0;
          
          let requiredLength: number;
          if (isFirstPart) {
            requiredLength = strategy.frontLoss + instance.part.length + strategy.backLoss;
          } else {
            requiredLength = strategy.cuttingLoss + instance.part.length;
            if (availableLength - requiredLength < strategy.backLoss + 50) {
              requiredLength += strategy.backLoss;
            }
          }
          
          if (availableLength >= requiredLength) {
            const position = matInstance.usedLength + (isFirstPart ? strategy.frontLoss : strategy.cuttingLoss);
            
            const placedPart: PlacedPart = {
              partId: instance.part.id,
              partInstanceId: instance.instanceId,
              materialId: matInstance.material.id,
              materialInstanceId: matInstance.instanceId,
              position,
              length: instance.part.length,
              orientation: 'normal'
            };
            
            placedParts.push(placedPart);
            usedInstances.add(this.getInstanceKey(instance));
            matInstance.usedLength += requiredLength;
            placed.push(instance);
            isPlaced = true;
            break;
          }
        }
        
        if (!isPlaced && strategy === strategies[strategies.length - 1]) {
          // 最後一個策略仍無法放置
          stillUnplaced.push({
            partId: instance.part.id,
            instanceId: instance.instanceId,
            reason: instance.part.length > Math.max(...originalMaterials.map(m => m.length || 0))
              ? `零件長度(${instance.part.length}mm)超出所有材料長度不足`
              : `無法在現有材料中找到足夠空間（需要至少 ${instance.part.length + strategy.frontLoss + strategy.backLoss}mm）`
          });
        }
      }
      
      // 從剩餘列表中移除已放置的零件
      for (const placedInstance of placed) {
        const index = remainingInstances.findIndex(inst => 
          inst.part.id === placedInstance.part.id && 
          inst.instanceId === placedInstance.instanceId
        );
        if (index !== -1) {
          remainingInstances.splice(index, 1);
        }
      }
      
      if (remainingInstances.length === 0) {
        break;
      }
    }
    
    return { stillUnplaced };
  }

  private convertPackingToPlacement(
    bins: MaterialBin[],
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): void {
    for (const bin of bins) {
      if (bin.items.length === 0) continue;
      
      const startPosition = bin.material.usedLength;
      let position = startPosition;
      
      for (let i = 0; i < bin.items.length; i++) {
        const item = bin.items[i];
        
        if (i === 0) {
          position += this.constraints.frontEndLoss;
        } else {
          position += this.constraints.cuttingLoss;
        }
        
        const placed: PlacedPart = {
          partId: item.instance.part.id,
          partInstanceId: item.instance.instanceId,
          materialId: bin.material.material.id,
          materialInstanceId: bin.material.instanceId,
          position,
          length: item.instance.part.length,
          orientation: 'normal'
        };
        
        placedParts.push(placed);
        usedInstances.add(this.getInstanceKey(item.instance));
        
        position += item.instance.part.length;
      }
      
      bin.material.usedLength = startPosition + bin.usedLength;
    }
  }

  private expandPartInstances(parts: PartWithQuantity[]): PartInstance[] {
    const instances: PartInstance[] = [];
    
    for (const part of parts) {
      for (let i = 0; i < part.quantity; i++) {
        instances.push({
          part: {
            id: part.id,
            length: part.length,
            angles: part.angles,
            thickness: part.thickness
          },
          instanceId: i
        });
      }
    }
    
    return instances;
  }

  private getInstanceKey(instance: PartInstance): string {
    return `${instance.part.id}_${instance.instanceId}`;
  }

  private calculateResult(
    placedParts: PlacedPart[],
    unplacedParts: Array<{ partId: string; instanceId: number; reason: string }>,
    materialInstances: MaterialInstance[],
    totalParts: number,
    processingTime: number,
    chains: SharedCutChain[]
  ): PlacementResult {
    const warnings: string[] = [];
    
    // 檢查是否沒有提供材料
    if (materialInstances.length === 0) {
      warnings.push('沒有提供材料，無法進行排版');
    }
    
    if (unplacedParts.length > 0) {
      // 檢查是否所有材料都太短
      const reasons = unplacedParts.map(p => p.reason);
      if (reasons.some(r => r.includes('長度不足'))) {
        warnings.push(`有零件長度超出所有可用材料的長度`);
      }
      
      warnings.push(`有 ${unplacedParts.length} 個零件無法排版`);
      const unplacedDetails = unplacedParts.map(p => `${p.partId} (原因: ${p.reason})`).join(', ');
      warnings.push(`未排版零件: ${unplacedDetails}`);
    }
    
    // 計算材料利用率
    let totalUsedLength = 0;
    let totalMaterialLength = 0;
    const usedMaterials = [];
    
    for (const matInstance of materialInstances) {
      if (matInstance.usedLength > 0) {
        const utilization = matInstance.usedLength / matInstance.material.length;
        usedMaterials.push({
          material: matInstance.material,
          instanceId: matInstance.instanceId,
          utilization
        });
        
        totalUsedLength += matInstance.usedLength;
        totalMaterialLength += matInstance.material.length;
      }
    }
    
    const materialUtilization = totalMaterialLength > 0 ? totalUsedLength / totalMaterialLength : 0;
    
    // 計算共刀節省
    let actualTotalSavings = 0;
    const sharedCuttingPairs = placedParts.filter(p => {
      if (p.sharedCuttingInfo && p.sharedCuttingInfo.savings) {
        actualTotalSavings += p.sharedCuttingInfo.savings;
        return true;
      }
      return false;
    }).length;
    
    actualTotalSavings = actualTotalSavings / 2;
    
    const report: PlacementReport = {
      totalParts,
      totalMaterials: materialInstances.length,
      materialUtilization,
      wastePercentage: 1 - materialUtilization,
      sharedCuttingPairs,
      processingTime,
      strategy: '優化排版 - 最小化材料使用'
    };
    
    return {
      placedParts,
      unplacedParts,
      usedMaterials,
      totalSavings: actualTotalSavings,
      success: unplacedParts.length === 0,
      warnings,
      report
    };
  }
}