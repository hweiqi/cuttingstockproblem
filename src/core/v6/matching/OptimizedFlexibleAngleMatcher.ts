import { Part, AnglePositionType, isBevelAngle } from '../models/Part';
import { AngleMatch, calculateSharedCutSavings, calculateMatchScore } from '../models/SharedCut';

interface AngleGroup {
  angle: number;
  parts: Array<{
    part: Part;
    position: AnglePositionType;
  }>;
}

interface MatchCache {
  key: string;
  matches: AngleMatch[];
}

/**
 * 優化版的靈活角度匹配器
 * 使用哈希表分組和早期終止策略來提升效能
 */
export class OptimizedFlexibleAngleMatcher {
  private readonly DEFAULT_ANGLE_TOLERANCE = 5;
  private angleTolerance: number;
  private matchCache: Map<string, AngleMatch[]>;
  private readonly CACHE_SIZE_LIMIT = 10000;
  private readonly EARLY_TERMINATION_THRESHOLD = 0.8; // 當找到80%以上的好匹配時終止
  private readonly MIN_MATCH_SCORE = 5; // 最小可接受的匹配分數

  constructor(angleTolerance?: number) {
    this.angleTolerance = angleTolerance ?? this.DEFAULT_ANGLE_TOLERANCE;
    this.matchCache = new Map();
  }

  getAngleTolerance(): number {
    return this.angleTolerance;
  }

  /**
   * 找出兩個零件之間所有可能的角度匹配
   */
  findMatches(part1: Part, part2: Part): AngleMatch[] {
    // 檢查快取
    const cacheKey = this.getCacheKey(part1.id, part2.id);
    const cached = this.matchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const matches: AngleMatch[] = [];
    const positions: AnglePositionType[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

    // 快速檢查是否有任何斜切角度
    const part1HasBevel = positions.some(pos => isBevelAngle(part1.angles[pos]));
    const part2HasBevel = positions.some(pos => isBevelAngle(part2.angles[pos]));
    
    if (!part1HasBevel || !part2HasBevel) {
      this.cacheResult(cacheKey, matches);
      return matches;
    }

    // 遍歷所有位置組合
    for (const pos1 of positions) {
      const angle1 = part1.angles[pos1];
      if (!isBevelAngle(angle1)) continue;

      for (const pos2 of positions) {
        const angle2 = part2.angles[pos2];
        if (!isBevelAngle(angle2)) continue;

        const angleDiff = Math.abs(angle1 - angle2);
        if (angleDiff <= this.angleTolerance) {
          const isExact = angleDiff === 0;
          const avgAngle = (angle1 + angle2) / 2;
          const matchAngle = isExact ? angle1 : avgAngle;
          
          const avgThickness = (part1.thickness + part2.thickness) / 2;
          const savings = calculateSharedCutSavings(matchAngle, avgThickness);

          const match: AngleMatch = {
            part1Id: part1.id,
            part2Id: part2.id,
            part1Position: pos1,
            part2Position: pos2,
            angle: matchAngle,
            isExactMatch: isExact,
            angleDifference: isExact ? undefined : angleDiff,
            averageAngle: isExact ? undefined : avgAngle,
            savings: savings,
            score: 0
          };

          match.score = calculateMatchScore(match);
          
          // 只保留有意義的匹配
          if (match.score >= this.MIN_MATCH_SCORE) {
            matches.push(match);
          }
        }
      }
    }

    // 按分數排序
    matches.sort((a, b) => b.score - a.score);
    
    // 快取結果
    this.cacheResult(cacheKey, matches);
    
    return matches;
  }

  /**
   * 找出一組零件之間的最佳匹配組合（優化版）
   */
  findBestMatchCombination(parts: Part[]): AngleMatch[] {
    if (parts.length < 2) return [];

    // 步驟1：使用哈希表按角度分組
    const angleGroups = this.groupPartsByAngles(parts);
    
    // 步驟2：優先處理大組（更可能找到匹配）
    const sortedGroups = Array.from(angleGroups.values())
      .filter(group => group.parts.length >= 2)
      .sort((a, b) => b.parts.length - a.parts.length);

    const selectedMatches: AngleMatch[] = [];
    const usedPairs = new Set<string>();
    const targetMatchCount = Math.floor(parts.length / 2); // 理論最大匹配數
    let foundGoodMatches = 0;

    // 步驟3：從每個角度組中找匹配
    for (const group of sortedGroups) {
      const groupMatches = this.findMatchesInGroup(group, usedPairs);
      
      for (const match of groupMatches) {
        selectedMatches.push(match);
        foundGoodMatches++;

        // 早期終止：如果已找到足夠多的好匹配
        if (foundGoodMatches >= targetMatchCount * this.EARLY_TERMINATION_THRESHOLD) {
          return selectedMatches.sort((a, b) => b.score - a.score);
        }
      }
    }

    // 步驟4：處理跨組匹配（如果還有未匹配的零件）
    if (foundGoodMatches < targetMatchCount * 0.5) {
      const crossGroupMatches = this.findCrossGroupMatches(
        sortedGroups, 
        usedPairs,
        targetMatchCount - foundGoodMatches
      );
      selectedMatches.push(...crossGroupMatches);
    }

    return selectedMatches.sort((a, b) => b.score - a.score);
  }

  /**
   * 檢查兩個角度是否可以共刀
   */
  canShareCut(angle1: number, angle2: number): boolean {
    if (!isBevelAngle(angle1) || !isBevelAngle(angle2)) {
      return false;
    }
    
    return Math.abs(angle1 - angle2) <= this.angleTolerance;
  }

  /**
   * 找出一個零件與一組零件的最佳匹配
   */
  findBestMatchForPart(part: Part, candidates: Part[]): AngleMatch | null {
    let bestMatch: AngleMatch | null = null;
    let bestScore = 0;

    // 快速過濾掉自己和沒有斜切角度的零件
    const validCandidates = candidates.filter(candidate => 
      candidate.id !== part.id && this.hasBevelAngle(candidate)
    );

    if (!this.hasBevelAngle(part) || validCandidates.length === 0) {
      return null;
    }

    for (const candidate of validCandidates) {
      const matches = this.findMatches(part, candidate);
      if (matches.length > 0 && matches[0].score > bestScore) {
        bestMatch = matches[0];
        bestScore = matches[0].score;
        
        // 早期終止：如果找到非常好的匹配
        if (bestScore >= 90) {
          break;
        }
      }
    }

    return bestMatch;
  }

  /**
   * 評估一組零件的共刀潛力（優化版）
   */
  evaluateSharedCuttingPotential(parts: Part[]): {
    totalPotentialSavings: number;
    matchCount: number;
    averageSavingsPerMatch: number;
  } {
    if (parts.length < 2) {
      return {
        totalPotentialSavings: 0,
        matchCount: 0,
        averageSavingsPerMatch: 0
      };
    }

    // 使用抽樣策略處理大量零件
    const sampleSize = Math.min(parts.length, 500);
    const sampledParts = parts.length > sampleSize 
      ? this.sampleParts(parts, sampleSize)
      : parts;

    const matches = this.findBestMatchCombination(sampledParts);
    
    // 根據抽樣結果推算總體潛力
    const scaleFactor = parts.length / sampledParts.length;
    const estimatedMatchCount = Math.floor(matches.length * scaleFactor);
    const totalSavings = matches.reduce((sum, match) => sum + match.savings, 0) * scaleFactor;
    
    return {
      totalPotentialSavings: totalSavings,
      matchCount: estimatedMatchCount,
      averageSavingsPerMatch: estimatedMatchCount > 0 ? totalSavings / estimatedMatchCount : 0
    };
  }

  /**
   * 按角度分組零件
   */
  private groupPartsByAngles(parts: Part[]): Map<string, AngleGroup> {
    const groups = new Map<string, AngleGroup>();
    const positions: AnglePositionType[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

    for (const part of parts) {
      for (const position of positions) {
        const angle = part.angles[position];
        if (!isBevelAngle(angle)) continue;

        // 量化角度到容差範圍
        const quantizedAngle = Math.round(angle / this.angleTolerance) * this.angleTolerance;
        const key = `${quantizedAngle}`;

        if (!groups.has(key)) {
          groups.set(key, {
            angle: quantizedAngle,
            parts: []
          });
        }

        groups.get(key)!.parts.push({ part, position });
      }
    }

    return groups;
  }

  /**
   * 在角度組內找匹配
   */
  private findMatchesInGroup(group: AngleGroup, usedPairs: Set<string>): AngleMatch[] {
    const matches: AngleMatch[] = [];
    const groupParts = group.parts;

    // 使用貪心策略快速配對
    for (let i = 0; i < groupParts.length - 1; i++) {
      const part1Info = groupParts[i];
      const part1Id = part1Info.part.id;

      for (let j = i + 1; j < groupParts.length; j++) {
        const part2Info = groupParts[j];
        const part2Id = part2Info.part.id;

        if (part1Id === part2Id) continue;

        const pairKey = `${part1Id}-${part2Id}`;
        const reversePairKey = `${part2Id}-${part1Id}`;

        if (usedPairs.has(pairKey) || usedPairs.has(reversePairKey)) continue;

        // 創建匹配
        const avgThickness = (part1Info.part.thickness + part2Info.part.thickness) / 2;
        const savings = calculateSharedCutSavings(group.angle, avgThickness);

        const match: AngleMatch = {
          part1Id,
          part2Id,
          part1Position: part1Info.position,
          part2Position: part2Info.position,
          angle: group.angle,
          isExactMatch: true,
          angleDifference: undefined,
          averageAngle: undefined,
          savings: savings,
          score: 0
        };

        match.score = calculateMatchScore(match);

        if (match.score >= this.MIN_MATCH_SCORE) {
          matches.push(match);
          usedPairs.add(pairKey);
          break; // 每個零件只匹配一次
        }
      }
    }

    return matches;
  }

  /**
   * 找跨組匹配
   */
  private findCrossGroupMatches(
    groups: AngleGroup[],
    usedPairs: Set<string>,
    maxMatches: number
  ): AngleMatch[] {
    const matches: AngleMatch[] = [];
    let foundMatches = 0;

    // 只檢查相鄰角度的組
    for (let i = 0; i < groups.length - 1 && foundMatches < maxMatches; i++) {
      const group1 = groups[i];
      
      for (let j = i + 1; j < groups.length && foundMatches < maxMatches; j++) {
        const group2 = groups[j];
        
        if (Math.abs(group1.angle - group2.angle) > this.angleTolerance) continue;

        // 在兩個組之間找匹配
        const crossMatches = this.findMatchesBetweenGroups(
          group1, 
          group2, 
          usedPairs,
          maxMatches - foundMatches
        );

        matches.push(...crossMatches);
        foundMatches += crossMatches.length;
      }
    }

    return matches;
  }

  /**
   * 在兩個組之間找匹配
   */
  private findMatchesBetweenGroups(
    group1: AngleGroup,
    group2: AngleGroup,
    usedPairs: Set<string>,
    maxMatches: number
  ): AngleMatch[] {
    const matches: AngleMatch[] = [];
    let found = 0;

    for (const part1Info of group1.parts) {
      if (found >= maxMatches) break;

      for (const part2Info of group2.parts) {
        if (found >= maxMatches) break;

        const part1Id = part1Info.part.id;
        const part2Id = part2Info.part.id;

        if (part1Id === part2Id) continue;

        const pairKey = `${part1Id}-${part2Id}`;
        const reversePairKey = `${part2Id}-${part1Id}`;

        if (usedPairs.has(pairKey) || usedPairs.has(reversePairKey)) continue;

        const partMatches = this.findMatches(part1Info.part, part2Info.part);
        if (partMatches.length > 0 && partMatches[0].score >= this.MIN_MATCH_SCORE) {
          matches.push(partMatches[0]);
          usedPairs.add(pairKey);
          found++;
          break;
        }
      }
    }

    return matches;
  }

  /**
   * 檢查零件是否有斜切角度
   */
  private hasBevelAngle(part: Part): boolean {
    const positions: AnglePositionType[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    return positions.some(pos => isBevelAngle(part.angles[pos]));
  }

  /**
   * 抽樣零件用於大規模評估
   */
  private sampleParts(parts: Part[], sampleSize: number): Part[] {
    if (parts.length <= sampleSize) return parts;

    // 使用分層抽樣確保多樣性
    const angleMap = new Map<number, Part[]>();
    
    for (const part of parts) {
      const angles = Object.values(part.angles).filter(a => isBevelAngle(a));
      if (angles.length > 0) {
        const avgAngle = Math.round(angles.reduce((a, b) => a + b, 0) / angles.length);
        if (!angleMap.has(avgAngle)) {
          angleMap.set(avgAngle, []);
        }
        angleMap.get(avgAngle)!.push(part);
      }
    }

    const sampled: Part[] = [];
    const groupCount = angleMap.size;
    const samplesPerGroup = Math.ceil(sampleSize / groupCount);

    for (const [_, groupParts] of angleMap) {
      const groupSample = groupParts.slice(0, samplesPerGroup);
      sampled.push(...groupSample);
      if (sampled.length >= sampleSize) break;
    }

    return sampled.slice(0, sampleSize);
  }

  /**
   * 生成快取鍵
   */
  private getCacheKey(part1Id: string, part2Id: string): string {
    return part1Id < part2Id ? `${part1Id}-${part2Id}` : `${part2Id}-${part1Id}`;
  }

  /**
   * 快取結果
   */
  private cacheResult(key: string, matches: AngleMatch[]): void {
    if (this.matchCache.size >= this.CACHE_SIZE_LIMIT) {
      // 清除一半的快取
      const keysToDelete = Array.from(this.matchCache.keys()).slice(0, this.CACHE_SIZE_LIMIT / 2);
      keysToDelete.forEach(k => this.matchCache.delete(k));
    }
    this.matchCache.set(key, matches);
  }
}