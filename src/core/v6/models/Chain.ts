import { AnglePosition } from './SharedCut';

/**
 * 鏈中的零件
 */
export interface ChainPart {
  partId: string;
  instanceId: number;
  position: number; // 在鏈中的位置索引
}

/**
 * 鏈中的連接
 */
export interface ChainConnection {
  fromPart: {
    partId: string;
    instanceId: number;
    anglePosition: AnglePosition;
  };
  toPart: {
    partId: string;
    instanceId: number;
    anglePosition: AnglePosition;
  };
  sharedAngle: number;
  savings: number;
}

/**
 * 共刀鏈結構類型
 */
export type ChainStructure = 
  | 'linear'    // 線性鏈（A-B-C-D）
  | 'mixed'     // 混合鏈（不同類型零件）
  | 'complex'   // 複雜鏈（多種角度和零件）
  | 'batch';    // 批次鏈（大量相同零件）

/**
 * 共刀鏈
 */
export interface SharedCutChain {
  id: string;
  parts: ChainPart[];
  connections: ChainConnection[];
  totalLength: number;
  totalSavings: number;
  structure: ChainStructure;
  isOptimized: boolean;
}

/**
 * 鏈構建報告
 */
export interface ChainBuildReport {
  totalParts: number;
  totalChains: number;
  totalSavings: number;
  averageSavingsPerPart: number;
  processingTime: number;
  chainDistribution: {
    linear: number;
    mixed: number;
    complex: number;
    batch: number;
  };
}

/**
 * 判斷鏈的結構類型
 */
export function determineChainStructure(chain: SharedCutChain): ChainStructure {
  const partTypes = new Set(chain.parts.map(p => p.partId));
  
  // 如果只有一種零件類型
  if (partTypes.size === 1) {
    if (chain.parts.length > 10) {
      return 'batch';
    }
    return 'linear';
  }
  
  // 如果有多種零件類型
  if (partTypes.size === 2) {
    return 'mixed';
  }
  
  // 3種或更多零件類型
  return 'complex';
}

/**
 * 計算鏈的總長度
 */
export function calculateChainTotalLength(
  chain: SharedCutChain,
  partLengths: Map<string, number>
): number {
  let totalLength = 0;
  
  for (const part of chain.parts) {
    const length = partLengths.get(part.partId) || 0;
    totalLength += length;
  }
  
  // 減去共刀節省的長度
  totalLength -= chain.totalSavings;
  
  return totalLength;
}