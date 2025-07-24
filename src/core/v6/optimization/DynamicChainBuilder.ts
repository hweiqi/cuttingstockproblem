import { PartWithQuantity, Part, PartInstance, AnglePositionType } from '../models/Part';
import { SharedCutChain, ChainPart, ChainConnection, ChainBuildReport, determineChainStructure } from '../models/Chain';
import { FlexibleAngleMatcher } from '../matching/FlexibleAngleMatcher';
import { AngleMatch } from '../models/SharedCut';

interface ChainBuildResult {
  chains: SharedCutChain[];
  report: ChainBuildReport;
}

/**
 * 動態共刀鏈構建器
 * 能夠構建包含多種零件和角度的複雜共刀鏈
 */
export class DynamicChainBuilder {
  private matcher: FlexibleAngleMatcher;
  private chainIdCounter = 0;
  private readonly MAX_CHAIN_SIZE = 50; // 單個鏈的最大零件數

  constructor(angleTolerance?: number) {
    this.matcher = new FlexibleAngleMatcher(angleTolerance);
  }

  /**
   * 構建共刀鏈
   */
  buildChains(parts: PartWithQuantity[]): SharedCutChain[] {
    const result = this.buildChainsWithReport(parts);
    return result.chains;
  }

  /**
   * 構建共刀鏈並返回詳細報告
   */
  buildChainsWithReport(parts: PartWithQuantity[]): ChainBuildResult {
    const startTime = performance.now();
    
    // 展開零件實例
    const instances = this.expandPartInstances(parts);
    
    // 過濾出有斜切角度的零件
    const angledInstances = instances.filter(inst => 
      Object.values(inst.part.angles).some(angle => angle > 0 && angle < 90)
    );
    
    if (angledInstances.length === 0) {
      return {
        chains: [],
        report: this.createEmptyReport(instances.length, performance.now() - startTime)
      };
    }
    
    // 構建共刀鏈
    const chains: SharedCutChain[] = [];
    const usedInstances = new Set<string>();
    
    // 策略選擇：根據零件多樣性決定策略
    const partTypes = new Set(angledInstances.map(inst => inst.part.id));
    const shouldPrioritizeMixed = partTypes.size > 1 && partTypes.size <= 5;
    
    if (shouldPrioritizeMixed) {
      // 優先混合共刀
      const mixedChains = this.buildMixedChains(angledInstances, usedInstances);
      chains.push(...mixedChains);
      
      // 處理剩餘的相同零件
      const remainingInstances = angledInstances.filter(inst => 
        !usedInstances.has(this.getInstanceKey(inst))
      );
      if (remainingInstances.length > 0) {
        const batchChains = this.buildBatchChains(remainingInstances, usedInstances);
        chains.push(...batchChains);
      }
    } else {
      // 優先批次共刀
      const batchChains = this.buildBatchChains(angledInstances, usedInstances);
      chains.push(...batchChains);
      
      // 處理剩餘零件的混合共刀
      const remainingInstances = angledInstances.filter(inst => 
        !usedInstances.has(this.getInstanceKey(inst))
      );
      
      if (remainingInstances.length > 0) {
        const mixedChains = this.buildMixedChains(remainingInstances, usedInstances);
        chains.push(...mixedChains);
      }
    }
    
    // 優化每個鏈
    chains.forEach(chain => {
      chain.isOptimized = true;
      chain.structure = determineChainStructure(chain);
    });
    
    const endTime = performance.now();
    
    return {
      chains,
      report: this.createReport(instances.length, chains, endTime - startTime)
    };
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
   * 構建相同零件的批次共刀鏈
   */
  private buildBatchChains(
    instances: PartInstance[],
    usedInstances: Set<string>
  ): SharedCutChain[] {
    const chains: SharedCutChain[] = [];
    const partGroups = this.groupByPartId(instances);
    
    for (const [partId, group] of partGroups) {
      if (group.length < 2) continue;
      
      // 將大組分成合理大小的鏈
      const batchSize = Math.min(this.MAX_CHAIN_SIZE, group.length);
      
      for (let i = 0; i < group.length; i += batchSize) {
        const batch = group.slice(i, Math.min(i + batchSize, group.length));
        
        if (batch.length >= 2) {
          const chain = this.createBatchChain(batch);
          if (chain) {
            chains.push(chain);
            batch.forEach(inst => usedInstances.add(this.getInstanceKey(inst)));
          }
        }
      }
    }
    
    return chains;
  }

  /**
   * 構建混合零件的共刀鏈
   */
  private buildMixedChains(
    instances: PartInstance[],
    usedInstances: Set<string>
  ): SharedCutChain[] {
    const chains: SharedCutChain[] = [];
    const remaining = [...instances];
    
    while (remaining.length >= 2) {
      const chain = this.buildBestChain(remaining);
      
      if (chain && chain.parts.length >= 2) {
        chains.push(chain);
        
        // 標記已使用的實例
        chain.parts.forEach(part => {
          const inst = remaining.find(r => 
            r.part.id === part.partId && r.instanceId === part.instanceId
          );
          if (inst) {
            usedInstances.add(this.getInstanceKey(inst));
            const index = remaining.indexOf(inst);
            if (index > -1) {
              remaining.splice(index, 1);
            }
          }
        });
      } else {
        break;
      }
    }
    
    return chains;
  }

  /**
   * 創建批次共刀鏈
   */
  private createBatchChain(instances: PartInstance[]): SharedCutChain | null {
    if (instances.length < 2) return null;
    
    const part = instances[0].part;
    const parts: ChainPart[] = [];
    const connections: ChainConnection[] = [];
    
    // 找出最佳的共刀角度
    const bestAngle = this.findBestSharedAngle(part);
    if (!bestAngle) return null;
    
    // 構建線性鏈
    for (let i = 0; i < instances.length; i++) {
      parts.push({
        partId: instances[i].part.id,
        instanceId: instances[i].instanceId,
        position: i
      });
      
      if (i > 0) {
        connections.push({
          fromPart: {
            partId: instances[i-1].part.id,
            instanceId: instances[i-1].instanceId,
            anglePosition: bestAngle.position as AnglePositionType
          },
          toPart: {
            partId: instances[i].part.id,
            instanceId: instances[i].instanceId,
            anglePosition: bestAngle.position as AnglePositionType
          },
          sharedAngle: bestAngle.angle,
          savings: bestAngle.savings
        });
      }
    }
    
    const totalSavings = connections.reduce((sum, conn) => sum + conn.savings, 0);
    
    return {
      id: `chain_${this.chainIdCounter++}`,
      parts,
      connections,
      totalLength: part.length * instances.length - totalSavings,
      totalSavings,
      structure: 'batch',
      isOptimized: false
    };
  }

  /**
   * 構建最佳的混合鏈
   */
  private buildBestChain(instances: PartInstance[]): SharedCutChain | null {
    if (instances.length < 2) return null;
    
    const parts: ChainPart[] = [];
    const connections: ChainConnection[] = [];
    const used = new Set<string>();
    
    // 選擇起始零件（選擇有最多匹配可能的）
    let bestStart = instances[0];
    let bestStartMatches = 0;
    
    for (const inst of instances) {
      const matches = this.matcher.evaluateSharedCuttingPotential(
        [inst.part, ...instances.filter(i => i !== inst).map(i => i.part)]
      );
      if (matches.matchCount > bestStartMatches) {
        bestStartMatches = matches.matchCount;
        bestStart = inst;
      }
    }
    
    const start = bestStart;
    parts.push({
      partId: start.part.id,
      instanceId: start.instanceId,
      position: 0
    });
    used.add(this.getInstanceKey(start));
    
    // 貪心算法：每次選擇最佳匹配
    let current = start;
    let position = 1;
    
    while (parts.length < this.MAX_CHAIN_SIZE && used.size < instances.length) {
      const candidates = instances.filter(inst => 
        !used.has(this.getInstanceKey(inst))
      );
      
      if (candidates.length === 0) break;
      
      // 嘗試找到最佳匹配
      let bestMatch: AngleMatch | null = null;
      let bestInstance: PartInstance | null = null;
      
      for (const candidate of candidates) {
        const matches = this.matcher.findMatches(current.part, candidate.part);
        if (matches.length > 0 && (!bestMatch || matches[0].score > bestMatch.score)) {
          bestMatch = matches[0];
          bestInstance = candidate;
        }
      }
      
      if (!bestMatch || !bestInstance || bestMatch.score < 5) break; // 分數太低則停止
      
      // 添加到鏈中
      parts.push({
        partId: bestInstance.part.id,
        instanceId: bestInstance.instanceId,
        position
      });
      
      connections.push({
        fromPart: {
          partId: current.part.id,
          instanceId: current.instanceId,
          anglePosition: bestMatch.part1Position
        },
        toPart: {
          partId: bestInstance.part.id,
          instanceId: bestInstance.instanceId,
          anglePosition: bestMatch.part2Position
        },
        sharedAngle: bestMatch.angle,
        savings: bestMatch.savings
      });
      
      used.add(this.getInstanceKey(bestInstance));
      current = bestInstance;
      position++;
    }
    
    if (parts.length < 2) return null;
    
    const totalSavings = connections.reduce((sum, conn) => sum + conn.savings, 0);
    const totalLength = this.calculateChainLength(parts, instances) - totalSavings;
    
    return {
      id: `chain_${this.chainIdCounter++}`,
      parts,
      connections,
      totalLength,
      totalSavings,
      structure: 'mixed',
      isOptimized: false
    };
  }

  /**
   * 找出零件的最佳共刀角度
   */
  private findBestSharedAngle(part: Part): {
    angle: number;
    position: string;
    savings: number;
  } | null {
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;
    let bestAngle = null;
    let bestSavings = 0;
    
    for (const pos of positions) {
      const angle = part.angles[pos];
      if (angle > 0 && angle < 90) {
        const savings = this.calculateAngleSavings(angle, part.thickness);
        if (savings > bestSavings) {
          bestSavings = savings;
          bestAngle = { angle, position: pos, savings };
        }
      }
    }
    
    return bestAngle;
  }

  /**
   * 計算角度節省量
   */
  private calculateAngleSavings(angle: number, thickness: number): number {
    const radians = (angle * Math.PI) / 180;
    const savings = thickness / Math.sin(radians);
    return Math.min(savings, thickness * 3);
  }

  /**
   * 按零件ID分組
   */
  private groupByPartId(instances: PartInstance[]): Map<string, PartInstance[]> {
    const groups = new Map<string, PartInstance[]>();
    
    for (const inst of instances) {
      const key = inst.part.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(inst);
    }
    
    return groups;
  }

  /**
   * 獲取實例的唯一鍵
   */
  private getInstanceKey(instance: PartInstance): string {
    return `${instance.part.id}_${instance.instanceId}`;
  }

  /**
   * 計算鏈的總長度
   */
  private calculateChainLength(parts: ChainPart[], instances: PartInstance[]): number {
    let totalLength = 0;
    
    for (const part of parts) {
      const inst = instances.find(i => 
        i.part.id === part.partId && i.instanceId === part.instanceId
      );
      if (inst) {
        totalLength += inst.part.length;
      }
    }
    
    return totalLength;
  }

  /**
   * 創建空報告
   */
  private createEmptyReport(totalParts: number, processingTime: number): ChainBuildReport {
    return {
      totalParts,
      totalChains: 0,
      totalSavings: 0,
      averageSavingsPerPart: 0,
      processingTime,
      chainDistribution: {
        linear: 0,
        mixed: 0,
        complex: 0,
        batch: 0
      }
    };
  }

  /**
   * 創建報告
   */
  private createReport(
    totalParts: number,
    chains: SharedCutChain[],
    processingTime: number
  ): ChainBuildReport {
    const totalSavings = chains.reduce((sum, chain) => sum + chain.totalSavings, 0);
    const partsInChains = chains.reduce((sum, chain) => sum + chain.parts.length, 0);
    
    const distribution = {
      linear: 0,
      mixed: 0,
      complex: 0,
      batch: 0
    };
    
    for (const chain of chains) {
      distribution[chain.structure]++;
    }
    
    return {
      totalParts,
      totalChains: chains.length,
      totalSavings,
      averageSavingsPerPart: partsInChains > 0 ? totalSavings / partsInChains : 0,
      processingTime,
      chainDistribution: distribution
    };
  }
}