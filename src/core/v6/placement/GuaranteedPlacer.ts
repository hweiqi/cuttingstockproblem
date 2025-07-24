import { PartWithQuantity, PartInstance } from '../models/Part';
import { Material, MaterialInstance, PlacedPart, PlacementResult, PlacementReport, PlacementConstraints } from '../models/Material';
import { SharedCutChain } from '../models/Chain';
import { STANDARD_MATERIAL_LENGTHS } from '../../../config/MaterialConfig';
import { SharedCutCalculatorFixed } from '../../../utils/SharedCutCalculatorFixed';

/**
 * 保證完整排版的放置器
 * 確保所有零件都被排版，必要時創建虛擬材料
 */
export class GuaranteedPlacer {
  private readonly DEFAULT_CONSTRAINTS: PlacementConstraints = {
    cuttingLoss: 5,
    frontEndLoss: 20,
    backEndLoss: 15,
    minPartSpacing: 0
  };
  
  private virtualMaterialIdCounter = 0;
  private constraints: PlacementConstraints;
  private sharedCutCalculator: SharedCutCalculatorFixed;

  constructor(constraints?: Partial<PlacementConstraints>) {
    this.constraints = { ...this.DEFAULT_CONSTRAINTS, ...constraints };
    this.sharedCutCalculator = new SharedCutCalculatorFixed();
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
    
    // 步驟1：按照共刀鏈排版
    if (chains.length > 0) {
      this.placeChains(
        chains,
        partInstances,
        materialInstances,
        placedParts,
        usedInstances
      );
    }
    
    // 步驟2：排版剩餘零件
    const remainingInstances = partInstances.filter(inst => 
      !usedInstances.has(this.getInstanceKey(inst))
    );
    
    for (const instance of remainingInstances) {
      const placed = this.placeSinglePart(instance, materialInstances);
      
      if (placed) {
        placedParts.push(placed);
        usedInstances.add(this.getInstanceKey(instance));
      } else {
        // 暫時記錄為未放置
        unplacedParts.push({
          partId: instance.part.id,
          instanceId: instance.instanceId,
          reason: 'No suitable material found'
        });
      }
    }
    
    // 步驟3：為未放置的零件創建虛擬材料
    let virtualMaterialsCreated = 0;
    if (unplacedParts.length > 0) {
      const tempUnplaced = [...unplacedParts];
      unplacedParts.length = 0; // 清空列表
      
      for (const unplaced of tempUnplaced) {
        const instance = partInstances.find(inst => 
          inst.part.id === unplaced.partId && inst.instanceId === unplaced.instanceId
        );
        
        if (instance) {
          const virtualMaterial = this.createVirtualMaterial(instance.part.length);
          const virtualInstance: MaterialInstance = {
            material: virtualMaterial,
            instanceId: 0,
            usedLength: 0
          };
          
          materialInstances.push(virtualInstance);
          virtualMaterialsCreated++;
          
          const placed = this.placeSinglePart(instance, [virtualInstance]);
          if (placed) {
            placedParts.push(placed);
          }
        }
      }
    }
    
    const endTime = performance.now();
    
    // 計算結果
    const result = this.calculateResult(
      placedParts,
      unplacedParts,
      materialInstances,
      partInstances.length,
      virtualMaterialsCreated,
      endTime - startTime,
      chains
    );
    
    return result;
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
   * 放置共刀鏈
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
      const suitableMaterial = this.findSuitableMaterial(materialInstances, requiredLength);
      
      if (suitableMaterial) {
        // 放置整個鏈
        let position = suitableMaterial.usedLength + this.constraints.frontEndLoss;
        
        for (let i = 0; i < chainInstances.length; i++) {
          const instance = chainInstances[i];
          const connection = i > 0 ? chain.connections[i - 1] : null;
          
          const placed: PlacedPart = {
            partId: instance.part.id,
            partInstanceId: instance.instanceId,
            materialId: suitableMaterial.material.id,
            materialInstanceId: suitableMaterial.instanceId,
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
        suitableMaterial.usedLength = position - this.constraints.cuttingLoss + this.constraints.backEndLoss;
      }
    }
  }

  /**
   * 放置單個零件
   */
  private placeSinglePart(
    instance: PartInstance,
    materialInstances: MaterialInstance[]
  ): PlacedPart | null {
    const requiredLength = instance.part.length + 
      this.constraints.frontEndLoss + 
      this.constraints.backEndLoss;
    
    // 使用優化的材料選擇
    const bestMaterial = this.findSuitableMaterial(materialInstances, requiredLength);
    
    if (bestMaterial) {
      const position = bestMaterial.usedLength + this.constraints.frontEndLoss;
      
      const placed: PlacedPart = {
        partId: instance.part.id,
        partInstanceId: instance.instanceId,
        materialId: bestMaterial.material.id,
        materialInstanceId: bestMaterial.instanceId,
        position,
        length: instance.part.length,
        orientation: 'normal'
      };
      
      bestMaterial.usedLength = position + instance.part.length + this.constraints.backEndLoss;
      
      return placed;
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
   * 找到合適的材料
   */
  private findSuitableMaterial(
    materialInstances: MaterialInstance[],
    requiredLength: number
  ): MaterialInstance | null {
    // 優先使用實體材料
    const realMaterials = materialInstances.filter(m => !m.material.isVirtual);
    
    // 找到所有可用的材料
    const availableMaterials = realMaterials.filter(matInstance => {
      const availableLength = matInstance.material.length - matInstance.usedLength;
      return availableLength >= requiredLength;
    });
    
    if (availableMaterials.length === 0) {
      // 其次使用虛擬材料
      const virtualMaterials = materialInstances.filter(m => m.material.isVirtual);
      
      for (const matInstance of virtualMaterials) {
        const availableLength = matInstance.material.length - matInstance.usedLength;
        if (availableLength >= requiredLength) {
          return matInstance;
        }
      }
      
      return null;
    }
    
    // 選擇最佳材料：優先選擇利用率最高的
    let bestMaterial = availableMaterials[0];
    let bestUtilization = 0;
    
    for (const matInstance of availableMaterials) {
      const availableLength = matInstance.material.length - matInstance.usedLength;
      const utilization = requiredLength / availableLength;
      
      // 如果利用率超過95%，直接選擇
      if (utilization > 0.95) {
        return matInstance;
      }
      
      // 否則選擇利用率最高的
      if (utilization > bestUtilization) {
        bestUtilization = utilization;
        bestMaterial = matInstance;
      }
    }
    
    return bestMaterial;
  }

  /**
   * 創建虛擬材料
   */
  private createVirtualMaterial(minLength: number): Material {
    // 使用標準長度
    let virtualLength = minLength + this.constraints.frontEndLoss + this.constraints.backEndLoss + 100;
    
    // 選擇最接近的標準長度
    let selectedLength = STANDARD_MATERIAL_LENGTHS[STANDARD_MATERIAL_LENGTHS.length - 1];
    for (const length of STANDARD_MATERIAL_LENGTHS) {
      if (length >= virtualLength) {
        selectedLength = length;
        break;
      }
    }
    
    return {
      id: `VIRTUAL_${this.virtualMaterialIdCounter++}`,
      length: selectedLength,
      quantity: 1,
      isVirtual: true
    };
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
      warnings.push(`Created ${virtualMaterialsCreated} virtual materials to ensure all parts are placed`);
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
      strategy: chains.length > 0 ? 'Shared cutting optimization' : 'Standard placement'
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