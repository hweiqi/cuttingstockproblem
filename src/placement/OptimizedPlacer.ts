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
  
  private virtualMaterialIdCounter = 0;
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
    const packingResult = this.optimizedPacking(remainingInstances, materialInstances);
    
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
    
    // 步驟6：為未放置的零件創建虛擬材料
    let virtualMaterialsCreated = 0;
    if (unplacedParts.length > 0) {
      virtualMaterialsCreated = this.createVirtualMaterialsForUnplaced(
        unplacedParts,
        partInstances,
        materialInstances,
        placedParts,
        usedInstances
      );
      // 清空未放置列表，因為都已經放置到虛擬材料上
      unplacedParts.length = 0;
    }
    
    const endTime = performance.now();
    
    // 計算結果
    return this.calculateResult(
      placedParts,
      unplacedParts,
      materialInstances,
      partInstances.length,
      virtualMaterialsCreated,
      endTime - startTime,
      chains
    );
  }

  /**
   * 優化打包算法 - Best Fit Decreasing with Mixed Packing
   */
  private optimizedPacking(instances: PartInstance[], materialInstances: MaterialInstance[]): {
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
      .filter(m => !m.material.isVirtual)
      .map(mat => ({
        material: mat,
        items: [],
        usedLength: 0,  // 這裡只記錄新增的使用長度
        remainingLength: mat.material.length - mat.usedLength
      }));
    
    const unplaced: PackingItem[] = [];
    
    // 執行打包
    for (const item of items) {
      const bestBin = this.findBestBin(bins, item);
      
      if (bestBin) {
        // 添加到最佳箱子
        this.addItemToBin(bestBin, item);
      } else {
        unplaced.push(item);
      }
    }
    
    return { bins, unplaced };
  }

  /**
   * 找到最適合的材料箱
   */
  private findBestBin(bins: MaterialBin[], item: PackingItem): MaterialBin | null {
    let bestBin: MaterialBin | null = null;
    let bestScore = -Infinity;
    
    for (const bin of bins) {
      // 計算實際需要的長度
      const requiredLength = bin.items.length === 0 
        ? item.requiredLength  // 第一個零件需要包含前後端損耗
        : item.actualLength + this.constraints.cuttingLoss; // 後續零件只需要切割損耗
      
      if (bin.remainingLength >= requiredLength) {
        // 計算適配分數
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
    // 基礎分數：利用率
    const utilization = requiredLength / bin.remainingLength;
    let score = utilization * 100;
    
    // 獎勵：已經有零件的材料（促進集中使用）
    if (bin.items.length > 0) {
      score += 20;
    }
    
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
   * 將零件添加到材料箱
   */
  private addItemToBin(bin: MaterialBin, item: PackingItem): void {
    bin.items.push(item);
    
    if (bin.items.length === 1) {
      // 第一個零件
      bin.usedLength += item.requiredLength;
    } else {
      // 後續零件
      bin.usedLength += item.actualLength + this.constraints.cuttingLoss;
    }
    
    // 剩餘長度 = 材料總長度 - 材料原有使用長度 - 新增使用長度
    bin.remainingLength = bin.material.material.length - bin.material.usedLength - bin.usedLength;
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
      let position = startPosition + this.constraints.frontEndLoss;
      
      for (let i = 0; i < bin.items.length; i++) {
        const item = bin.items[i];
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
        if (i < bin.items.length - 1) {
          position += this.constraints.cuttingLoss;
        }
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
   * 為未放置的零件創建虛擬材料
   */
  private createVirtualMaterialsForUnplaced(
    unplacedList: Array<{ partId: string; instanceId: number; reason: string }>,
    partInstances: PartInstance[],
    materialInstances: MaterialInstance[],
    placedParts: PlacedPart[],
    usedInstances: Set<string>
  ): number {
    let virtualCount = 0;
    
    // 收集未放置的零件實例
    const unplacedInstances: PartInstance[] = [];
    for (const unplaced of unplacedList) {
      const instance = partInstances.find(inst => 
        inst.part.id === unplaced.partId && inst.instanceId === unplaced.instanceId
      );
      if (instance) {
        unplacedInstances.push(instance);
      }
    }
    
    // 對未放置的零件進行優化打包到虛擬材料
    const virtualPackingResult = this.packIntoVirtualMaterials(unplacedInstances);
    
    // 創建虛擬材料並放置零件
    for (const virtualBin of virtualPackingResult) {
      const virtualMaterial = this.createVirtualMaterial(virtualBin.requiredLength);
      const virtualInstance: MaterialInstance = {
        material: virtualMaterial,
        instanceId: 0,
        usedLength: 0
      };
      
      materialInstances.push(virtualInstance);
      virtualCount++;
      
      // 放置零件到虛擬材料
      let position = this.constraints.frontEndLoss;
      for (let i = 0; i < virtualBin.items.length; i++) {
        const item = virtualBin.items[i];
        const placed: PlacedPart = {
          partId: item.instance.part.id,
          partInstanceId: item.instance.instanceId,
          materialId: virtualMaterial.id,
          materialInstanceId: 0,
          position,
          length: item.instance.part.length,
          orientation: 'normal'
        };
        
        placedParts.push(placed);
        usedInstances.add(this.getInstanceKey(item.instance));
        
        position += item.instance.part.length;
        if (i < virtualBin.items.length - 1) {
          position += this.constraints.cuttingLoss;
        }
      }
      
      virtualInstance.usedLength = position + this.constraints.backEndLoss;
    }
    
    return virtualCount;
  }

  /**
   * 將零件打包到虛擬材料中（優化虛擬材料使用）
   */
  private packIntoVirtualMaterials(instances: PartInstance[]): Array<{
    items: PackingItem[];
    requiredLength: number;
  }> {
    const virtualBins: Array<{
      items: PackingItem[];
      requiredLength: number;
      remainingLength: number;
    }> = [];
    
    // 準備打包項目並排序
    const items: PackingItem[] = instances.map(inst => ({
      instance: inst,
      requiredLength: this.constraints.frontEndLoss + inst.part.length + this.constraints.backEndLoss,
      actualLength: inst.part.length
    }));
    
    items.sort((a, b) => b.actualLength - a.actualLength);
    
    // 打包到虛擬材料
    for (const item of items) {
      let placed = false;
      
      // 嘗試放入現有虛擬材料
      for (const bin of virtualBins) {
        const requiredLength = bin.items.length === 0
          ? item.requiredLength
          : item.actualLength + this.constraints.cuttingLoss;
        
        if (bin.remainingLength >= requiredLength) {
          bin.items.push(item);
          bin.requiredLength += requiredLength;
          bin.remainingLength -= requiredLength;
          placed = true;
          break;
        }
      }
      
      // 如果無法放入現有虛擬材料，創建新的
      if (!placed) {
        const standardLength = this.selectStandardLength(item.requiredLength);
        virtualBins.push({
          items: [item],
          requiredLength: item.requiredLength,
          remainingLength: standardLength - item.requiredLength
        });
      }
    }
    
    return virtualBins;
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
   * 創建虛擬材料
   */
  private createVirtualMaterial(minLength: number): Material {
    const selectedLength = this.selectStandardLength(minLength);
    
    return {
      id: `VIRTUAL_${this.virtualMaterialIdCounter++}`,
      length: selectedLength,
      quantity: 1,
      isVirtual: true
    };
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
   */
  private initializeMaterialInstances(materials: Material[]): MaterialInstance[] {
    const instances: MaterialInstance[] = [];
    
    for (const material of materials) {
      for (let i = 0; i < material.quantity; i++) {
        instances.push({
          material: {
            ...material,
            id: `${material.id}_${i}`
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
    const availableMaterials = materialInstances.filter(mat => {
      const remainingLength = mat.material.length - mat.usedLength;
      return remainingLength >= requiredLength && !mat.material.isVirtual;
    });
    
    if (availableMaterials.length === 0) return null;
    
    // 選擇最適合的材料（優先選擇剩餘空間最接近的）
    return availableMaterials.reduce((best, current) => {
      const bestRemaining = best.material.length - best.usedLength - requiredLength;
      const currentRemaining = current.material.length - current.usedLength - requiredLength;
      return Math.abs(currentRemaining) < Math.abs(bestRemaining) ? current : best;
    });
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
    virtualMaterialsCreated: number,
    processingTime: number,
    chains: SharedCutChain[]
  ): PlacementResult {
    const warnings: string[] = [];
    
    if (virtualMaterialsCreated > 0) {
      warnings.push(`已創建 ${virtualMaterialsCreated} 個虛擬材料以確保所有零件都能被排版`);
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
    const sharedCuttingPairs = placedParts.filter(p => p.sharedCuttingInfo).length;
    
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
      virtualMaterialsCreated,
      totalSavings,
      success: unplacedParts.length === 0,
      warnings,
      report
    };
  }
}