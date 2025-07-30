import { PartWithQuantity, Part, PartInstance, AnglePositionType } from '../models/Part';
import { SharedCutChain, ChainPart, ChainConnection, ChainBuildReport, determineChainStructure } from '../models/Chain';
import { OptimizedFlexibleAngleMatcher } from '../matching/OptimizedFlexibleAngleMatcher';
import { AngleMatch } from '../models/SharedCut';

interface ChainBuildResult {
  chains: SharedCutChain[];
  report: ChainBuildReport;
}

interface ChainCandidate {
  parts: PartInstance[];
  connections: ChainConnection[];
  estimatedSavings: number;
  estimatedLength: number;
}

type ProgressCallback = (progress: number) => void;

/**
 * 優化版動態共刀鏈構建器
 * 使用貪心算法和增量式構建來提升效能
 */
export class OptimizedDynamicChainBuilder {
  private matcher: OptimizedFlexibleAngleMatcher;
  private chainIdCounter = 0;
  private readonly MAX_CHAIN_SIZE = 50;
  private readonly MAX_CHAIN_LENGTH = 15000 - 50;
  private readonly BATCH_PROCESSING_SIZE = 1000; // 批次處理大小
  private readonly MIN_CHAIN_EFFICIENCY = 0.7; // 最小鏈效率

  constructor(angleTolerance?: number) {
    this.matcher = new OptimizedFlexibleAngleMatcher(angleTolerance);
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
    return this.buildChainsWithProgress(parts);
  }

  /**
   * 構建共刀鏈並支援進度回調
   */
  buildChainsWithProgress(
    parts: PartWithQuantity[],
    onProgress?: ProgressCallback
  ): ChainBuildResult {
    const startTime = Date.now();
    
    // 展開零件實例
    const instances = this.expandPartInstances(parts);
    
    // 過濾出有斜切角度的零件
    const angledInstances = instances.filter(inst => 
      Object.values(inst.part.angles).some(angle => angle > 0 && angle < 90)
    );
    
    if (angledInstances.length === 0) {
      return {
        chains: [],
        report: this.createEmptyReport(instances.length, Date.now() - startTime)
      };
    }
    
    // 分批處理大量零件
    if (angledInstances.length > this.BATCH_PROCESSING_SIZE) {
      return this.processByBatches(angledInstances, instances.length, startTime, onProgress);
    }
    
    // 正常處理
    return this.processNormally(angledInstances, instances.length, startTime, onProgress);
  }

  /**
   * 分批處理大量零件
   */
  private processByBatches(
    angledInstances: PartInstance[],
    totalParts: number,
    startTime: number,
    onProgress?: ProgressCallback
  ): ChainBuildResult {
    const chains: SharedCutChain[] = [];
    const usedInstances = new Set<string>();
    
    // 預先分組以提升效能
    const partGroups = this.groupInstancesByPartType(angledInstances);
    const sortedGroups = Array.from(partGroups.values())
      .sort((a, b) => b.length - a.length);
    
    let processedParts = 0;
    const totalAngledParts = angledInstances.length;
    
    // 優先處理大組（批次共刀）
    for (const group of sortedGroups) {
      if (group.length >= 2) {
        const batchChains = this.buildOptimizedBatchChains(group, usedInstances);
        chains.push(...batchChains);
        
        processedParts += group.reduce((sum, inst) => 
          usedInstances.has(this.getInstanceKey(inst)) ? sum + 1 : sum, 0
        );
        
        if (onProgress) {
          onProgress((processedParts / totalAngledParts) * 100);
        }
      }
    }
    
    // 處理剩餘的混合共刀
    const remainingInstances = angledInstances.filter(inst => 
      !usedInstances.has(this.getInstanceKey(inst))
    );
    
    if (remainingInstances.length > 0) {
      const mixedChains = this.buildOptimizedMixedChains(
        remainingInstances, 
        usedInstances,
        (progress) => {
          if (onProgress) {
            const overallProgress = ((processedParts + progress * remainingInstances.length / 100) / totalAngledParts) * 100;
            onProgress(overallProgress);
          }
        }
      );
      chains.push(...mixedChains);
    }
    
    // 優化所有鏈
    chains.forEach(chain => {
      chain.isOptimized = true;
      chain.structure = determineChainStructure(chain);
    });
    
    const endTime = Date.now();
    
    return {
      chains,
      report: this.createReport(totalParts, chains, endTime - startTime)
    };
  }

  /**
   * 正常處理（少量零件）
   */
  private processNormally(
    angledInstances: PartInstance[],
    totalParts: number,
    startTime: number,
    onProgress?: ProgressCallback
  ): ChainBuildResult {
    const chains: SharedCutChain[] = [];
    const usedInstances = new Set<string>();
    
    // 策略選擇
    const partTypes = new Set(angledInstances.map(inst => inst.part.id));
    const shouldPrioritizeMixed = partTypes.size > 1 && partTypes.size <= 5;
    
    if (shouldPrioritizeMixed) {
      // 優先混合共刀
      const mixedChains = this.buildOptimizedMixedChains(angledInstances, usedInstances, onProgress);
      chains.push(...mixedChains);
      
      // 處理剩餘的相同零件
      const remainingInstances = angledInstances.filter(inst => 
        !usedInstances.has(this.getInstanceKey(inst))
      );
      if (remainingInstances.length > 0) {
        const batchChains = this.buildOptimizedBatchChains(remainingInstances, usedInstances);
        chains.push(...batchChains);
      }
    } else {
      // 優先批次共刀
      const partGroups = this.groupInstancesByPartType(angledInstances);
      for (const group of partGroups.values()) {
        if (group.length >= 2) {
          const batchChains = this.buildOptimizedBatchChains(group, usedInstances);
          chains.push(...batchChains);
        }
      }
      
      // 處理剩餘零件
      const remainingInstances = angledInstances.filter(inst => 
        !usedInstances.has(this.getInstanceKey(inst))
      );
      
      if (remainingInstances.length > 0) {
        const mixedChains = this.buildOptimizedMixedChains(remainingInstances, usedInstances);
        chains.push(...mixedChains);
      }
    }
    
    // 優化每個鏈
    chains.forEach(chain => {
      chain.isOptimized = true;
      chain.structure = determineChainStructure(chain);
    });
    
    const endTime = Date.now();
    
    if (onProgress) {
      onProgress(100);
    }
    
    return {
      chains,
      report: this.createReport(totalParts, chains, endTime - startTime)
    };
  }

  /**
   * 構建優化的批次共刀鏈
   */
  private buildOptimizedBatchChains(
    instances: PartInstance[],
    usedInstances: Set<string>
  ): SharedCutChain[] {
    const chains: SharedCutChain[] = [];
    
    // 按零件類型分組
    const partGroups = this.groupInstancesByPartType(instances);
    
    for (const [_, group] of partGroups) {
      const availableInstances = group.filter(inst => 
        !usedInstances.has(this.getInstanceKey(inst))
      );
      
      if (availableInstances.length < 2) continue;
      
      // 找出最佳共刀角度
      const part = availableInstances[0].part;
      const bestAngle = this.findBestSharedAngle(part);
      if (!bestAngle) continue;
      
      // 計算最優批次大小
      const optimalBatchSize = this.calculateOptimalBatchSize(
        availableInstances,
        bestAngle.savings
      );
      
      // 創建批次鏈
      for (let i = 0; i < availableInstances.length; i += optimalBatchSize) {
        const batch = availableInstances.slice(i, Math.min(i + optimalBatchSize, availableInstances.length));
        
        if (batch.length >= 2) {
          const chain = this.createOptimizedBatchChain(batch, bestAngle);
          if (chain && this.isChainEfficient(chain)) {
            chains.push(chain);
            batch.forEach(inst => usedInstances.add(this.getInstanceKey(inst)));
          }
        }
      }
    }
    
    return chains;
  }

  /**
   * 構建優化的混合共刀鏈
   */
  private buildOptimizedMixedChains(
    instances: PartInstance[],
    usedInstances: Set<string>,
    onProgress?: (progress: number) => void
  ): SharedCutChain[] {
    const chains: SharedCutChain[] = [];
    const remaining = instances.filter(inst => 
      !usedInstances.has(this.getInstanceKey(inst))
    );
    
    // 使用貪心算法構建鏈
    let processed = 0;
    const total = remaining.length;
    
    while (remaining.length >= 2) {
      const chain = this.buildGreedyChain(remaining, usedInstances);
      
      if (chain && chain.parts.length >= 2 && this.isChainEfficient(chain)) {
        chains.push(chain);
        
        // 從剩餘列表中移除已使用的實例
        const usedInChain = new Set(chain.parts.map(p => `${p.partId}_${p.instanceId}`));
        let i = remaining.length;
        while (i--) {
          const key = this.getInstanceKey(remaining[i]);
          if (usedInChain.has(key)) {
            remaining.splice(i, 1);
          }
        }
      } else {
        break;
      }
      
      processed = total - remaining.length;
      if (onProgress) {
        onProgress((processed / total) * 100);
      }
    }
    
    return chains;
  }

  /**
   * 使用貪心算法構建單個鏈
   */
  private buildGreedyChain(
    candidates: PartInstance[],
    globalUsedInstances: Set<string>
  ): SharedCutChain | null {
    if (candidates.length < 2) return null;
    
    const parts: ChainPart[] = [];
    const connections: ChainConnection[] = [];
    const chainInstances: PartInstance[] = [];
    const localUsedInstances = new Set<string>();
    
    // 選擇最佳起始零件（使用快速評估）
    const availableForStart = candidates.filter(inst => 
      !globalUsedInstances.has(this.getInstanceKey(inst))
    );
    
    const start = this.selectBestStartingPart(availableForStart);
    if (!start) return null;
    
    parts.push({
      partId: start.part.id,
      instanceId: start.instanceId,
      position: 0
    });
    chainInstances.push(start);
    localUsedInstances.add(this.getInstanceKey(start));
    
    // 貪心構建鏈
    let current = start;
    let position = 1;
    let totalSavings = 0;
    
    while (parts.length < this.MAX_CHAIN_SIZE) {
      const availableCandidates = candidates.filter(inst => {
        const key = this.getInstanceKey(inst);
        return !globalUsedInstances.has(key) && !localUsedInstances.has(key);
      });
      
      if (availableCandidates.length === 0) break;
      
      // 找最佳匹配
      const bestMatch = this.matcher.findBestMatchForPart(
        current.part,
        availableCandidates.map(c => c.part)
      );
      
      if (!bestMatch || bestMatch.score < 10) break;
      
      // 找到對應的實例
      const bestInstance = availableCandidates.find(inst => 
        inst.part.id === bestMatch.part2Id
      );
      
      if (!bestInstance) break;
      
      // 檢查長度限制
      const newLength = this.estimateChainLength([...chainInstances, bestInstance], totalSavings + bestMatch.savings);
      if (newLength > this.MAX_CHAIN_LENGTH) break;
      
      // 添加到鏈
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
      
      chainInstances.push(bestInstance);
      localUsedInstances.add(this.getInstanceKey(bestInstance));
      totalSavings += bestMatch.savings;
      current = bestInstance;
      position++;
    }
    
    if (parts.length < 2) return null;
    
    // 標記為已使用
    for (const inst of chainInstances) {
      globalUsedInstances.add(this.getInstanceKey(inst));
    }
    
    const totalLength = chainInstances.reduce((sum, inst) => sum + inst.part.length, 0) - totalSavings;
    
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
   * 選擇最佳起始零件
   */
  private selectBestStartingPart(candidates: PartInstance[]): PartInstance | null {
    if (candidates.length === 0) return null;
    
    // 快速評估：選擇有最多斜切角度的零件
    let bestPart = candidates[0];
    let bestScore = 0;
    
    for (const candidate of candidates.slice(0, Math.min(10, candidates.length))) {
      const angles = Object.values(candidate.part.angles);
      const bevelCount = angles.filter(a => a > 0 && a < 90).length;
      const avgAngle = angles.reduce((sum, a) => sum + (a < 90 ? 90 - a : 0), 0) / 4;
      const score = bevelCount * 100 + avgAngle;
      
      if (score > bestScore) {
        bestScore = score;
        bestPart = candidate;
      }
    }
    
    return bestPart;
  }

  /**
   * 創建優化的批次鏈
   */
  private createOptimizedBatchChain(
    instances: PartInstance[],
    bestAngle: { angle: number; position: string; savings: number }
  ): SharedCutChain | null {
    if (instances.length < 2) return null;
    
    const parts: ChainPart[] = [];
    const connections: ChainConnection[] = [];
    
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
    
    const totalSavings = connections.length * bestAngle.savings;
    const totalLength = instances.reduce((sum, inst) => sum + inst.part.length, 0) - totalSavings;
    
    return {
      id: `chain_${this.chainIdCounter++}`,
      parts,
      connections,
      totalLength,
      totalSavings,
      structure: 'batch',
      isOptimized: false
    };
  }

  /**
   * 計算最優批次大小
   */
  private calculateOptimalBatchSize(instances: PartInstance[], savingsPerConnection: number): number {
    const partLength = instances[0].part.length;
    const maxParts = Math.floor(this.MAX_CHAIN_LENGTH / (partLength - savingsPerConnection));
    return Math.min(this.MAX_CHAIN_SIZE, maxParts, instances.length);
  }

  /**
   * 檢查鏈是否高效
   */
  private isChainEfficient(chain: SharedCutChain): boolean {
    if (chain.parts.length < 2) return false;
    
    // 鏈至少要有一定的節省量才算高效
    if (chain.totalSavings < 10) return false;
    
    // 批次鏈總是高效的
    if (chain.structure === 'batch') return true;
    
    // 混合鏈需要有合理的節省比例
    const savingsPerPart = chain.totalSavings / chain.parts.length;
    return savingsPerPart >= 5; // 每個零件至少節省5mm
  }

  /**
   * 估算鏈長度
   */
  private estimateChainLength(instances: PartInstance[], totalSavings: number): number {
    const totalPartsLength = instances.reduce((sum, inst) => sum + inst.part.length, 0);
    return totalPartsLength - totalSavings + 30; // 加上前後端損耗
  }

  /**
   * 按零件類型分組實例
   */
  private groupInstancesByPartType(instances: PartInstance[]): Map<string, PartInstance[]> {
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
    const actualThickness = thickness || 20;
    const radians = (angle * Math.PI) / 180;
    const savings = actualThickness / Math.sin(radians);
    
    const minSavings = 5;
    const maxSavings = actualThickness * 2;
    
    return Math.max(minSavings, Math.min(savings, maxSavings));
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
   * 獲取實例的唯一鍵
   */
  private getInstanceKey(instance: PartInstance): string {
    return `${instance.part.id}_${instance.instanceId}`;
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