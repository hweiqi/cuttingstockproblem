import { IPackingStrategy, PackingItem, MaterialBin, PackingResult } from '../interfaces/IPackingStrategy';
import { PlacementConstraints } from '../../core/v6/models/Material';

/**
 * 優化版最佳適配遞減策略
 * 改進性能瓶頸，特別是對大規模數據的處理
 */
export class OptimizedBestFitDecreasingStrategy implements IPackingStrategy {
  private maxMaterialLength: number = 0;
  private binsByLength: Map<number, MaterialBin[]> = new Map();
  
  constructor(private constraints: PlacementConstraints) {}

  pack(items: PackingItem[], bins: MaterialBin[]): PackingResult {
    // 預處理：計算最大材料長度並按長度分組
    this.preprocessBins(bins);
    
    // 按長度降序排序
    const sortedItems = [...items].sort((a, b) => b.actualLength - a.actualLength);
    const unplaced: PackingItem[] = [];

    // 批次處理項目
    const batchSize = Math.min(100, sortedItems.length);
    for (let i = 0; i < sortedItems.length; i += batchSize) {
      const batch = sortedItems.slice(i, i + batchSize);
      
      for (const item of batch) {
        const bestBin = this.findBestBinOptimized(item);
        
        if (bestBin) {
          this.addItemToBin(bestBin, item);
        } else {
          unplaced.push(item);
        }
      }
    }

    return { bins, unplaced };
  }

  private preprocessBins(bins: MaterialBin[]): void {
    this.binsByLength.clear();
    this.maxMaterialLength = 0;
    
    for (const bin of bins) {
      const length = bin.material.material.length;
      this.maxMaterialLength = Math.max(this.maxMaterialLength, length);
      
      if (!this.binsByLength.has(length)) {
        this.binsByLength.set(length, []);
      }
      this.binsByLength.get(length)!.push(bin);
    }
  }

  private findBestBinOptimized(item: PackingItem): MaterialBin | null {
    // 從最長材料開始嘗試
    const lengths = Array.from(this.binsByLength.keys()).sort((a, b) => b - a);
    
    for (const length of lengths) {
      const binsOfLength = this.binsByLength.get(length)!;
      
      // 快速篩選可用的箱子
      const availableBins = binsOfLength.filter(bin => {
        const requiredLength = bin.items.length === 0 
          ? item.requiredLength
          : item.actualLength + this.constraints.cuttingLoss;
        return bin.remainingLength >= requiredLength;
      });
      
      if (availableBins.length === 0) continue;
      
      // 找到最佳箱子
      let bestBin: MaterialBin | null = null;
      let bestScore = -Infinity;
      
      // 限制搜索範圍以提高性能
      const searchLimit = Math.min(20, availableBins.length);
      for (let i = 0; i < searchLimit; i++) {
        const bin = availableBins[i];
        const score = this.calculateBinScoreOptimized(bin, item, length);
        
        if (score > bestScore) {
          bestScore = score;
          bestBin = bin;
        }
      }
      
      if (bestBin) {
        return bestBin;
      }
    }
    
    return null;
  }

  private calculateBinScoreOptimized(bin: MaterialBin, item: PackingItem, materialLength: number): number {
    const requiredLength = bin.items.length === 0 
      ? item.requiredLength
      : item.actualLength + this.constraints.cuttingLoss;
      
    const remainingAfter = bin.remainingLength - requiredLength;
    let score = 0;
    
    // 基本計分（簡化版）
    if (remainingAfter >= 0) {
      if (remainingAfter < this.constraints.cuttingLoss) {
        score = 10000; // 完美契合
      } else if (remainingAfter < 500) {
        score = 5000 - remainingAfter;
      } else {
        const utilization = (bin.material.material.length - remainingAfter) / bin.material.material.length;
        score = utilization * 1000;
      }
      
      // 優先使用已經有項目的箱子
      if (bin.items.length > 0) {
        score += 100;
      }
      
      // 材料長度加分（已預計算）
      const lengthRatio = materialLength / this.maxMaterialLength;
      score += lengthRatio * 500;
    }
    
    return score;
  }

  private addItemToBin(bin: MaterialBin, item: PackingItem): void {
    bin.items.push(item);
    
    let actualUsed: number;
    if (bin.items.length === 1) {
      actualUsed = Math.min(item.requiredLength, bin.remainingLength);
    } else {
      actualUsed = item.actualLength + this.constraints.cuttingLoss;
    }
    
    bin.usedLength += actualUsed;
    bin.remainingLength = Math.max(0, bin.remainingLength - actualUsed);
  }
}