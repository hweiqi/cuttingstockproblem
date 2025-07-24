import { PlacedPart } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 修正後的共刀計算器
 * 正確處理共刀節省和位置計算
 */
export class SharedCutCalculatorFixed {
  /**
   * 計算實際的切割損耗
   * 共刀時返回0，否則返回正常切割損耗
   */
  calculateActualCuttingLoss(part: PlacedPart, defaultCuttingLoss: number): number {
    if (part.isSharedCut) {
      return 0; // 共刀沒有切割損耗
    }
    return defaultCuttingLoss;
  }

  /**
   * 計算共刀節省
   * 包括切割損耗和角度匹配的額外節省
   */
  calculateSharedCutSavings(
    part1: PlacedPart, 
    part2: PlacedPart, 
    defaultCuttingLoss: number
  ): number {
    if (!part1.isSharedCut || !part2.isSharedCut) {
      return 0;
    }

    // 檢查是否互相配對
    if (part1.sharedWith !== part2.partId || part2.sharedWith !== part1.partId) {
      return 0;
    }

    // 如果有角度節省，使用角度節省值
    if (part1.angleSavings !== undefined && part1.angleSavings > 0) {
      return part1.angleSavings;
    }
    
    if (part2.angleSavings !== undefined && part2.angleSavings > 0) {
      return part2.angleSavings;
    }

    // 否則只節省切割損耗
    return defaultCuttingLoss;
  }

  /**
   * 驗證共刀排版的正確性
   */
  validateSharedCutLayout(parts: PlacedPart[], defaultCuttingLoss: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < parts.length - 1; i++) {
      const currentPart = parts[i];
      const nextPart = parts[i + 1];

      const currentEnd = currentPart.position + currentPart.length;
      const gap = nextPart.position - currentEnd;

      // 檢查共刀情況
      if (currentPart.isSharedCut && currentPart.sharedWith === nextPart.partId) {
        const expectedGap = currentPart.angleSavings || 0;
        
        if (Math.abs(gap - expectedGap) > 0.01) {
          errors.push(
            `Incorrect gap between shared cut parts ${currentPart.partId} and ${nextPart.partId}: ` +
            `expected ${expectedGap.toFixed(2)}mm, got ${gap.toFixed(2)}mm`
          );
        }

        // 檢查負值（共刀情況下，如果角度節省過大可能導致負間隙）
        const actualCuttingLoss = gap - expectedGap;
        if (actualCuttingLoss < 0) {
          errors.push(
            `Parts ${currentPart.partId} and ${nextPart.partId} have negative gap: ${gap.toFixed(2)}mm ` +
            `(angle savings ${expectedGap.toFixed(2)}mm exceeds available space)`
          );
        }
      } else {
        // 正常切割
        const expectedGap = defaultCuttingLoss;
        
        if (gap < expectedGap - 0.01) {
          errors.push(
            `Insufficient gap between parts ${currentPart.partId} and ${nextPart.partId}: ` +
            `expected ${expectedGap}mm, got ${gap.toFixed(2)}mm`
          );
        }
      }

      // 檢查重疊
      if (gap < -0.01) {
        errors.push(
          `Overlapping parts: ${currentPart.partId} ends at ${currentEnd.toFixed(2)}mm, ` +
          `${nextPart.partId} starts at ${nextPart.position.toFixed(2)}mm`
        );
      }
    }

    // 檢查共刀配對的一致性
    for (const part of parts) {
      if (part.isSharedCut && part.sharedWith) {
        const partner = parts.find(p => p.partId === part.sharedWith);
        if (!partner) {
          warnings.push(`Part ${part.partId} claims shared cut with ${part.sharedWith} but partner not found`);
        } else if (!partner.isSharedCut || partner.sharedWith !== part.partId) {
          errors.push(`Inconsistent shared cut pairing between ${part.partId} and ${part.sharedWith}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 計算正確的零件位置
   */
  calculateCorrectPosition(
    previousPart: PlacedPart,
    currentPart: PlacedPart,
    defaultCuttingLoss: number
  ): number {
    const previousEnd = previousPart.position + previousPart.length;

    // 如果是共刀
    if (currentPart.isSharedCut && currentPart.sharedWith === previousPart.partId) {
      const savings = currentPart.angleSavings || 0;
      return previousEnd + savings;
    }

    // 正常切割
    return previousEnd + defaultCuttingLoss;
  }

  /**
   * 修正共刀排版
   */
  fixSharedCutLayout(parts: PlacedPart[], defaultCuttingLoss: number): PlacedPart[] {
    if (parts.length === 0) return [];

    const fixed = [...parts];
    
    // 從第二個零件開始修正位置
    for (let i = 1; i < fixed.length; i++) {
      const previousPart = fixed[i - 1];
      const currentPart = fixed[i];

      const correctPosition = this.calculateCorrectPosition(
        previousPart,
        currentPart,
        defaultCuttingLoss
      );

      if (Math.abs(currentPart.position - correctPosition) > 0.01) {
        fixed[i] = {
          ...currentPart,
          position: correctPosition
        };
      }
    }

    return fixed;
  }

  /**
   * 計算總共刀節省
   */
  calculateTotalSavings(parts: PlacedPart[], defaultCuttingLoss: number): number {
    let totalSavings = 0;
    const processedPairs = new Set<string>();

    for (let i = 0; i < parts.length - 1; i++) {
      const part1 = parts[i];
      const part2 = parts[i + 1];

      if (part1.isSharedCut && part1.sharedWith === part2.partId) {
        const pairKey = [part1.partId, part2.partId].sort().join('::');
        
        if (!processedPairs.has(pairKey)) {
          const savings = this.calculateSharedCutSavings(part1, part2, defaultCuttingLoss);
          totalSavings += savings;
          processedPairs.add(pairKey);
        }
      }
    }

    return totalSavings;
  }
}