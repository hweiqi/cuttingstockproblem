export interface Material {
  id: string;
  length: number;
  quantity?: number;
}

export interface PartAngles {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
}

export interface Part {
  id: string;
  length: number;
  quantity: number;
  angles?: PartAngles;
  thickness?: number;
}

export interface CutPlan {
  materialId: string;
  materialLength: number;
  parts: PlacedPart[];
  wasteLength: number;
  efficiency: number;
  sharedCutPairs?: Array<{
    part1Id: string;
    part2Id: string;
    savings: number;
    part1Angles?: PartAngles;
    part2Angles?: PartAngles;
    matchedAngle?: number;
  }>;
  // V6 specific fields
  cuts?: Array<{
    partId: string;
    position: number;
    length: number;
    isSharedCut?: boolean;
  }>;
  utilization?: number;
  waste?: number;
  instanceId?: number;
  isVirtual?: boolean;
}

export interface PlacedPart {
  partId: string;
  length: number;
  position: number;
  isSharedCut?: boolean;
  sharedWith?: string;
  angleSavings?: number;
  part1Angles?: PartAngles;
  part2Angles?: PartAngles;
  matchedAngle?: number;
  part1Thickness?: number;
  part2Thickness?: number;
}

export interface CuttingResult {
  cutPlans: CutPlan[];
  totalMaterialsUsed: number;
  totalWaste: number;
  overallEfficiency: number;
  executionTime: number;
  unplacedParts: Part[];
  sharedCutSummary?: {
    totalPairs: number;
    totalSavings: number;
    pairs: SharedCutPair[];
  };
  // V6 specific fields
  totalParts?: number;
  placedParts?: number;
  averageUtilization?: number;
  report?: string;
  warnings?: string[];
  sharedCuttingInfo?: {
    totalSharedCuts: number;
    totalSavings: number;
  };
}

export interface CuttingOptions {
  cuttingLoss: number;
  frontCuttingLoss?: number;
  rearCuttingLoss?: number;
  enableSharedCutting?: boolean;
}

export type FlipDirection = 'horizontal' | 'vertical' | 'both';

export interface SharedCutMatchInfo {
  part1Side: 'left' | 'right';
  part2Side: 'left' | 'right';
  requiresFlip: boolean;
  flipDirection?: FlipDirection;
  angleDifference: number;
}

export interface SharedCutPair {
  part1Id: string;
  part2Id: string;
  sharedEdge: string;
  angleDifference: number;
  savings: number;
  requiresFlip?: boolean;
  flipDirection?: FlipDirection;
  quantity: number;
  matchedAngle?: number;
}

export interface SharedCuttingOptimizationResult {
  sharedCutPairs: SharedCutPair[];
  remainingParts: Part[];
  totalSavings: number;
}

// New types for multi-part shared cutting chains
export interface SharedCutConnection {
  fromPartId: string;
  toPartId: string;
  fromSide: 'left' | 'right';
  toSide: 'left' | 'right';
  savings: number;
  matchedAngle: number;
  requiresFlip?: boolean;
  flipDirection?: FlipDirection;
}

export interface SharedCutChain {
  id: string;
  partIds: string[]; // Ordered list of parts in the chain
  connections: SharedCutConnection[];
  totalLength: number;
  totalSavings: number;
  quantity: number;
}

export interface PartConnectionInfo {
  partId: string;
  side: 'left' | 'right';
  angle: number;
  isConnected: boolean;
  connectedTo?: {
    partId: string;
    side: 'left' | 'right';
    savings: number;
  };
}

export interface SharedCuttingChainResult {
  chains: SharedCutChain[];
  remainingParts: Part[];
  totalSavings: number;
  connectionGraph?: Map<string, PartConnectionInfo[]>;
}