/**
 * 材料定義
 */
export interface Material {
  id: string;          // 材料ID
  length: number;      // 材料長度
  quantity: number;    // 材料數量（0表示無限供應）
  originalId?: string; // 原始材料ID（用於追蹤動態創建的實例）
  isUnlimited?: boolean; // 是否為無限供應
}

/**
 * 材料實例
 */
export interface MaterialInstance {
  material: Material;
  instanceId: number;
  usedLength: number;
}

/**
 * 已放置的零件
 */
export interface PlacedPart {
  partId: string;
  partInstanceId: number;
  materialId: string;
  materialInstanceId: number;
  position: number;
  length: number;
  orientation: 'normal' | 'flipped';
  sharedCuttingInfo?: {
    pairedWithPartId: string;
    pairedWithInstanceId: number;
    sharedAngle: number;
    savings: number;
  };
}

/**
 * 排版結果
 */
export interface PlacementResult {
  placedParts: PlacedPart[];
  unplacedParts: Array<{
    partId: string;
    instanceId: number;
    reason: string;
  }>;
  usedMaterials: Array<{
    material: Material;
    instanceId: number;
    utilization: number;
  }>;
  totalSavings: number;
  success: boolean;
  warnings: string[];
  report: PlacementReport;
}

/**
 * 排版報告
 */
export interface PlacementReport {
  totalParts: number;
  totalMaterials: number;
  materialUtilization: number;
  wastePercentage: number;
  sharedCuttingPairs: number;
  processingTime: number;
  strategy: string;
}

/**
 * 排版約束
 */
export interface PlacementConstraints {
  cuttingLoss: number;     // 切割損耗
  frontEndLoss: number;    // 前端損耗
  backEndLoss: number;     // 後端損耗
  minPartSpacing?: number; // 最小零件間距
}