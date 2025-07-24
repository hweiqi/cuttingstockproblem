import { PlacedPart } from '../types';

export interface SharedCutPair {
  part1Id: string;
  part2Id: string;
  savings: number;
  position1: number;
  position2: number;
}

/**
 * 計算共刀切割的節省損耗
 */
export class SharedCutCalculator {
  /**
   * 計算兩個零件之間的共刀節省
   */
  calculateSharedCutSavings(part1: PlacedPart, part2: PlacedPart, defaultCuttingLoss: number): number {
    // 檢查是否為共刀配對
    if (!part1.isSharedCut || !part2.isSharedCut) {
      return 0;
    }

    // 檢查零件長度
    if (part1.length === 0 || part2.length === 0) {
      return 0;
    }

    // 檢查是否互相配對
    const part1Partners = this.extractPartners(part1.sharedWith || '');
    const part2Partners = this.extractPartners(part2.sharedWith || '');

    if (!part1Partners.includes(part2.partId) && !part2Partners.includes(part1.partId)) {
      return 0;
    }

    // 優先使用 angleSavings，否則使用默認切割損耗
    if (part1.angleSavings !== undefined) {
      return part1.angleSavings;
    }
    if (part2.angleSavings !== undefined) {
      return part2.angleSavings;
    }

    return defaultCuttingLoss;
  }

  /**
   * 計算一個切割計劃中的總共刀節省
   */
  calculateTotalSharedCutSavings(parts: PlacedPart[], defaultCuttingLoss: number): number {
    if (parts.length === 0) {
      return 0;
    }

    const processedPairs = new Set<string>();
    let totalSavings = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part.isSharedCut || !part.sharedWith) {
        continue;
      }

      const partners = this.extractPartners(part.sharedWith);
      
      for (const partnerId of partners) {
        const pairKey = this.createPairKey(part.partId, partnerId);
        
        if (!processedPairs.has(pairKey)) {
          const partnerPart = parts.find(p => p.partId === partnerId);
          
          if (partnerPart) {
            const savings = this.calculateSharedCutSavings(part, partnerPart, defaultCuttingLoss);
            if (savings > 0) {
              totalSavings += savings;
              processedPairs.add(pairKey);
            }
          }
        }
      }
    }

    return totalSavings;
  }

  /**
   * 獲取所有共刀配對
   */
  getSharedCutPairs(parts: PlacedPart[]): SharedCutPair[] {
    const pairs: SharedCutPair[] = [];
    const processedPairs = new Set<string>();

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part.isSharedCut || !part.sharedWith) {
        continue;
      }

      const partners = this.extractPartners(part.sharedWith);
      
      for (const partnerId of partners) {
        const pairKey = this.createPairKey(part.partId, partnerId);
        
        if (!processedPairs.has(pairKey)) {
          const partnerPart = parts.find(p => p.partId === partnerId);
          
          if (partnerPart && partnerPart.isSharedCut) {
            const savings = part.angleSavings || partnerPart.angleSavings || 0;
            
            pairs.push({
              part1Id: part.partId,
              part2Id: partnerId,
              savings,
              position1: part.position,
              position2: partnerPart.position
            });
            
            processedPairs.add(pairKey);
          }
        }
      }
    }

    return pairs;
  }

  /**
   * 從 sharedWith 字符串中提取夥伴零件ID
   */
  private extractPartners(sharedWith: string): string[] {
    if (!sharedWith) {
      return [];
    }

    // 處理多個夥伴的情況，如 "part-1 + part-2"
    return sharedWith.split(' + ').map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * 創建配對鍵，確保順序一致
   */
  private createPairKey(id1: string, id2: string): string {
    return [id1, id2].sort().join('::');
  }
}