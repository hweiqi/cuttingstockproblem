import { PartWithQuantity, PartInstance } from '../core/v6/models/Part';
import { Material, MaterialInstance, PlacedPart, PlacementResult, PlacementReport, PlacementConstraints } from '../core/v6/models/Material';
import { SharedCutChain } from '../core/v6/models/Chain';
import { STANDARD_MATERIAL_LENGTHS } from '../config/MaterialConfig';

interface PackingItem {
  instance: PartInstance;
  requiredLength: number; // 包含前後端損耗的總長度
  actualLength: number;   // 零件實際長度
}

interface MaterialBin {
  material: MaterialInstance;
  items: PackingItem[];
  usedLength: number;
  remainingLength: number;
}

/**
 * 優化排版器
 * 主要目標：減少使用的材料數量，最大化每個材料上的零件數量
 */
export class OptimizedPlacer {
  private readonly DEFAULT_CONSTRAINTS: PlacementConstraints = {
    cuttingLoss: 5,
    frontEndLoss: 20,
    backEndLoss: 15,
    minPartSpacing: 0
  };
  
  private constraints: PlacementConstraints;

  constructor(constraints?: Partial<PlacementConstraints>) {
    this.constraints = { ...this.DEFAULT_CONSTRAINTS, ...constraints };
  }

  /**
   * 排版零件（不考慮共刀鏈）
   */
  placeParts(parts: PartWithQuantity[], materials: Material[]): PlacementResult {
    return this.placePartsWithChains(parts, materials, []);
  }

  /**
   * 根據共刀鏈排版零件
   */
  placePartsWithChains(
    parts: PartWithQuantity[],
    materials: Material[],
    chains: SharedCutChain[]
  ): PlacementResult {
    const startTime = performance.now();
    
    // 展開零件實例
    const partInstances = this.expandPartInstances(parts);
    
    // 初始化材料實例
    const materialInstances = this.initializeMaterialInstances(materials);
    
    // 放置結果
    const placedParts: PlacedPart[] = [];
    const unplacedParts: Array<{ partId: string; instanceId: number; reason: string }> = [];
    const usedInstances = new Set<string>();
    
    // 步驟1：優先處理共刀鏈（保持原有邏輯）
    if (chains.length > 0) {
      this.placeChains(
        chains,
        partInstances,
        materialInstances,
        placedParts,
        usedInstances
      );
    }
    
    // 步驟2：收集剩餘零件並準備優化排版
    const remainingInstances = partInstances.filter(inst => 
      !usedInstances.has(this.getInstanceKey(inst))
    );
    
    // 步驟3：使用優化算法排版剩餘零件
    const packingResult = this.optimizedPacking(remainingInstances, materialInstances, materials);
    
    // 步驟4：轉換打包結果為放置結果
    this.convertPackingToPlacement(packingResult.bins, placedParts, usedInstances);
    
    // 步驟5：處理未能放置的零件
    for (const item of packingResult.unplaced) {
      unplacedParts.push({
        partId: item.instance.part.id,
        instanceId: item.instance.instanceId,
        reason: 'No suitable material found'
      });
    }
    
    // 步驟6：使用更積極的排版策略處理剩餘零件
    if (unplacedParts.length > 0) {
      // 嘗試更積極的排版策略，確保所有零件都能排版
      const improvedPlacement = this.attemptAggressivePlacement(
        unplacedParts,
        partInstances,
        materialInstances,
        placedParts,
        usedInstances,
        materials
      );
      
      // 更新未放置列表
      unplacedParts.length = 0;
      unplacedParts.push(...improvedPlacement.stillUnplaced);
    }
    
    const endTime = performance.now();
    
    // 計算結果
    return this.calculateResult(
      placedParts,
      unplacedParts,
      materialInstances,
      partInstances.length,
      endTime - startTime,
      chains
    );
  }

  /**
   * 優化打包算法 - Best Fit Decreasing with Mixed Packing
   * 支持無限材料供應
   */
  private optimizedPacking(
    instances: PartInstance[], 
    materialInstances: MaterialInstance[],
    originalMaterials: Material[]
  ): {
    bins: MaterialBin[];
    unplaced: PackingItem[];
  } {
    // 準備打包項目
    const items: PackingItem[] = instances.map(inst => ({
      instance: inst,
      requiredLength: this.constraints.frontEndLoss + inst.part.length + this.constraints.backEndLoss,
      actualLength: inst.part.length
    }));
    
    // 按長度降序排序（First Fit Decreasing）
    items.sort((a, b) => b.actualLength - a.actualLength);
    
    // 初始化材料箱
    const bins: MaterialBin[] = materialInstances
      .map(mat => ({
        material: mat,
        items: [],
        usedLength: 0,
        remainingLength: mat.material.length - mat.usedLength
      }));
    
    const unplaced: PackingItem[] = [];
    
    // 第一輪：正常打包
    for (const item of items) {
      let bestBin = this.findBestBin(bins, item);
      
      // 如果找不到合適的bin，嘗試添加新的材料實例
      if (!bestBin) {
        const newBins = this.addNewMaterialInstances(bins, materialInstances, originalMaterials, item);
        if (newBins.length > bins.length) {
          bins.push(...newBins.slice(bins.length));
          bestBin = this.findBestBin(bins, item);
        }
      }
      
      if (bestBin) {
        this.addItemToBin(bestBin, item);
      } else {
        unplaced.push(item);
      }
    }
    
    // 第二輪：更積極的打包策略
    if (unplaced.length > 0) {
      const stillUnplaced: PackingItem[] = [];
      
      for (const item of unplaced) {
        let placed = false;
        
        // 策略1：減少前後端損耗
        const reducedLossLength = item.actualLength + this.constraints.cuttingLoss + 10; // 最小10mm餘量
        for (const bin of bins) {
          if (bin.items.length === 0 && bin.remainingLength >= reducedLossLength + this.constraints.frontEndLoss) {
            // 第一個零件需要前端損耗
            const modifiedItem = {
              ...item,
              requiredLength: reducedLossLength + this.constraints.frontEndLoss
            };
            this.addItemToBin(bin, modifiedItem);
            placed = true;
            break;
          } else if (bin.items.length > 0 && bin.remainingLength >= reducedLossLength) {
            // 非第一個零件
            const modifiedItem = {
              ...item,
              requiredLength: reducedLossLength
            };
            this.addItemToBin(bin, modifiedItem);
            placed = true;
            break;
          }
        }
        
        // 策略2：極限打包（最小損耗）
        if (!placed) {
          const minLength = item.actualLength + this.constraints.cuttingLoss;
          for (const bin of bins) {
            if (bin.remainingLength >= minLength) {
              const modifiedItem = {
                ...item,
                requiredLength: minLength
              };
              this.addItemToBin(bin, modifiedItem);
              placed = true;
              break;
            }
          }
        }
        
        // 策略3：如果仍未放置，嘗試添加新材料
        if (!placed) {
          const newBins = this.addNewMaterialInstances(bins, materialInstances, originalMaterials, item);
          if (newBins.length > bins.length) {
            bins.push(...newBins.slice(bins.length));
            // 嘗試將零件放到新添加的bin中
            const newBin = bins[bins.length - 1];
            if (newBin.remainingLength >= item.requiredLength) {
              this.addItemToBin(newBin, item);
              placed = true;
            }
          }
        }
        
        if (!placed) {
          stillUnplaced.push(item);
        }
      }
      
      return { bins, unplaced: stillUnplaced };
    }
    
    return { bins, unplaced };
  }

  /**
   * 找到最適合的材料箱
   * 優先使用最長的材料，除非效率太低
   */
  private findBestBin(bins: MaterialBin[], item: PackingItem): MaterialBin | null {
    // 獲取最長材料的長度
    const maxMaterialLength = Math.max(...bins.map(b => b.material.material.length));
    
    // 首先嘗試在最長材料中放置
    const longestBins = bins.filter(b => b.material.material.length === maxMaterialLength);
    let bestBin: MaterialBin | null = null;
    let bestScore = -Infinity;
    
    for (const bin of longestBins) {
      const requiredLength = bin.items.length === 0 
        ? item.requiredLength
        : item.actualLength + this.constraints.cuttingLoss;
      
      if (bin.remainingLength >= requiredLength) {
        const score = this.calculateBinScore(bin, item, requiredLength);
        if (score > bestScore) {
          bestScore = score;
          bestBin = bin;
        }
      }
    }
    
    // 如果最長材料可以放置，檢查效率
    if (bestBin) {
      const efficiency = this.calculateBinEfficiency(bestBin, item);
      // 策略調整：
      // 1. 如果材料已有零件，優先使用（促進集中使用）
      // 2. 如果是第一個零件且零件不是極小（效率 >= 5%），使用最長材料
      // 3. 如果效率超過20%，使用最長材料
      if (bestBin.items.length > 0 || (bestBin.items.length === 0 && efficiency >= 0.05) || efficiency >= 0.2) {
        return bestBin;
      }
    }
    
    // 否則考慮其他長度的材料
    bestScore = -Infinity;
    bestBin = null;
    
    for (const bin of bins) {
      const requiredLength = bin.items.length === 0 
        ? item.requiredLength
        : item.actualLength + this.constraints.cuttingLoss;
      
      if (bin.remainingLength >= requiredLength) {
        const score = this.calculateBinScore(bin, item, requiredLength);
        if (score > bestScore) {
          bestScore = score;
          bestBin = bin;
        }
      }
    }
    
    return bestBin;
  }

  /**
   * 計算材料箱的適配分數
   */
  private calculateBinScore(bin: MaterialBin, item: PackingItem, requiredLength: number): number {
    const remainingAfter = bin.remainingLength - requiredLength;
    let score = 0;
    
    // 策略1：完美匹配（剩餘空間極小）
    if (remainingAfter >= 0 && remainingAfter < this.constraints.cuttingLoss) {
      score = 10000;
    }
    // 策略2：剩餘空間小於最小零件長度（避免浪費）
    else if (remainingAfter >= 0 && remainingAfter < 500) {
      score = 5000 - remainingAfter;
    }
    // 策略3：優先填滿即將滿的材料
    else if (bin.items.length > 0) {
      const fillRate = (bin.material.material.length - bin.remainingLength) / bin.material.material.length;
      score = fillRate * 1000;
    }
    // 策略4：新材料，選擇長度最接近的
    else {
      score = 100 - (remainingAfter / bin.material.material.length) * 100;
    }
    
    // 獎勵：已經有零件的材料（促進集中使用）
    if (bin.items.length > 0) {
      score += 20;
    }
    
    // 計算利用率
    const totalUsed = bin.material.material.length - bin.remainingLength + requiredLength;
    const utilization = totalUsed / bin.material.material.length;
    
    // 獎勵：幾乎完美填充（>95%利用率）
    if (utilization > 0.95) {
      score += 50;
    }
    
    // 懲罰：過度浪費（<50%利用率）
    if (utilization < 0.5 && bin.items.length === 0) {
      score -= 30;
    }
    
    return score;
  }

  /**
   * 計算材料箱的使用效率
   */
  private calculateBinEfficiency(bin: MaterialBin, item: PackingItem): number {
    const requiredLength = bin.items.length === 0 
      ? item.requiredLength
      : item.actualLength + this.constraints.cuttingLoss;
    
    const totalUsed = bin.material.material.length - bin.remainingLength + requiredLength;
    return totalUsed / bin.material.material.length;
  }

  /**
   * 將零件添加到材料箱
   */
  private addItemToBin(bin: MaterialBin, item: PackingItem): void {
    bin.items.push(item);
    
    // 精確計算使用的長度
    let actualUsed: number;
    if (bin.items.length === 1) {
      // 第一個零件：使用指定的requiredLength（可能已被優化）
      actualUsed = Math.min(item.requiredLength, bin.remainingLength);
    } else {
      // 後續零件：只需要零件長度+切割損耗
      actualUsed = item.actualLength + this.constraints.cuttingLoss;
      // 如果是最後一個能放入的零件，確保包含後端損耗
      if (bin.remainingLength - actualUsed < this.constraints.backEndLoss + 100) {
        actualUsed = Math.min(
          actualUsed + this.constraints.backEndLoss,
          bin.remainingLength
        );
      }
    }
    
    bin.usedLength += actualUsed;
    bin.remainingLength = Math.max(0, bin.remainingLength - actualUsed);
  }

  /**
   * 轉換打包結果為放置結果
   */
  private convertPackingToPlacement(
    bins: MaterialBin[],
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): void {
    for (const bin of bins) {
      if (bin.items.length === 0) continue;
      
      // 計算起始位置
      const startPosition = bin.material.usedLength;
      let position = startPosition;
      
      for (let i = 0; i < bin.items.length; i++) {
        const item = bin.items[i];
        
        // 第一個零件需要前端損耗
        if (i === 0) {
          position += this.constraints.frontEndLoss;
        } else {
          // 非第一個零件只需要切割損耗
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
        
        // 更新位置
        position += item.instance.part.length;
      }
      
      // 更新材料使用長度
      bin.material.usedLength = startPosition + bin.usedLength;
    }
  }

  /**
   * 放置共刀鏈（保持原有邏輯不變）
   */
  private placeChains(
    chains: SharedCutChain[],
    partInstances: PartInstance[],
    materialInstances: MaterialInstance[],
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): void {
    for (const chain of chains) {
      // 收集鏈中的零件實例
      const chainInstances: PartInstance[] = [];
      
      for (const chainPart of chain.parts) {
        const instance = partInstances.find(inst => 
          inst.part.id === chainPart.partId &&
          inst.instanceId === chainPart.instanceId &&
          !usedInstances.has(this.getInstanceKey(inst))
        );
        
        if (instance) {
          chainInstances.push(instance);
        }
      }
      
      if (chainInstances.length < 2) continue;
      
      // 找到合適的材料
      const requiredLength = this.calculateChainLength(chainInstances, chain);
      const suitableMaterial = this.findSuitableMaterialForChain(materialInstances, requiredLength);
      
      if (suitableMaterial) {
        this.placeChainOnMaterial(
          chain,
          chainInstances,
          suitableMaterial,
          placedParts,
          usedInstances
        );
      } else {
        // 如果找不到合適的材料放置整個鏈，嘗試拆分鏈
        this.placeSplitChain(
          chain,
          chainInstances,
          materialInstances,
          placedParts,
          usedInstances
        );
      }
    }
  }

  /**
   * 拆分共刀鏈並嘗試放置
   */
  private placeSplitChain(
    chain: SharedCutChain,
    chainInstances: PartInstance[],
    materialInstances: MaterialInstance[],
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): void {
    // 先嘗試找到能容納最多零件的組合
    for (let groupSize = chainInstances.length; groupSize >= 2; groupSize--) {
      for (let startIdx = 0; startIdx <= chainInstances.length - groupSize; startIdx++) {
        const group = chainInstances.slice(startIdx, startIdx + groupSize);
        const connections = chain.connections.slice(startIdx, startIdx + groupSize - 1);
        
        if (group.some(inst => usedInstances.has(this.getInstanceKey(inst)))) {
          continue;
        }
        
        const subChain: SharedCutChain = {
          ...chain,
          parts: group.map((inst, idx) => ({
            partId: inst.part.id,
            instanceId: inst.instanceId,
            position: idx
          })),
          connections: connections,
          totalSavings: connections.reduce((sum, conn) => sum + conn.savings, 0)
        };
        
        const requiredLength = this.calculateChainLength(group, subChain);
        const suitableMaterial = this.findSuitableMaterialForChain(materialInstances, requiredLength);
        
        if (suitableMaterial) {
          this.placeChainOnMaterial(
            subChain,
            group,
            suitableMaterial,
            placedParts,
            usedInstances
          );
          
          // 標記已使用
          group.forEach(inst => {
            startIdx = Math.max(0, startIdx - 1);
          });
        }
      }
    }
    
    // 處理剩餘的單個零件（放棄共刀）
    for (const instance of chainInstances) {
      if (!usedInstances.has(this.getInstanceKey(instance))) {
        // 作為普通零件處理，稍後會被optimizedPacking處理
      }
    }
  }

  /**
   * 在材料上放置共刀鏈
   */
  private placeChainOnMaterial(
    chain: SharedCutChain,
    chainInstances: PartInstance[],
    material: MaterialInstance,
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): void {
    let position = material.usedLength + this.constraints.frontEndLoss;
    
    for (let i = 0; i < chainInstances.length; i++) {
      const instance = chainInstances[i];
      const connection = i > 0 ? chain.connections[i - 1] : null;
      
      const placed: PlacedPart = {
        partId: instance.part.id,
        partInstanceId: instance.instanceId,
        materialId: material.material.id,
        materialInstanceId: material.instanceId,
        position,
        length: instance.part.length,
        orientation: 'normal'
      };
      
      // 添加共刀資訊
      if (connection) {
        placed.sharedCuttingInfo = {
          pairedWithPartId: chainInstances[i - 1].part.id,
          pairedWithInstanceId: chainInstances[i - 1].instanceId,
          sharedAngle: connection.sharedAngle,
          savings: connection.savings
        };
        
        // 更新前一個零件的共刀資訊
        const prevPlaced = placedParts[placedParts.length - 1];
        prevPlaced.sharedCuttingInfo = {
          pairedWithPartId: instance.part.id,
          pairedWithInstanceId: instance.instanceId,
          sharedAngle: connection.sharedAngle,
          savings: connection.savings
        };
        
        // 添加額外的共刀資訊用於UI顯示
        (placed as any).isSharedCut = true;
        (placed as any).sharedWith = chainInstances[i - 1].part.id;
        (placed as any).angleSavings = connection.savings;
        
        (prevPlaced as any).isSharedCut = true;
        (prevPlaced as any).sharedWith = instance.part.id;
        (prevPlaced as any).angleSavings = connection.savings;
      }
      
      placedParts.push(placed);
      usedInstances.add(this.getInstanceKey(instance));
      
      // 更新位置
      if (connection) {
        position += instance.part.length - connection.savings;
      } else {
        position += instance.part.length + this.constraints.cuttingLoss;
      }
    }
    
    // 更新材料使用長度
    material.usedLength = position - this.constraints.cuttingLoss + this.constraints.backEndLoss;
  }

  /**
   * 使用更積極的排版策略確保所有零件都能排版
   * 策略：
   * 1. 多輪嘗試，逐步減少損耗要求
   * 2. 動態增加材料（如果用戶提供的材料數量允許）
   * 3. 極限情況下使用最小損耗
   */
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
    
    // 按長度排序，優先處理較長的零件
    remainingInstances.sort((a, b) => b.part.length - a.part.length);
    
    // 定義多輪嘗試策略
    const strategies = [
      // 策略1：標準損耗但允許共用材料的不同實例
      {
        name: '標準損耗',
        frontLoss: this.constraints.frontEndLoss,
        backLoss: this.constraints.backEndLoss,
        cuttingLoss: this.constraints.cuttingLoss
      },
      // 策略2：減少前後端損耗
      {
        name: '減少端部損耗',
        frontLoss: Math.min(10, this.constraints.frontEndLoss / 2),
        backLoss: Math.min(10, this.constraints.backEndLoss / 2),
        cuttingLoss: this.constraints.cuttingLoss
      },
      // 策略3：最小損耗
      {
        name: '最小損耗',
        frontLoss: 5,
        backLoss: 5,
        cuttingLoss: Math.min(3, this.constraints.cuttingLoss)
      },
      // 策略4：極限損耗
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
          const availableLength = matInstance.material.length - matInstance.usedLength;
          let requiredLength: number;
          
          // 檢查是否為材料的第一個零件
          const isFirstPart = matInstance.usedLength === 0;
          
          if (isFirstPart) {
            requiredLength = strategy.frontLoss + instance.part.length + strategy.backLoss;
          } else {
            // 非第一個零件，只需要切割損耗
            requiredLength = strategy.cuttingLoss + instance.part.length;
            // 如果是最後一個能放進去的零件，加上後端損耗
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
          // 最後一個策略仍無法放置，嘗試添加新材料
          const newMaterialAdded = this.tryAddNewMaterialForPart(
            instance,
            materialInstances,
            originalMaterials,
            placedParts,
            usedInstances
          );
          
          if (!newMaterialAdded) {
            stillUnplaced.push({
              partId: instance.part.id,
              instanceId: instance.instanceId,
              reason: `無法在現有材料中找到足夠空間（需要至少 ${instance.part.length + 4}mm）`
            });
          }
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
      
      // 如果所有零件都已放置，提前結束
      if (remainingInstances.length === 0) {
        break;
      }
    }
    
    return { stillUnplaced };
  }



  /**
   * 選擇標準材料長度
   */
  private selectStandardLength(minLength: number): number {
    for (const length of STANDARD_MATERIAL_LENGTHS) {
      if (length >= minLength) {
        return length;
      }
    }
    return STANDARD_MATERIAL_LENGTHS[STANDARD_MATERIAL_LENGTHS.length - 1];
  }

  /**
   * 動態添加新的材料實例
   * 當現有材料不足時，根據零件需求添加合適的材料
   */
  private addNewMaterialInstances(
    existingBins: MaterialBin[],
    materialInstances: MaterialInstance[],
    originalMaterials: Material[],
    item: PackingItem
  ): MaterialBin[] {
    const newBins: MaterialBin[] = [...existingBins];
    
    // 找出無限供應的材料類型
    const unlimitedMaterials = originalMaterials.filter(m => m.quantity === 0);
    
    if (unlimitedMaterials.length === 0) {
      // 如果沒有明確的無限供應材料，但材料列表為空或不足，自動添加標準材料
      if (originalMaterials.length === 0 || existingBins.every(bin => bin.remainingLength < item.requiredLength)) {
        // 選擇合適長度的標準材料
        const requiredLength = item.requiredLength;
        const selectedLength = this.selectStandardLength(requiredLength);
        
        // 創建新的材料實例
        const newInstanceId = materialInstances.length;
        const newMaterial: MaterialInstance = {
          material: {
            id: `AUTO_MAT_${selectedLength}_${newInstanceId}`,
            originalId: `AUTO_MAT_${selectedLength}`,
            length: selectedLength,
            quantity: 0,
            isUnlimited: true
          },
          instanceId: newInstanceId,
          usedLength: 0
        };
        
        materialInstances.push(newMaterial);
        
        // 創建新的bin
        newBins.push({
          material: newMaterial,
          items: [],
          usedLength: 0,
          remainingLength: selectedLength
        });
      }
    } else {
      // 從無限供應的材料中選擇最合適的
      let bestMaterial: Material | null = null;
      let bestScore = -Infinity;
      
      for (const mat of unlimitedMaterials) {
        if (mat.length >= item.requiredLength) {
          // 優先選擇長度最接近但足夠的材料
          const waste = mat.length - item.requiredLength;
          const score = -waste; // 浪費越少分數越高
          
          if (score > bestScore) {
            bestScore = score;
            bestMaterial = mat;
          }
        }
      }
      
      // 如果沒有足夠長的材料，選擇最長的
      if (!bestMaterial) {
        bestMaterial = unlimitedMaterials.reduce((a, b) => a.length > b.length ? a : b);
      }
      
      if (bestMaterial) {
        // 創建新的材料實例
        const existingInstancesCount = materialInstances.filter(inst => 
          inst.material.originalId === bestMaterial!.id
        ).length;
        
        const newMaterial: MaterialInstance = {
          material: {
            ...bestMaterial,
            id: `${bestMaterial.id}_${existingInstancesCount}`,
            originalId: bestMaterial.id,
            isUnlimited: true
          },
          instanceId: existingInstancesCount,
          usedLength: 0
        };
        
        materialInstances.push(newMaterial);
        
        // 創建新的bin
        newBins.push({
          material: newMaterial,
          items: [],
          usedLength: 0,
          remainingLength: newMaterial.material.length
        });
      }
    }
    
    return newBins;
  }

  /**
   * 嘗試為特定零件添加新材料
   */
  private tryAddNewMaterialForPart(
    instance: PartInstance,
    materialInstances: MaterialInstance[],
    originalMaterials: Material[],
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): boolean {
    // 計算所需長度（使用最小損耗）
    const minRequiredLength = instance.part.length + this.constraints.frontEndLoss + this.constraints.backEndLoss;
    
    // 選擇合適的材料長度
    const selectedLength = this.selectStandardLength(minRequiredLength);
    
    // 檢查是否有無限供應材料或允許自動添加
    const hasUnlimitedMaterial = originalMaterials.some(m => m.quantity === 0);
    const allowAutoAdd = originalMaterials.length === 0 || hasUnlimitedMaterial;
    
    if (!allowAutoAdd) {
      return false;
    }
    
    // 找到或創建合適的材料類型
    let materialToUse = originalMaterials.find(m => 
      m.quantity === 0 && m.length >= minRequiredLength
    );
    
    if (!materialToUse) {
      // 創建新的自動材料
      materialToUse = {
        id: `AUTO_MAT_${selectedLength}`,
        length: selectedLength,
        quantity: 0,
        isUnlimited: true
      };
    }
    
    // 創建新的材料實例
    const existingInstancesCount = materialInstances.filter(inst => 
      (inst.material.originalId || inst.material.id) === materialToUse!.id
    ).length;
    
    const newMaterial: MaterialInstance = {
      material: {
        ...materialToUse,
        id: `${materialToUse.id}_${existingInstancesCount}`,
        originalId: materialToUse.id,
        isUnlimited: true
      },
      instanceId: existingInstancesCount,
      usedLength: 0
    };
    
    materialInstances.push(newMaterial);
    
    // 直接放置零件到新材料上
    const placedPart: PlacedPart = {
      partId: instance.part.id,
      partInstanceId: instance.instanceId,
      materialId: newMaterial.material.id,
      materialInstanceId: newMaterial.instanceId,
      position: this.constraints.frontEndLoss,
      length: instance.part.length,
      orientation: 'normal'
    };
    
    placedParts.push(placedPart);
    usedInstances.add(this.getInstanceKey(instance));
    newMaterial.usedLength = minRequiredLength;
    
    return true;
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
   * 初始化材料實例
   * 按長度從大到小排序，確保優先使用最長的材料
   * 支持無限材料供應：當數量為0時表示無限供應
   */
  private initializeMaterialInstances(materials: Material[]): MaterialInstance[] {
    const instances: MaterialInstance[] = [];
    
    // 如果沒有提供材料，使用標準材料
    if (materials.length === 0) {
      materials = STANDARD_MATERIAL_LENGTHS.map(length => ({
        id: `AUTO_MAT_${length}`,
        length,
        quantity: 0 // 0表示無限供應
      }));
    }
    
    // 先按長度降序排序材料
    const sortedMaterials = [...materials].sort((a, b) => b.length - a.length);
    
    for (const material of sortedMaterials) {
      // 如果數量為0，表示無限供應，初始創建一些實例
      const initialQuantity = material.quantity === 0 ? 10 : material.quantity;
      
      for (let i = 0; i < initialQuantity; i++) {
        instances.push({
          material: {
            ...material,
            id: `${material.id}_${i}`,
            originalId: material.id, // 保存原始ID
            isUnlimited: material.quantity === 0 // 標記是否無限供應
          },
          instanceId: i,
          usedLength: 0
        });
      }
    }
    
    return instances;
  }

  /**
   * 找到適合共刀鏈的材料
   */
  private findSuitableMaterialForChain(
    materialInstances: MaterialInstance[],
    requiredLength: number
  ): MaterialInstance | null {
    // 先嘗試正常長度
    let availableMaterials = materialInstances.filter(mat => {
      const remainingLength = mat.material.length - mat.usedLength;
      return remainingLength >= requiredLength;
    });
    
    if (availableMaterials.length > 0) {
      // 選擇最適合的材料（優先選擇剩餘空間最接近的）
      return availableMaterials.reduce((best, current) => {
        const bestRemaining = best.material.length - best.usedLength - requiredLength;
        const currentRemaining = current.material.length - current.usedLength - requiredLength;
        return Math.abs(currentRemaining) < Math.abs(bestRemaining) ? current : best;
      });
    }
    
    // 如果沒有找到，嘗試更緊湊的排列（減少端部損耗）
    const minRequiredLength = requiredLength - this.constraints.frontEndLoss - this.constraints.backEndLoss + 20; // 最小20mm端部損耗
    availableMaterials = materialInstances.filter(mat => {
      const remainingLength = mat.material.length - mat.usedLength;
      return remainingLength >= minRequiredLength;
    });
    
    if (availableMaterials.length > 0) {
      return availableMaterials.reduce((best, current) => {
        const bestRemaining = best.material.length - best.usedLength - minRequiredLength;
        const currentRemaining = current.material.length - current.usedLength - minRequiredLength;
        return Math.abs(currentRemaining) < Math.abs(bestRemaining) ? current : best;
      });
    }
    
    return null;
  }

  /**
   * 計算鏈的長度
   */
  private calculateChainLength(instances: PartInstance[], chain: SharedCutChain): number {
    let totalLength = this.constraints.frontEndLoss + this.constraints.backEndLoss;
    
    for (let i = 0; i < instances.length; i++) {
      totalLength += instances[i].part.length;
      
      if (i < instances.length - 1 && i < chain.connections.length) {
        totalLength -= chain.connections[i].savings;
      } else if (i < instances.length - 1) {
        totalLength += this.constraints.cuttingLoss;
      }
    }
    
    return totalLength;
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
    
    if (unplacedParts.length > 0) {
      warnings.push(`有 ${unplacedParts.length} 個零件無法排版，材料空間不足`);
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
    
    // 計算實際的共刀節省
    let actualTotalSavings = 0;
    const sharedCuttingPairs = placedParts.filter(p => {
      if (p.sharedCuttingInfo && p.sharedCuttingInfo.savings) {
        actualTotalSavings += p.sharedCuttingInfo.savings;
        return true;
      }
      return false;
    }).length;
    
    // 避免重複計算，除以2（因為每對共刀會被計算兩次）
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