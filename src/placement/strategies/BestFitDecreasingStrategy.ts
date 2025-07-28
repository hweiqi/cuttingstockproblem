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
        const score = this.calculateBinScore(bin, item, requiredLength);
        if (score > bestScore) {
          bestScore = score;
          bestBin = bin;
        }
      }
    }
    
    if (bestBin) {
      const efficiency = this.calculateBinEfficiency(bestBin, item);
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

  private calculateBinScore(bin: MaterialBin, item: PackingItem, requiredLength: number): number {
    const remainingAfter = bin.remainingLength - requiredLength;
    let score = 0;
    
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
}