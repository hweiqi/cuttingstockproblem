/**
 * 共刀鏈建立系統
 * 根據business-logic.md實現共刀鏈建立邏輯
 */

import { 
  Part, 
  SharedCutChain, 
  SharedCutConnection,
  PartMatch,
  DEFAULT_CUTTING_SETTINGS 
} from '../types/core';
import { SharedCutMatcher } from './SharedCutMatcher';

interface ChainBuildResult {
  chains: SharedCutChain[];
  remainingParts: Part[];
  totalSavings: number;
}

export class SharedCutChainBuilder {
  private matcher: SharedCutMatcher;
  private maxChainLength: number;
  private currentChainId = 1;

  constructor(angleTolerance: number = DEFAULT_CUTTING_SETTINGS.angleTolerance, maxChainLength: number = DEFAULT_CUTTING_SETTINGS.maxChainLength) {
    this.matcher = new SharedCutMatcher(angleTolerance);
    this.maxChainLength = maxChainLength;
  }

  /**
   * 建立共刀鏈
   * @param parts 零件列表
   * @returns 建立結果
   */
  buildChains(parts: Part[]): ChainBuildResult {
    // 過濾出有可用角度的零件
    const usableParts = this.matcher.filterPartsWithUsableAngles(parts);
    const unusableParts = parts.filter(part => !this.matcher.hasUsableAngles(part));

    if (usableParts.length < 2) {
      return {
        chains: [],
        remainingParts: parts,
        totalSavings: 0
      };
    }

    // 找到所有可能的匹配
    const allMatches = this.matcher.findAllPossibleMatches(usableParts);
    
    if (allMatches.length === 0) {
      return {
        chains: [],
        remainingParts: parts,
        totalSavings: 0
      };
    }

    // 建立鏈
    const chains = this.buildChainsFromMatches(usableParts, allMatches);
    
    // 找出沒有被包含在任何鏈中的零件
    const usedPartIds = new Set<string>();
    chains.forEach(chain => {
      chain.partIds.forEach(partId => usedPartIds.add(partId));
    });

    const remainingParts = [
      ...unusableParts,
      ...usableParts.filter(part => !usedPartIds.has(part.id))
    ];

    const totalSavings = chains.reduce((sum, chain) => sum + chain.totalSavings, 0);

    return {
      chains: this.sortChainsBySavings(chains),
      remainingParts,
      totalSavings
    };
  }

  /**
   * 從匹配列表建立鏈
   * @param parts 零件列表
   * @param matches 匹配列表
   * @returns 鏈列表
   */
  private buildChainsFromMatches(parts: Part[], matches: PartMatch[]): SharedCutChain[] {
    const chains: SharedCutChain[] = [];
    const usedParts = new Set<string>();

    // 按節省量排序匹配，優先處理節省量大的
    const sortedMatches = this.matcher.sortMatchesBySavings(matches);

    // 為每個未使用的匹配嘗試建立鏈
    for (const match of sortedMatches) {
      if (usedParts.has(match.part1Id) || usedParts.has(match.part2Id)) {
        continue; // 零件已被使用
      }

      const chain = this.buildChainFromSeed(parts, match, usedParts, matches);
      if (chain) {
        chains.push(chain);
        chain.partIds.forEach(partId => usedParts.add(partId));
      }
    }

    return chains;
  }

  /**
   * 從種子匹配建立鏈
   * @param parts 零件列表
   * @param seedMatch 種子匹配
   * @param usedParts 已使用的零件集合
   * @param allMatches 所有匹配列表
   * @returns 建立的鏈或null
   */
  private buildChainFromSeed(
    parts: Part[], 
    seedMatch: PartMatch, 
    usedParts: Set<string>, 
    allMatches: PartMatch[]
  ): SharedCutChain | null {
    const partMap = new Map(parts.map(part => [part.id, part]));
    const chain: string[] = [seedMatch.part1Id, seedMatch.part2Id];
    const connections: SharedCutConnection[] = [{
      fromPartId: seedMatch.part1Id,
      toPartId: seedMatch.part2Id,
      fromPosition: seedMatch.bestAngleMatch.part1Position,
      toPosition: seedMatch.bestAngleMatch.part2Position,
      sharedAngle: seedMatch.bestAngleMatch.sharedAngle,
      savings: seedMatch.bestAngleMatch.savings
    }];

    // 嘗試擴展鏈
    let extended = true;
    while (extended && chain.length < this.maxChainLength) {
      extended = false;

      // 嘗試在鏈的兩端添加零件
      const headExtension = this.findBestExtension(chain[0], partMap, usedParts, allMatches, chain);
      const tailExtension = this.findBestExtension(chain[chain.length - 1], partMap, usedParts, allMatches, chain);

      // 選擇節省量更大的擴展，優先選擇能形成混合鏈的擴展
      let chosenExtension = null;
      let insertAtHead = false;

      if (headExtension && tailExtension) {
        const headMixed = this.wouldCreateMixedChain(chain, headExtension.partId, partMap);
        const tailMixed = this.wouldCreateMixedChain(chain, tailExtension.partId, partMap);
        
        if (headMixed && !tailMixed) {
          chosenExtension = headExtension;
          insertAtHead = true;
        } else if (!headMixed && tailMixed) {
          chosenExtension = tailExtension;
          insertAtHead = false;
        } else {
          // 都是混合或都不是混合，選擇節省量大的
          if (headExtension.savings >= tailExtension.savings) {
            chosenExtension = headExtension;
            insertAtHead = true;
          } else {
            chosenExtension = tailExtension;
            insertAtHead = false;
          }
        }
      } else if (headExtension) {
        chosenExtension = headExtension;
        insertAtHead = true;
      } else if (tailExtension) {
        chosenExtension = tailExtension;
        insertAtHead = false;
      }

      if (chosenExtension) {
        if (insertAtHead) {
          const currentHead = chain[0];
          chain.unshift(chosenExtension.partId);
          
          // 找到原始匹配來確定正確的位置
          const originalMatch = allMatches.find(match => 
            (match.part1Id === chosenExtension.partId && match.part2Id === currentHead) ||
            (match.part1Id === currentHead && match.part2Id === chosenExtension.partId)
          );

          connections.unshift({
            fromPartId: chosenExtension.partId,
            toPartId: currentHead,
            fromPosition: originalMatch && originalMatch.part1Id === chosenExtension.partId ? 
              originalMatch.bestAngleMatch.part1Position : 
              originalMatch ? originalMatch.bestAngleMatch.part2Position : chosenExtension.fromPosition,
            toPosition: originalMatch && originalMatch.part1Id === chosenExtension.partId ? 
              originalMatch.bestAngleMatch.part2Position : 
              originalMatch ? originalMatch.bestAngleMatch.part1Position : chosenExtension.toPosition,
            sharedAngle: chosenExtension.sharedAngle,
            savings: chosenExtension.savings
          });
        } else {
          const currentTail = chain[chain.length - 1];
          chain.push(chosenExtension.partId);
          
          // 找到原始匹配來確定正確的位置
          const originalMatch = allMatches.find(match => 
            (match.part1Id === currentTail && match.part2Id === chosenExtension.partId) ||
            (match.part1Id === chosenExtension.partId && match.part2Id === currentTail)
          );

          connections.push({
            fromPartId: currentTail,
            toPartId: chosenExtension.partId,
            fromPosition: originalMatch && originalMatch.part1Id === currentTail ? 
              originalMatch.bestAngleMatch.part1Position : 
              originalMatch ? originalMatch.bestAngleMatch.part2Position : chosenExtension.toPosition,
            toPosition: originalMatch && originalMatch.part1Id === currentTail ? 
              originalMatch.bestAngleMatch.part2Position : 
              originalMatch ? originalMatch.bestAngleMatch.part1Position : chosenExtension.fromPosition,
            sharedAngle: chosenExtension.sharedAngle,
            savings: chosenExtension.savings
          });
        }
        extended = true;
      }
    }

    // 計算鏈的屬性
    const totalLength = chain.reduce((sum, partId) => {
      const part = partMap.get(partId);
      return sum + (part ? part.length : 0);
    }, 0);

    const totalSavings = connections.reduce((sum, conn) => sum + conn.savings, 0);
    const isMixedChain = this.isChainMixed(chain, partMap);

    return {
      id: `chain-${this.currentChainId++}`,
      partIds: chain,
      connections,
      totalLength,
      totalSavings,
      isMixedChain
    };
  }

  /**
   * 找到最佳擴展
   * @param currentPartId 當前零件ID
   * @param partMap 零件映射
   * @param usedParts 已使用零件集合
   * @param allMatches 所有匹配
   * @param currentChain 當前鏈
   * @returns 最佳擴展或null
   */
  private findBestExtension(
    currentPartId: string,
    partMap: Map<string, Part>,
    usedParts: Set<string>,
    allMatches: PartMatch[],
    currentChain: string[]
  ): {
    partId: string;
    fromPosition: keyof import('../types/core').PartAngles;
    toPosition: keyof import('../types/core').PartAngles;
    sharedAngle: number;
    savings: number;
  } | null {
    let bestExtension = null;
    let maxSavings = 0;

    const relevantMatches = allMatches.filter(match => {
      const isRelevant = (match.part1Id === currentPartId || match.part2Id === currentPartId);
      const targetPartId = match.part1Id === currentPartId ? match.part2Id : match.part1Id;
      const isTargetAvailable = !usedParts.has(targetPartId) && !currentChain.includes(targetPartId);
      
      return isRelevant && isTargetAvailable;
    });

    for (const match of relevantMatches) {
      const targetPartId = match.part1Id === currentPartId ? match.part2Id : match.part1Id;
      const savings = match.bestAngleMatch.savings;

      if (savings > maxSavings) {
        maxSavings = savings;
        bestExtension = {
          partId: targetPartId,
          fromPosition: match.part1Id === currentPartId ? 
            match.bestAngleMatch.part1Position : 
            match.bestAngleMatch.part2Position,
          toPosition: match.part1Id === currentPartId ? 
            match.bestAngleMatch.part2Position : 
            match.bestAngleMatch.part1Position,
          sharedAngle: match.bestAngleMatch.sharedAngle,
          savings
        };
      }
    }

    return bestExtension;
  }

  /**
   * 檢查是否會創建混合鏈
   * @param currentChain 當前鏈
   * @param newPartId 新零件ID
   * @param partMap 零件映射
   * @returns 是否會創建混合鏈
   */
  private wouldCreateMixedChain(currentChain: string[], newPartId: string, partMap: Map<string, Part>): boolean {
    const allParts = [...currentChain, newPartId].map(id => partMap.get(id)).filter(Boolean) as Part[];
    return this.arePartsMixed(allParts);
  }

  /**
   * 檢查鏈是否為混合鏈
   * @param chain 鏈的零件ID列表
   * @param partMap 零件映射
   * @returns 是否為混合鏈
   */
  private isChainMixed(chain: string[], partMap: Map<string, Part>): boolean {
    const parts = chain.map(id => partMap.get(id)).filter(Boolean) as Part[];
    return this.arePartsMixed(parts);
  }

  /**
   * 檢查零件列表是否混合
   * @param parts 零件列表
   * @returns 是否混合
   */
  private arePartsMixed(parts: Part[]): boolean {
    if (parts.length <= 1) return false;
    
    const firstPart = parts[0];
    
    // 檢查長度是否相同
    const allSameLength = parts.every(part => part.length === firstPart.length);
    
    // 檢查角度是否相同
    const allSameAngles = parts.every(part => 
      part.angles.topLeft === firstPart.angles.topLeft &&
      part.angles.topRight === firstPart.angles.topRight &&
      part.angles.bottomLeft === firstPart.angles.bottomLeft &&
      part.angles.bottomRight === firstPart.angles.bottomRight
    );
    
    // 檢查厚度是否相同
    const allSameThickness = parts.every(part => part.thickness === firstPart.thickness);
    
    // 如果長度、角度、厚度都相同，則不是混合鏈
    return !(allSameLength && allSameAngles && allSameThickness);
  }

  /**
   * 按節省量排序鏈
   * @param chains 鏈列表
   * @returns 排序後的鏈列表
   */
  private sortChainsBySavings(chains: SharedCutChain[]): SharedCutChain[] {
    return [...chains].sort((a, b) => {
      // 優先混合鏈
      if (a.isMixedChain && !b.isMixedChain) return -1;
      if (!a.isMixedChain && b.isMixedChain) return 1;
      
      // 然後按節省量排序
      return b.totalSavings - a.totalSavings;
    });
  }

  /**
   * 獲取角度容差
   * @returns 角度容差
   */
  getAngleTolerance(): number {
    return this.matcher.getAngleTolerance();
  }

  /**
   * 更新角度容差
   * @param tolerance 新的角度容差
   */
  updateAngleTolerance(tolerance: number): void {
    this.matcher.updateAngleTolerance(tolerance);
  }

  /**
   * 獲取最大鏈長度
   * @returns 最大鏈長度
   */
  getMaxChainLength(): number {
    return this.maxChainLength;
  }

  /**
   * 更新最大鏈長度
   * @param maxLength 新的最大鏈長度
   */
  updateMaxChainLength(maxLength: number): void {
    if (maxLength < 2) {
      throw new Error('最大鏈長度必須至少為2');
    }
    this.maxChainLength = maxLength;
  }

  /**
   * 獲取鏈建立統計資訊
   * @param parts 零件列表
   * @returns 統計資訊
   */
  getChainBuildingStatistics(parts: Part[]) {
    const result = this.buildChains(parts);
    const usableParts = this.matcher.filterPartsWithUsableAngles(parts);
    
    return {
      totalParts: parts.length,
      usableParts: usableParts.length,
      chainsBuilt: result.chains.length,
      averageChainLength: result.chains.length > 0 ? 
        result.chains.reduce((sum, chain) => sum + chain.partIds.length, 0) / result.chains.length : 0,
      mixedChains: result.chains.filter(chain => chain.isMixedChain).length,
      homogeneousChains: result.chains.filter(chain => !chain.isMixedChain).length,
      totalSavings: result.totalSavings,
      averageSavingsPerChain: result.chains.length > 0 ? result.totalSavings / result.chains.length : 0,
      remainingParts: result.remainingParts.length
    };
  }

  /**
   * 驗證鏈的完整性
   * @param chain 鏈
   * @param partMap 零件映射
   * @returns 驗證結果
   */
  validateChain(chain: SharedCutChain, partMap: Map<string, Part>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 檢查零件存在性
    for (const partId of chain.partIds) {
      if (!partMap.has(partId)) {
        errors.push(`零件 ${partId} 不存在`);
      }
    }

    // 檢查連接數量
    if (chain.connections.length !== chain.partIds.length - 1) {
      errors.push(`連接數量不正確：期望 ${chain.partIds.length - 1}，實際 ${chain.connections.length}`);
    }

    // 檢查連接的連續性
    for (let i = 0; i < chain.connections.length; i++) {
      const connection = chain.connections[i];
      const expectedFromPart = chain.partIds[i];
      const expectedToPart = chain.partIds[i + 1];

      if (connection.fromPartId !== expectedFromPart || connection.toPartId !== expectedToPart) {
        errors.push(`連接 ${i} 的零件ID不匹配`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}