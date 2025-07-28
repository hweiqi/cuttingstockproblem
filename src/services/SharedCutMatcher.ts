/**
 * 共刀匹配系統
 * 根據business-logic.md實現角度匹配邏輯
 */

import { 
  Part, 
  PartAngles, 
  AngleMatch, 
  PartMatch,
  canAnglesMatch,
  calculateSharedCutSavings,
  DEFAULT_CUTTING_SETTINGS 
} from '../types/core';

export class SharedCutMatcher {
  private angleTolerance: number;

  constructor(angleTolerance: number = DEFAULT_CUTTING_SETTINGS.angleTolerance) {
    this.angleTolerance = angleTolerance;
  }

  /**
   * 檢查兩個零件是否可以共刀
   * @param part1 第一個零件
   * @param part2 第二個零件
   * @returns 是否可以共刀
   */
  canPartsShareCut(part1: Part, part2: Part): boolean {
    const matches = this.findMatchingAngles(part1, part2);
    return matches.length > 0;
  }

  /**
   * 找到兩個零件之間所有可能的角度匹配
   * @param part1 第一個零件
   * @param part2 第二個零件
   * @returns 所有匹配的角度組合
   */
  findMatchingAngles(part1: Part, part2: Part): AngleMatch[] {
    const matches: AngleMatch[] = [];
    const positions: (keyof PartAngles)[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

    // 檢查所有角度位置的組合
    for (const pos1 of positions) {
      for (const pos2 of positions) {
        const angle1 = part1.angles[pos1];
        const angle2 = part2.angles[pos2];

        if (canAnglesMatch(angle1, angle2, this.angleTolerance)) {
          // 使用較小的角度作為共享角度（更保守的做法）
          const sharedAngle = Math.min(angle1, angle2);
          const savings = calculateSharedCutSavings(
            sharedAngle, 
            part1.thickness || 10, 
            part2.thickness || 10
          );

          matches.push({
            part1Position: pos1,
            part2Position: pos2,
            sharedAngle,
            savings
          });
        }
      }
    }

    return matches;
  }

  /**
   * 獲取兩個零件之間的最佳匹配（節省量最大）
   * @param part1 第一個零件
   * @param part2 第二個零件
   * @returns 最佳匹配或undefined
   */
  getBestMatch(part1: Part, part2: Part): AngleMatch | undefined {
    const matches = this.findMatchingAngles(part1, part2);
    
    if (matches.length === 0) {
      return undefined;
    }

    // 找到節省量最大的匹配
    return matches.reduce((best, current) => 
      current.savings > best.savings ? current : best
    );
  }

  /**
   * 找到所有零件之間的可能匹配組合
   * @param parts 零件列表
   * @returns 所有可能的匹配組合
   */
  findAllPossibleMatches(parts: Part[]): PartMatch[] {
    const matches: PartMatch[] = [];

    // 檢查每一對零件
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const part1 = parts[i];
        const part2 = parts[j];

        const angleMatches = this.findMatchingAngles(part1, part2);
        
        if (angleMatches.length > 0) {
          const bestMatch = angleMatches.reduce((best, current) => 
            current.savings > best.savings ? current : best
          );

          matches.push({
            part1Id: part1.id,
            part2Id: part2.id,
            bestAngleMatch: bestMatch,
            allMatches: angleMatches
          });
        }
      }
    }

    return matches;
  }

  /**
   * 根據節省量排序匹配結果
   * @param matches 匹配結果列表
   * @returns 按節省量降序排列的匹配結果
   */
  sortMatchesBySavings(matches: PartMatch[]): PartMatch[] {
    return [...matches].sort((a, b) => b.bestAngleMatch.savings - a.bestAngleMatch.savings);
  }

  /**
   * 獲取當前角度容差
   * @returns 角度容差
   */
  getAngleTolerance(): number {
    return this.angleTolerance;
  }

  /**
   * 更新角度容差
   * @param tolerance 新的角度容差
   */
  updateAngleTolerance(tolerance: number): void {
    if (tolerance < 0) {
      throw new Error('角度容差必須大於等於0');
    }
    this.angleTolerance = tolerance;
  }

  /**
   * 檢查零件是否有可用的斜切角度
   * @param part 零件
   * @returns 是否有可用角度
   */
  hasUsableAngles(part: Part): boolean {
    const { angles } = part;
    return angles.topLeft > 0 || angles.topRight > 0 || 
           angles.bottomLeft > 0 || angles.bottomRight > 0;
  }

  /**
   * 獲取零件的所有可用角度
   * @param part 零件
   * @returns 可用角度列表
   */
  getUsableAngles(part: Part): Array<{ position: keyof PartAngles; angle: number }> {
    const usableAngles: Array<{ position: keyof PartAngles; angle: number }> = [];
    const positions: (keyof PartAngles)[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

    for (const position of positions) {
      const angle = part.angles[position];
      if (angle > 0) {
        usableAngles.push({ position, angle });
      }
    }

    return usableAngles;
  }

  /**
   * 過濾出有可用角度的零件
   * @param parts 零件列表
   * @returns 有可用角度的零件列表
   */
  filterPartsWithUsableAngles(parts: Part[]): Part[] {
    return parts.filter(part => this.hasUsableAngles(part));
  }

  /**
   * 計算兩個零件匹配的總節省量
   * @param part1 第一個零件
   * @param part2 第二個零件
   * @returns 總節省量
   */
  calculateTotalSavings(part1: Part, part2: Part): number {
    const matches = this.findMatchingAngles(part1, part2);
    return matches.reduce((total, match) => total + match.savings, 0);
  }

  /**
   * 獲取特定角度位置的匹配列表
   * @param parts 零件列表
   * @param position 角度位置
   * @returns 該位置有角度的零件及其角度值
   */
  getPartsByAnglePosition(parts: Part[], position: keyof PartAngles): Array<{ part: Part; angle: number }> {
    return parts
      .filter(part => part.angles[position] > 0)
      .map(part => ({ part, angle: part.angles[position] }));
  }

  /**
   * 找到可以與指定零件匹配的所有零件
   * @param targetPart 目標零件
   * @param candidateParts 候選零件列表
   * @returns 可匹配的零件及其匹配資訊
   */
  findMatchingPartsFor(targetPart: Part, candidateParts: Part[]): PartMatch[] {
    const matches: PartMatch[] = [];

    for (const candidate of candidateParts) {
      if (candidate.id === targetPart.id) {
        continue; // 跳過自己
      }

      const angleMatches = this.findMatchingAngles(targetPart, candidate);
      
      if (angleMatches.length > 0) {
        const bestMatch = angleMatches.reduce((best, current) => 
          current.savings > best.savings ? current : best
        );

        matches.push({
          part1Id: targetPart.id,
          part2Id: candidate.id,
          bestAngleMatch: bestMatch,
          allMatches: angleMatches
        });
      }
    }

    return this.sortMatchesBySavings(matches);
  }

  /**
   * 獲取匹配統計資訊
   * @param parts 零件列表
   * @returns 匹配統計
   */
  getMatchingStatistics(parts: Part[]) {
    const partsWithAngles = this.filterPartsWithUsableAngles(parts);
    const allMatches = this.findAllPossibleMatches(parts);
    const totalSavings = allMatches.reduce((total, match) => total + match.bestAngleMatch.savings, 0);

    return {
      totalParts: parts.length,
      partsWithUsableAngles: partsWithAngles.length,
      partsWithoutAngles: parts.length - partsWithAngles.length,
      possibleMatches: allMatches.length,
      totalPotentialSavings: totalSavings,
      averageSavingsPerMatch: allMatches.length > 0 ? totalSavings / allMatches.length : 0
    };
  }
}