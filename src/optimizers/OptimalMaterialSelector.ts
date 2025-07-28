import { Part } from '../types';
import { calculateMaterialUtilization } from '../config/MaterialConfigV2';

export interface EndLosses {
  front: number;
  back: number;
}

export interface LayoutPart {
  id: string;
  length: number;
  position: number;
}

export interface OptimalLayout {
  parts: LayoutPart[];
  totalLength: number;
  utilization: number;
  waste: number;
  remainingParts: Part[];
  sharedCuts?: Array<{
    part1Id: string;
    part2Id: string;
    savings: number;
  }>;
}

export interface MaterialSuggestion {
  recommendedLength: number;
  expectedUtilization: number;
  alternativeOptions: Array<{
    length: number;
    utilization: number;
    waste: number;
  }>;
  warnings?: string[];
}

/**
 * 優化材料選擇器
 */
export class OptimalMaterialSelector {
  /**
   * 為給定零件選擇最佳材料長度
   */
  selectOptimalMaterial(
    parts: Part[],
    cuttingLoss: number,
    endLosses: EndLosses,
    enableSharedCutting: boolean = false,
    availableMaterials: number[] = []
  ): number {
    if (parts.length === 0 || parts.every(p => p.quantity === 0)) {
      return availableMaterials.length > 0 ? availableMaterials[0] : 6000;
    }

    // 計算總零件長度以估算需求
    let totalPartsLength = 0;
    let totalPartsCount = 0;
    
    for (const part of parts) {
      totalPartsLength += part.length * part.quantity;
      totalPartsCount += part.quantity;
    }
    
    // 估算所需總長度（包含切割損耗）
    const estimatedTotalLength = totalPartsLength + 
      (totalPartsCount - 1) * cuttingLoss + 
      endLosses.front + endLosses.back;

    // 找最佳材料
    let bestMaterial: number = availableMaterials.length > 0 ? availableMaterials[0] : 6000;
    let bestScore = -Infinity;

    const materialsToEvaluate = availableMaterials.length > 0 ? availableMaterials : [6000, 9000, 10000, 12000, 15000];
    for (const materialLength of materialsToEvaluate) {
      const layout = this.calculateOptimalLayout(
        parts, 
        materialLength, 
        cuttingLoss, 
        endLosses,
        enableSharedCutting
      );

      // 評分策略：
      // 1. 如果所有零件都能放下，優先選擇利用率最高的
      // 2. 如果不能全部放下，選擇能放最多零件的
      let score: number;
      
      if (layout.remainingParts.length === 0) {
        // 所有零件都放下了，選擇利用率最高的
        score = layout.utilization * 1000;
      } else {
        // 還有剩餘零件，優先考慮能放置的零件數量
        const placedCount = layout.parts.length;
        const totalCount = parts.reduce((sum, p) => sum + p.quantity, 0);
        const placementRatio = placedCount / totalCount;
        
        // 如果是因為零件太長而放不下，需要選擇更大的材料
        const hasLongParts = parts.some(p => p.length + endLosses.front + endLosses.back > materialLength);
        
        if (hasLongParts && materialLength < Math.max(...materialsToEvaluate)) {
          score = -1000; // 懲罰太短的材料
        } else {
          score = placementRatio * 100 + layout.utilization * 10;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMaterial = materialLength;
      }
    }

    return bestMaterial;
  }

  /**
   * 計算給定材料長度的最佳排版
   */
  calculateOptimalLayout(
    parts: Part[],
    materialLength: number,
    cuttingLoss: number,
    endLosses: EndLosses,
    enableSharedCutting: boolean = false
  ): OptimalLayout {
    const layoutParts: LayoutPart[] = [];
    const remainingParts: Part[] = [];
    const sharedCuts: Array<{ part1Id: string; part2Id: string; savings: number }> = [];
    
    let currentPosition = endLosses.front;
    const maxPosition = materialLength - endLosses.back;

    // 複製零件列表以進行處理
    const partsToPlace = parts.map(p => ({ ...p })).filter(p => p.quantity > 0);

    // 如果啟用共刀，先嘗試配對
    if (enableSharedCutting) {
      const pairs = this.findSharedCutPairs(partsToPlace);
      
      for (const pair of pairs) {
        if (currentPosition + pair.totalLength <= maxPosition) {
          // 放置共刀配對
          layoutParts.push({
            id: pair.part1.id,
            length: pair.part1.length,
            position: currentPosition
          });
          
          currentPosition += pair.part1.length; // 共刀沒有切割損耗
          
          layoutParts.push({
            id: pair.part2.id,
            length: pair.part2.length,
            position: currentPosition
          });
          
          currentPosition += pair.part2.length + cuttingLoss;
          
          sharedCuts.push({
            part1Id: pair.part1.id,
            part2Id: pair.part2.id,
            savings: cuttingLoss
          });

          // 更新零件數量
          const part1Index = partsToPlace.findIndex(p => p.id === pair.part1.id);
          const part2Index = partsToPlace.findIndex(p => p.id === pair.part2.id);
          
          if (part1Index >= 0) partsToPlace[part1Index].quantity--;
          if (part2Index >= 0) partsToPlace[part2Index].quantity--;
        }
      }
    }

    // 按長度降序排序剩餘零件
    partsToPlace.sort((a, b) => b.length - a.length);

    // 放置剩餘零件
    for (const part of partsToPlace) {
      while (part.quantity > 0) {
        if (currentPosition + part.length <= maxPosition) {
          layoutParts.push({
            id: part.id,
            length: part.length,
            position: currentPosition
          });
          
          currentPosition += part.length + cuttingLoss;
          part.quantity--;
        } else {
          break;
        }
      }
    }

    // 調整最後一個零件的位置（移除多餘的切割損耗）
    if (layoutParts.length > 0) {
      currentPosition -= cuttingLoss;
    }
    
    const totalLength = currentPosition + endLosses.back;
    
    // 收集剩餘零件
    for (const part of partsToPlace) {
      if (part.quantity > 0) {
        remainingParts.push({ ...part });
      }
    }

    return {
      parts: layoutParts,
      totalLength,
      utilization: calculateMaterialUtilization(totalLength, materialLength),
      waste: materialLength - totalLength,
      remainingParts,
      sharedCuts: sharedCuts.length > 0 ? sharedCuts : undefined
    };
  }

  /**
   * 建議最佳材料選擇
   */
  suggestBestMaterialForParts(
    parts: Part[],
    cuttingLoss: number,
    endLosses: EndLosses,
    targetUtilization: number = 0.85,
    availableMaterials: number[] = []
  ): MaterialSuggestion {
    const alternativeOptions: MaterialSuggestion['alternativeOptions'] = [];
    const warnings: string[] = [];
    
    // 評估所有材料
    const materialsToEvaluate = availableMaterials.length > 0 ? availableMaterials : [6000, 9000, 10000, 12000, 15000];
    for (const materialLength of materialsToEvaluate) {
      const layout = this.calculateOptimalLayout(
        parts,
        materialLength,
        cuttingLoss,
        endLosses,
        true // 啟用共刀以獲得最佳結果
      );
      
      alternativeOptions.push({
        length: materialLength,
        utilization: layout.utilization,
        waste: layout.waste
      });
    }

    // 按利用率排序
    alternativeOptions.sort((a, b) => b.utilization - a.utilization);

    // 選擇最佳選項
    const recommended = alternativeOptions.find(opt => opt.utilization >= targetUtilization) 
                       || alternativeOptions[0];

    // 生成警告
    if (recommended.utilization < 0.5) {
      warnings.push(`Low utilization: ${(recommended.utilization * 100).toFixed(1)}%. Consider combining with other parts.`);
    }
    
    if (recommended.utilization < targetUtilization) {
      warnings.push(`Utilization ${(recommended.utilization * 100).toFixed(1)}% is below target ${(targetUtilization * 100).toFixed(1)}%.`);
    }

    return {
      recommendedLength: recommended.length,
      expectedUtilization: recommended.utilization,
      alternativeOptions,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * 尋找可共刀的零件配對
   */
  private findSharedCutPairs(parts: Part[]): Array<{
    part1: Part;
    part2: Part;
    totalLength: number;
  }> {
    const pairs: Array<{ part1: Part; part2: Part; totalLength: number }> = [];
    
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        if (parts[i].quantity > 0 && parts[j].quantity > 0) {
          if (this.canShareCut(parts[i], parts[j])) {
            pairs.push({
              part1: parts[i],
              part2: parts[j],
              totalLength: parts[i].length + parts[j].length
            });
          }
        }
      }
    }
    
    // 按總長度排序，優先放置較長的配對
    pairs.sort((a, b) => b.totalLength - a.totalLength);
    
    return pairs;
  }

  /**
   * 檢查兩個零件是否可以共刀
   */
  private canShareCut(part1: Part, part2: Part): boolean {
    if (!part1.angles || !part2.angles) {
      return false;
    }
    
    const tolerance = 5; // 角度容差
    
    // 檢查右邊對左邊
    if (Math.abs(part1.angles.topRight - part2.angles.topLeft) <= tolerance &&
        Math.abs(part1.angles.bottomRight - part2.angles.bottomLeft) <= tolerance) {
      return true;
    }
    
    // 檢查左邊對右邊
    if (Math.abs(part1.angles.topLeft - part2.angles.topRight) <= tolerance &&
        Math.abs(part1.angles.bottomLeft - part2.angles.bottomRight) <= tolerance) {
      return true;
    }
    
    return false;
  }
}