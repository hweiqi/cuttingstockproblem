import { PartWithQuantity, PartInstance } from '../core/v6/models/Part';
import { Material, MaterialInstance, PlacedPart, PlacementResult, PlacementReport, PlacementConstraints } from '../core/v6/models/Material';
import { SharedCutChain } from '../core/v6/models/Chain';
import { OptimizedBestFitDecreasingStrategy } from './strategies/OptimizedBestFitDecreasingStrategy';
import { MaterialInstanceManager } from './utils/MaterialInstanceManager';
import { ChainPlacer } from './utils/ChainPlacer';
import { PackingItem, MaterialBin } from './interfaces/IPackingStrategy';
import { OptimizedMaterialManagerV2 } from './OptimizedMaterialManagerV2';


interface CacheEntry {
  result: PlacementResult;
  timestamp: number;
}

interface BranchBound {
  lowerBound: number;
  upperBound: number;
  feasible: boolean;
}

/**
 * 優化版排版器 V4
 * 改進批次處理邏輯和材料實例創建策略
 */
export class OptimizedPlacerV4 {
  private readonly DEFAULT_CONSTRAINTS: PlacementConstraints = {
    cuttingLoss: 5,
    frontEndLoss: 20,
    minPartSpacing: 0
  };
  
  private constraints: PlacementConstraints;
  private packingStrategy: OptimizedBestFitDecreasingStrategy;
  private materialManager: MaterialInstanceManager;
  private chainPlacer: ChainPlacer;
  private optimizedMaterialManager: OptimizedMaterialManagerV2;
  
  // 記憶化快取
  private cache: Map<string, CacheEntry>;
  private readonly CACHE_SIZE_LIMIT = 1000;
  private readonly CACHE_EXPIRY_MS = 60000; // 1分鐘
  
  // 分支限界參數
  private readonly BRANCH_FACTOR = 0.85; // 界限因子
  
  // 自適應批次大小參數（優化大批量處理）
  private readonly MIN_BATCH_SIZE = 500;
  private readonly MAX_BATCH_SIZE = 10000;
  private readonly INITIAL_BATCH_SIZE = 2000;

  constructor(constraints?: Partial<PlacementConstraints>) {
    this.constraints = { ...this.DEFAULT_CONSTRAINTS, ...constraints };
    this.packingStrategy = new OptimizedBestFitDecreasingStrategy(this.constraints);
    this.materialManager = new MaterialInstanceManager();
    this.chainPlacer = new ChainPlacer(this.constraints);
    this.optimizedMaterialManager = new OptimizedMaterialManagerV2();
    this.cache = new Map();
  }

  placeParts(parts: PartWithQuantity[], materials: Material[]): PlacementResult {
    return this.placePartsWithChains(parts, materials, []);
  }

  placePartsWithChains(
    parts: PartWithQuantity[],
    materials: Material[],
    chains: SharedCutChain[]
  ): PlacementResult {
    const startTime = Date.now();
    
    // 處理空輸入
    if (parts.length === 0 || materials.length === 0) {
      return this.createEmptyResult(parts, materials, Date.now() - startTime);
    }
    
    // 檢查快取
    const cacheKey = this.getCacheKey(parts, materials, chains);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        report: {
          ...cached.report,
          processingTime: Date.now() - startTime
        }
      };
    }
    
    // 執行分支限界檢查
    const bounds = this.calculateBounds(parts, materials);
    if (!bounds.feasible) {
      return this.createInfeasibleResult(parts, materials, bounds, Date.now() - startTime);
    }
    
    // 展開零件實例
    const partInstances = this.expandPartInstances(parts);
    
    // 使用改進的材料管理器初始化材料實例
    const packingItems: PackingItem[] = partInstances.map(inst => ({
      instance: inst,
      requiredLength: this.constraints.frontEndLoss + inst.part.length,
      actualLength: inst.part.length
    }));
    
    let materialInstances = this.optimizedMaterialManager.createMaterialInstances(
      materials,
      packingItems
    );
    
    // 如果初始實例不足，確保至少有一些基本實例
    if (materialInstances.length === 0 && materials.length > 0) {
      materialInstances = this.materialManager.initializeInstances(materials);
    }
    
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
    const packingResult = remainingInstances.length > 0 
      ? this.adaptivePackingWithDynamicBatching(
          remainingInstances, 
          materialInstances, 
          materials,
          bounds
        )
      : { bins: [], unplaced: [] };
    
    // 步驟4：轉換結果
    this.convertPackingToPlacement(packingResult.bins, placedParts, usedInstances);
    
    // 步驟5：處理未能放置的零件
    for (const item of packingResult.unplaced) {
      const reason = this.getUnplacedReason(item, materials);
      console.log(`[Placer] 未排版零件: ${item.instance.part.id}#${item.instance.instanceId}, 原因: ${reason}`);
      unplacedParts.push({
        partId: item.instance.part.id,
        instanceId: item.instance.instanceId,
        reason: reason
      });
    }
    
    // 步驟6：如果有任何未排版零件，嘗試更積極的策略
    if (unplacedParts.length > 0) { // 改為0，任何未排版零件都會觸發積極策略
      console.log(`[Placer] 發現 ${unplacedParts.length} 個未排版零件，嘗試積極策略`);
      console.log(`[Placer] 當前材料實例數：${materialInstances.length}`);
      
      const aggressiveResult = this.attemptAggressivePlacementV2(
        packingResult.unplaced,
        materialInstances,
        materials,
        placedParts,
        usedInstances
      );
      
      console.log(`[Placer] 積極策略後，仍有 ${aggressiveResult.stillUnplaced.length} 個未排版`);
      console.log(`[Placer] 最終材料實例數：${materialInstances.length}`);
      
      // 更新未排版列表
      unplacedParts.length = 0;
      for (const item of aggressiveResult.stillUnplaced) {
        const reason = this.getUnplacedReason(item, materials);
        console.log(`[Placer] 積極策略後仍未排版: ${item.instance.part.id}#${item.instance.instanceId}, 原因: ${reason}`);
        unplacedParts.push({
          partId: item.instance.part.id,
          instanceId: item.instance.instanceId,
          reason: reason
        });
      }
    }
    
    const endTime = Date.now();
    
    const result = this.calculateResult(
      placedParts,
      unplacedParts,
      materialInstances,
      partInstances.length,
      endTime - startTime,
      chains
    );
    
    // 儲存到快取
    this.saveToCache(cacheKey, result);
    
    return result;
  }
  
  /**
   * 自適應批次大小的動態打包
   */
  private adaptivePackingWithDynamicBatching(
    instances: PartInstance[], 
    materialInstances: MaterialInstance[],
    originalMaterials: Material[],
    bounds: BranchBound
  ): { bins: MaterialBin[]; unplaced: PackingItem[] } {
    // 準備打包項目
    const items: PackingItem[] = instances.map(inst => ({
      instance: inst,
      requiredLength: this.constraints.frontEndLoss + inst.part.length,
      actualLength: inst.part.length
    }));
    
    // 根據長度對零件進行排序
    const sortedItems = [...items].sort((a, b) => b.actualLength - a.actualLength);
    
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
    
    // 使用自適應批次大小進行打包
    return this.packWithAdaptiveBatching(sortedItems, bins, originalMaterials, bounds);
  }
  
  /**
   * 使用自適應批次大小的打包
   */
  private packWithAdaptiveBatching(
    items: PackingItem[],
    bins: MaterialBin[],
    originalMaterials: Material[],
    bounds: BranchBound
  ): { bins: MaterialBin[]; unplaced: PackingItem[] } {
    const result = { bins: [...bins], unplaced: [] as PackingItem[] };
    
    let currentBatchSize = this.INITIAL_BATCH_SIZE;
    let consecutiveFailures = 0;
    let totalProcessed = 0;
    let batchNumber = 0;
    
    console.log(`[Placer] 開始批次處理 ${items.length} 個零件，初始批次大小：${currentBatchSize}`);
    console.log(`[Placer] 可用材料實例：${bins.length}`);
    
    while (totalProcessed < items.length) {
      batchNumber++;
      const batch = items.slice(totalProcessed, totalProcessed + currentBatchSize);
      
      console.log(`[Placer] 批次 ${batchNumber}：處理 ${batch.length} 個零件`);
      
      // 對當前批次使用最佳適配遞減策略
      const batchResult = this.packingStrategy.pack(batch, result.bins);
      
      // 更新結果
      result.bins = batchResult.bins;
      
      // 計算成功率
      const successRate = (batch.length - batchResult.unplaced.length) / batch.length;
      
      console.log(`[Placer] 批次 ${batchNumber} 成功率：${(successRate * 100).toFixed(2)}%`);
      console.log(`[Placer] 已放置：${batch.length - batchResult.unplaced.length}，未放置：${batchResult.unplaced.length}`);
      
      // 處理未放置的項目
      if (batchResult.unplaced.length > 0) {
        console.log(`[Placer] 嘗試為 ${batchResult.unplaced.length} 個未放置零件創建新材料實例`);
        
        // 嘗試添加新材料實例（更積極的策略）
        const newInstances = this.tryAddMaterialInstancesV2(
          batchResult.unplaced,
          originalMaterials,
          result.bins,
          successRate
        );
        
        console.log(`[Placer] 創建了 ${newInstances.length} 個新材料實例`);
        
        if (newInstances.length > 0) {
          // 重試未放置的項目
          const retryResult = this.packingStrategy.pack(batchResult.unplaced, result.bins);
          result.bins = retryResult.bins;
          
          // 計算重試後的成功率
          const retrySuccessRate = (batchResult.unplaced.length - retryResult.unplaced.length) / 
                                   batchResult.unplaced.length;
          
          console.log(`[Placer] 重試成功率：${(retrySuccessRate * 100).toFixed(2)}%`);
          
          if (retrySuccessRate > 0.5) {
            consecutiveFailures = 0;
            // 增加批次大小（更激進的增長）
            currentBatchSize = Math.min(currentBatchSize * 3.0, this.MAX_BATCH_SIZE);
          } else {
            consecutiveFailures++;
            result.unplaced.push(...retryResult.unplaced);
          }
        } else {
          consecutiveFailures++;
          result.unplaced.push(...batchResult.unplaced);
        }
      } else {
        consecutiveFailures = 0;
        // 成功放置所有項目，更激進地增加批次大小
        currentBatchSize = Math.min(currentBatchSize * 2.5, this.MAX_BATCH_SIZE);
      }
      
      // 調整批次大小
      if (consecutiveFailures >= 3) {
        // 連續失敗，減小批次大小
        currentBatchSize = Math.max(currentBatchSize * 0.5, this.MIN_BATCH_SIZE);
        consecutiveFailures = 0;
      }
      
      totalProcessed += batch.length;
      
      // 移除提前終止檢查，確保處理所有零件
      // 對於無限供應的材料，應該盡量排版所有零件
    }
    
    return result;
  }
  
  /**
   * 嘗試添加材料實例（改進版）
   */
  private tryAddMaterialInstancesV2(
    unplacedItems: PackingItem[],
    originalMaterials: Material[],
    bins: MaterialBin[],
    successRate: number
  ): MaterialInstance[] {
    // 根據成功率和未排版數量決定創建策略的積極程度
    let aggressivenessFactor: number;
    
    if (successRate < 0.1 && unplacedItems.length > 100) {
      // 緊急模式：成功率極低且有大量未排版零件
      aggressivenessFactor = 10.0;  // 提高到10倍
    } else if (successRate < 0.3) {
      aggressivenessFactor = 6.0;   // 提高到6倍
    } else if (successRate < 0.6) {
      aggressivenessFactor = 4.0;   // 提高到4倍
    } else {
      aggressivenessFactor = 2.0;   // 基礎也提高到2倍
    }
    
    // 計算需要的材料實例數
    const avgItemLength = unplacedItems.reduce((sum, item) => sum + item.requiredLength, 0) / unplacedItems.length;
    const bestMaterialLength = Math.max(...originalMaterials.map(m => m.length || 0));
    const itemsPerMaterial = Math.floor(bestMaterialLength / avgItemLength);
    const baseCount = Math.ceil(unplacedItems.length / Math.max(1, itemsPerMaterial));
    const targetCount = Math.ceil(baseCount * aggressivenessFactor);
    
    // 使用優化的材料管理器創建額外實例
    const existingCount = bins.length;
    const newInstances = this.optimizedMaterialManager.createAdditionalInstances(
      originalMaterials,
      unplacedItems,
      existingCount
    );
    
    // 如果創建的實例不足，強制創建更多
    if (newInstances.length < targetCount) {
      let unlimitedMaterials = originalMaterials.filter(m => !m.quantity || m.quantity === 0);
      
      // 如果沒有無限材料，將最大的有限材料視為無限供應
      if (unlimitedMaterials.length === 0) {
        const limitedMaterials = originalMaterials.filter(m => m.quantity && m.quantity > 0);
        if (limitedMaterials.length > 0) {
          // 選擇最大的有限材料作為備用無限供應
          const bestLimitedMaterial = [...limitedMaterials].sort((a, b) => (b.length || 0) - (a.length || 0))[0];
          console.log(`[Placer] 有限材料用完，將材料 ${bestLimitedMaterial.id} 視為無限供應以完成排版`);
          unlimitedMaterials = [bestLimitedMaterial];
        }
      }
      
      if (unlimitedMaterials.length > 0) {
        // 優先選擇最大的無限供應材料
        const sortedUnlimited = [...unlimitedMaterials].sort((a, b) => (b.length || 0) - (a.length || 0));
        const bestMaterial = sortedUnlimited[0];
        const additionalNeeded = targetCount - newInstances.length;
        
        console.log(`[Placer] 使用材料 ${bestMaterial.id} 創建額外 ${additionalNeeded} 個實例以完成排版`);
        
        // 分散創建到不同材料以提高利用率
        let createdCount = 0;
        for (const material of sortedUnlimited) {
          const createCount = Math.ceil(additionalNeeded * ((material.length || 0) / (bestMaterial.length || 1)));
          for (let i = 0; i < createCount && createdCount < additionalNeeded; i++) {
            newInstances.push({
              material,
              instanceId: existingCount + newInstances.length,
              usedLength: 0
            });
            createdCount++;
          }
        }
      }
    }
    
    // 將新實例添加到 bins
    for (const newInstance of newInstances) {
      bins.push({
        material: newInstance,
        items: [],
        usedLength: 0,
        remainingLength: newInstance.material.length || 0
      });
    }
    
    return newInstances;
  }
  
  /**
   * 嘗試更積極的排版（改進版）
   */
  private attemptAggressivePlacementV2(
    unplacedItems: PackingItem[],
    materialInstances: MaterialInstance[],
    originalMaterials: Material[],
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): { stillUnplaced: PackingItem[] } {
    const stillUnplaced: PackingItem[] = [];
    
    console.log(`[Placer] 積極策略：為 ${unplacedItems.length} 個未排版零件創建額外實例`);
    
    // 創建足夠的新材料實例確保所有零件都能排版
    const avgItemsPerMaterial = 3; // 假設每個材料可以放置3個零件
    const targetInstances = Math.max(
      Math.ceil(unplacedItems.length / avgItemsPerMaterial), // 基於實際需求計算
      unplacedItems.length, // 至少等於未排版零件數
      100 // 最少創建100個實例
    );
    
    console.log(`[Placer] 目標創建 ${targetInstances} 個新實例`);
    
    const newInstances = this.optimizedMaterialManager.createAdditionalInstances(
      originalMaterials,
      unplacedItems,
      materialInstances.length
    );
    
    // 如果創建的實例不足，強制創建更多
    if (newInstances.length < targetInstances) {
      // 優先使用無限材料，如果沒有則使用最大的有限材料
      let availableMaterials = originalMaterials.filter(m => !m.quantity || m.quantity === 0);
      if (availableMaterials.length === 0) {
        availableMaterials = originalMaterials.filter(m => m.quantity && m.quantity > 0);
        if (availableMaterials.length > 0) {
          console.log(`[Placer] 積極策略：有限材料用完，使用有限材料繼續排版以完成所有零件`);
        }
      }
      
      const bestMaterial = availableMaterials.sort((a, b) => (b.length || 0) - (a.length || 0))[0];
      const additionalNeeded = targetInstances - newInstances.length;
      
      console.log(`[Placer] 強制創建額外 ${additionalNeeded} 個實例使用材料 ${bestMaterial?.id}`);
      
      if (bestMaterial) {
        for (let i = 0; i < additionalNeeded; i++) {
          newInstances.push({
            material: bestMaterial,
            instanceId: materialInstances.length + newInstances.length,
            usedLength: 0
          });
        }
      }
    }
    
    // 添加到現有實例列表
    materialInstances.push(...newInstances);
    
    console.log(`[Placer] 創建了 ${newInstances.length} 個新實例，總計 ${materialInstances.length} 個`);
    
    // 準備材料箱
    const bins: MaterialBin[] = materialInstances.map(mat => ({
      material: mat,
      items: [],
      usedLength: mat.usedLength,
      remainingLength: mat.material.length - mat.usedLength
    }));
    
    // 使用更寬鬆的約束重新嘗試打包
    const relaxedStrategy = new OptimizedBestFitDecreasingStrategy({
      ...this.constraints,
      frontEndLoss: Math.max(5, this.constraints.frontEndLoss / 2),
      cuttingLoss: Math.max(2, this.constraints.cuttingLoss / 2)
    });
    
    // 嘗試打包
    const packingResult = relaxedStrategy.pack(unplacedItems, bins);
    
    // 轉換成功放置的項目
    for (const bin of packingResult.bins) {
      let position = bin.material.usedLength;
      
      for (let i = 0; i < bin.items.length; i++) {
        const item = bin.items[i];
        
        if (i === 0 && position === 0) {
          position += this.constraints.frontEndLoss / 2;
        } else if (i > 0) {
          position += this.constraints.cuttingLoss / 2;
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
      
      // 更新材料使用長度
      bin.material.usedLength = position;
    }
    
    // 收集仍未放置的項目
    stillUnplaced.push(...packingResult.unplaced);
    
    return { stillUnplaced };
  }
  
  /**
   * 計算分支界限
   */
  private calculateBounds(parts: PartWithQuantity[], materials: Material[]): BranchBound {
    // 計算總零件長度
    const totalPartLength = parts.reduce((sum, part) => 
      sum + part.length * part.quantity, 0
    );
    
    // 對於無限供應的材料，使用更寬鬆的可行性檢查
    const hasUnlimitedMaterials = materials.some(m => !m.quantity || m.quantity === 0);
    
    if (hasUnlimitedMaterials && totalPartLength > 0) {
      // 有無限供應材料，總是可行的
      return { 
        lowerBound: 0.7, 
        upperBound: 0.95, 
        feasible: true 
      };
    }
    
    // 計算有限材料的總長度
    const totalMaterialLength = materials.reduce((sum, mat) => {
      const length = mat.length || 0;
      const quantity = mat.quantity !== undefined ? mat.quantity : 1;
      return sum + length * quantity;
    }, 0);
    
    // 處理邊界情況
    if (totalMaterialLength === 0) {
      return { lowerBound: 0, upperBound: 0, feasible: false };
    }
    
    // 計算界限
    const lowerBound = totalPartLength / totalMaterialLength;
    const upperBound = Math.min(0.95, lowerBound * 1.2);
    
    return { lowerBound, upperBound, feasible: true };
  }
  
  /**
   * 計算當前利用率
   */
  private calculateCurrentUtilization(bins: MaterialBin[]): number {
    let usedLength = 0;
    let totalLength = 0;
    
    for (const bin of bins) {
      if (bin.usedLength > 0) {
        usedLength += bin.usedLength;
        totalLength += bin.material.material.length || 0;
      }
    }
    
    return totalLength > 0 ? usedLength / totalLength : 0;
  }
  
  /**
   * 創建空結果
   */
  private createEmptyResult(
    parts: PartWithQuantity[],
    materials: Material[],
    processingTime: number
  ): PlacementResult {
    const totalParts = parts.reduce((sum, part) => sum + part.quantity, 0);
    
    const warnings: string[] = [];
    const unplacedParts = [];
    
    if (materials.length === 0 && parts.length > 0) {
      warnings.push('沒有提供材料，無法進行排版');
      for (const part of parts) {
        for (let i = 0; i < part.quantity; i++) {
          unplacedParts.push({
            partId: part.id,
            instanceId: i,
            reason: '沒有可用材料'
          });
        }
      }
    }
    
    return {
      placedParts: [],
      unplacedParts,
      usedMaterials: [],
      totalSavings: 0,
      success: false,
      warnings,
      report: {
        totalParts,
        totalMaterials: materials.length,
        materialUtilization: 0,
        wastePercentage: 1,
        sharedCuttingPairs: 0,
        processingTime,
        strategy: '優化排版 V4 - 自適應批次處理'
      }
    };
  }
  
  /**
   * 創建不可行結果
   */
  private createInfeasibleResult(
    parts: PartWithQuantity[],
    materials: Material[],
    bounds: BranchBound,
    processingTime: number
  ): PlacementResult {
    const totalParts = parts.reduce((sum, part) => sum + part.quantity, 0);
    
    const unplacedParts = [];
    for (const part of parts) {
      for (let i = 0; i < part.quantity; i++) {
        unplacedParts.push({
          partId: part.id,
          instanceId: i,
          reason: '材料總長度不足以容納所有零件'
        });
      }
    }
    
    return {
      placedParts: [],
      unplacedParts,
      usedMaterials: [],
      totalSavings: 0,
      success: false,
      warnings: [
        `材料總長度不足：需要至少 ${Math.ceil(bounds.lowerBound * 100)}% 的額外材料`
      ],
      report: {
        totalParts,
        totalMaterials: materials.length,
        materialUtilization: 0,
        wastePercentage: 1,
        sharedCuttingPairs: 0,
        processingTime,
        strategy: '優化排版 V4 - 自適應批次處理'
      }
    };
  }
  
  /**
   * 獲取未放置原因
   */
  private getUnplacedReason(item: PackingItem, materials: Material[]): string {
    const partLength = item.instance.part.length;
    const requiredLength = item.requiredLength;
    const maxMaterialLength = Math.max(...materials.map(m => m.length || 0));
    
    // 原因1：零件長度超出最大材料長度
    if (partLength > maxMaterialLength) {
      const largestMaterial = materials.find(m => m.length === maxMaterialLength);
      return `零件長度(${partLength}mm)超出最大材料長度(${maxMaterialLength}mm, 材料ID: ${largestMaterial?.id})`;
    }
    
    // 原因2：加上前端損耗後超出材料長度
    if (requiredLength > maxMaterialLength) {
      return `零件加前端損耗後(${requiredLength}mm = ${partLength}mm + ${this.constraints.frontEndLoss}mm)超出最大材料長度(${maxMaterialLength}mm)`;
    }
    
    // 原因3：檢查是否有限制數量的材料已用完
    const limitedMaterials = materials.filter(m => m.quantity && m.quantity > 0);
    const unlimitedMaterials = materials.filter(m => !m.quantity || m.quantity === 0);
    
    // 注意：現在系統會自動將有限材料轉為無限供應，所以這種情況應該很少發生
    if (limitedMaterials.length > 0 && unlimitedMaterials.length === 0) {
      // 只有有限材料，但系統應該已經自動處理了
      return `有限材料不足，但系統應已自動擴展材料供應（需要${requiredLength}mm）`;
    }
    
    // 原因4：雖有無限材料但未能成功創建足夠實例
    if (unlimitedMaterials.length > 0) {
      const suitableMaterials = unlimitedMaterials.filter(m => (m.length || 0) >= requiredLength);
      if (suitableMaterials.length === 0) {
        return `無限供應的材料長度都不足（需要${requiredLength}mm，最大無限材料長度：${Math.max(...unlimitedMaterials.map(m => m.length || 0))}mm）`;
      }
      return `材料實例創建或分配失敗（可能是批次處理或演算法限制）`;
    }
    
    // 原因5：其他未知原因
    return `未能找到合適的材料空間（需要${requiredLength}mm，可能因為材料碎片化或演算法限制）`;
  }
  
  /**
   * 轉換打包結果到放置結果
   */
  private convertPackingToPlacement(
    bins: MaterialBin[],
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): void {
    for (const bin of bins) {
      if (bin.items.length === 0) continue;
      
      let position = bin.material.usedLength;
      
      for (let i = 0; i < bin.items.length; i++) {
        const item = bin.items[i];
        
        if (i === 0 && position === 0) {
          position += this.constraints.frontEndLoss;
        } else if (i > 0) {
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
      
      // 更新材料使用長度
      bin.material.usedLength = position;
    }
  }
  
  /**
   * 展開零件實例
   */
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
  
  /**
   * 獲取實例鍵
   */
  private getInstanceKey(instance: PartInstance): string {
    return `${instance.part.id}_${instance.instanceId}`;
  }
  
  /**
   * 計算結果
   */
  private calculateResult(
    placedParts: PlacedPart[],
    unplacedParts: Array<{ partId: string; instanceId: number; reason: string }>,
    materialInstances: MaterialInstance[],
    totalParts: number,
    processingTime: number,
    chains: SharedCutChain[]
  ): PlacementResult {
    const warnings: string[] = [];
    
    if (materialInstances.length === 0) {
      warnings.push('沒有提供材料，無法進行排版');
    }
    
    if (unplacedParts.length > 0) {
      warnings.push(`有 ${unplacedParts.length} 個零件無法排版`);
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
    const totalSavings = chains.reduce((sum, chain) => sum + chain.totalSavings, 0);
    
    const report: PlacementReport = {
      totalParts,
      totalMaterials: materialInstances.length,
      materialUtilization,
      wastePercentage: 1 - materialUtilization,
      sharedCuttingPairs: chains.reduce((sum, chain) => sum + chain.connections.length, 0),
      processingTime,
      strategy: '優化排版 V4 - 自適應批次處理'
    };
    
    return {
      placedParts,
      unplacedParts,
      usedMaterials,
      totalSavings,
      success: unplacedParts.length === 0,
      warnings,
      report
    };
  }
  
  /**
   * 獲取快取鍵
   */
  private getCacheKey(parts: PartWithQuantity[], materials: Material[], chains?: SharedCutChain[]): string {
    const partsKey = parts.map(p => `${p.id}:${p.length}:${p.quantity}`).sort().join('|');
    const materialsKey = materials.map(m => `${m.id}:${m.length}:${m.quantity}`).sort().join('|');
    const chainsKey = chains ? chains.map(c => c.id).sort().join('|') : '';
    
    return `${partsKey}#${materialsKey}#${chainsKey}`;
  }
  
  /**
   * 從快取獲取
   */
  private getFromCache(key: string): PlacementResult | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // 檢查是否過期
    if (Date.now() - entry.timestamp > this.CACHE_EXPIRY_MS) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.result;
  }
  
  /**
   * 儲存到快取
   */
  private saveToCache(key: string, result: PlacementResult): void {
    // 清理舊快取
    if (this.cache.size >= this.CACHE_SIZE_LIMIT) {
      const keysToDelete = Array.from(this.cache.keys()).slice(0, this.CACHE_SIZE_LIMIT / 2);
      keysToDelete.forEach(k => this.cache.delete(k));
    }
    
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }
}