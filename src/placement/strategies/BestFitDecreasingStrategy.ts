import { IPackingStrategy, PackingItem, MaterialBin, PackingResult } from '../interfaces/IPackingStrategy';
import { PlacementConstraints } from '../../core/v6/models/Material';

export class BestFitDecreasingStrategy implements IPackingStrategy {
  constructor(private constraints: PlacementConstraints) {}

  pack(items: PackingItem[], bins: MaterialBin[]): PackingResult {
    // 按長度降序排序
    const sortedItems = [...items].sort((a, b) => b.actualLength - a.actualLength);
    const unplaced: PackingItem[] = [];

    for (const item of sortedItems) {
      const bestBin = this.findBestBin(bins, item);
      
      if (bestBin) {
        this.addItemToBin(bestBin, item);
      } else {
        unplaced.push(item);
      }
    }

    return { bins, unplaced };
  }

  private findBestBin(bins: MaterialBin[], item: PackingItem): MaterialBin | null {
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
        const score = this.calculateBinScore(bin, item, requiredLength, longestBins);
        if (score > bestScore) {
          bestScore = score;
          bestBin = bin;
        }
      }
    }
    
    // 根據需求，優先使用最長材料，降低效率門檻
    if (bestBin) {
      const efficiency = this.calculateBinEfficiency(bestBin, item);
      // 更寬松的條件：只要材料能放得下，就優先使用最長材料
      if (bestBin.items.length > 0 || efficiency >= 0.01) {
        return bestBin;
      }
    }
    
    // 如果最長材料實在不合適，才考慮其他長度的材料
    // 但仍然按長度降序優先考慮
    const sortedBins = [...bins].sort((a, b) => b.material.material.length - a.material.material.length);
    bestScore = -Infinity;
    bestBin = null;
    
    for (const bin of sortedBins) {
      // 跳過已經檢查過的最長材料
      if (bin.material.material.length === maxMaterialLength) continue;
      
      const requiredLength = bin.items.length === 0 
        ? item.requiredLength
        : item.actualLength + this.constraints.cuttingLoss;
      
      if (bin.remainingLength >= requiredLength) {
        const score = this.calculateBinScore(bin, item, requiredLength, bins);
        if (score > bestScore) {
          bestScore = score;
          bestBin = bin;
        }
      }
    }
    
    return bestBin;
  }

  private calculateBinScore(bin: MaterialBin, item: PackingItem, requiredLength: number, bins?: MaterialBin[]): number {
    const remainingAfter = bin.remainingLength - requiredLength;
    let score = 0;
    
    // 基本計分
    if (remainingAfter >= 0 && remainingAfter < this.constraints.cuttingLoss) {
      score = 10000;
    } else if (remainingAfter >= 0 && remainingAfter < 500) {
      score = 5000 - remainingAfter;
    } else if (bin.items.length > 0) {
      const fillRate = (bin.material.material.length - bin.remainingLength) / bin.material.material.length;
      score = fillRate * 1000;
    } else {
      score = 100 - (remainingAfter / bin.material.material.length) * 100;
    }
    
    if (bin.items.length > 0) {
      score += 20;
    }
    
    const totalUsed = bin.material.material.length - bin.remainingLength + requiredLength;
    const utilization = totalUsed / bin.material.material.length;
    
    if (utilization > 0.95) {
      score += 50;
    }
    
    if (utilization < 0.5 && bin.items.length === 0) {
      score -= 30;
    }
    
    // 重要：根據材料長度給予額外加分，最長材料優先
    if (bins) {
      const maxLength = Math.max(...bins.map(b => b.material.material.length));
      const lengthRatio = bin.material.material.length / maxLength;
      // 最長材料獲得最高加分，其他材料按比例加分
      const lengthBonus = lengthRatio * 500; // 重要：給予長材料額外500分的優勢
      score += lengthBonus;
    }
    
    return score;
  }

  private calculateBinEfficiency(bin: MaterialBin, item: PackingItem): number {
    const requiredLength = bin.items.length === 0 
      ? item.requiredLength
      : item.actualLength + this.constraints.cuttingLoss;
    
    const totalUsed = bin.material.material.length - bin.remainingLength + requiredLength;
    return totalUsed / bin.material.material.length;
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