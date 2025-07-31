/**
 * 切割庫存問題核心資料結構
 * 根據 problem.md 和 business-logic.md 設計
 */

/**
 * 母材設定
 * 僅需設定長度，可有複數種長度但不可重複，無數量限制
 */
export interface Material {
  id: string;
  length: number;
  // 母材沒有數量上限，系統會自動建立所需數量的母材實例
}

/**
 * 零件角度定義 - 四個角度位置
 * 角度值範圍：0° ~ 90°（不包含90°）
 * 0° 表示該位置無角度（直角）
 * 大於0° 表示該位置有斜切角度
 */
export interface PartAngles {
  topLeft: number;      // 左上角角度
  topRight: number;     // 右上角角度  
  bottomLeft: number;   // 左下角角度
  bottomRight: number;  // 右下角角度
}

/**
 * 零件設定
 * 需設定長度、數量、斜切角度
 */
export interface Part {
  id: string;
  length: number;       // 零件長度
  quantity: number;     // 零件數量
  angles: PartAngles;   // 四個角的角度
  thickness?: number;   // 零件厚度，用於共刀計算，預設10mm
}

/**
 * 系統設定
 */
export interface CuttingSettings {
  frontCuttingLoss: number;  // 前端切割損耗，預設10mm
  cuttingLoss: number;       // 零件間切割損耗，預設3mm
  angleTolerance: number;    // 角度容差，預設±10°
  maxChainLength: number;    // 共刀鏈最大長度，預設50
}

/**
 * 預設系統設定
 */
export const DEFAULT_CUTTING_SETTINGS: CuttingSettings = {
  frontCuttingLoss: 10,
  cuttingLoss: 3,
  angleTolerance: 10,
  maxChainLength: 50
};

/**
 * 共刀連接資訊
 */
export interface SharedCutConnection {
  fromPartId: string;
  toPartId: string;
  fromPosition: keyof PartAngles;   // 來源零件的角度位置
  toPosition: keyof PartAngles;     // 目標零件的角度位置
  sharedAngle: number;              // 共享角度值
  savings: number;                  // 節省量（mm）
}

/**
 * 共刀鏈
 * 多個零件可形成共刀鏈，實現連續的共刀優化
 */
export interface SharedCutChain {
  id: string;
  partIds: string[];                    // 鏈中零件ID列表（有序）
  connections: SharedCutConnection[];   // 零件間的共刀連接
  totalLength: number;                  // 鏈的總長度
  totalSavings: number;                 // 總節省量
  isMixedChain: boolean;                // 是否為混合零件鏈
}

/**
 * 已排放的零件
 */
export interface PlacedPart {
  partId: string;
  partInstanceIndex: number;    // 零件實例索引（用於區分相同零件的不同實例）
  materialId: string;
  materialInstanceIndex: number;    // 母材實例索引
  position: number;             // 在母材中的位置
  length: number;               // 零件長度
  isInSharedCutChain: boolean;  // 是否在共刀鏈中
  sharedCutInfo?: {
    chainId: string;
    positionInChain: number;    // 在鏈中的位置
    previousConnection?: SharedCutConnection;
    nextConnection?: SharedCutConnection;
  };
}

/**
 * 母材使用計劃
 */
export interface MaterialUsagePlan {
  materialId: string;
  materialInstanceIndex: number;
  materialLength: number;
  placedParts: PlacedPart[];
  usedLength: number;           // 已使用長度
  wasteLength: number;          // 廢料長度
  utilization: number;          // 利用率（0-1）
}

/**
 * 排版結果
 */
export interface CuttingResult {
  materialUsagePlans: MaterialUsagePlan[];
  sharedCutChains: SharedCutChain[];
  totalMaterialsUsed: number;
  totalWasteLength: number;
  totalSavingsFromSharedCuts: number;
  overallUtilization: number;
  allPartsPlaced: boolean;      // 是否所有零件都被排入
  unplacedParts: Array<{
    partId: string;
    instanceIndex: number;
    reason: string;
  }>;
  processingTime: number;       // 處理時間（毫秒）
  summary: {
    totalParts: number;
    sharedCutPairs: number;
    materialUtilization: string;    // 百分比字串，如 "85.6%"
  };
}

/**
 * 驗證角度是否為有效的斜切角度
 */
export function isValidBevelAngle(angle: number): boolean {
  return angle >= 0 && angle < 90;
}

/**
 * 檢查零件角度限制
 * 左側不能同時有上下角度（topLeft 和 bottomLeft 不能同時 > 0）
 * 右側不能同時有上下角度（topRight 和 bottomRight 不能同時 > 0）
 */
export function validatePartAngles(angles: PartAngles): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 檢查角度範圍
  Object.entries(angles).forEach(([position, angle]) => {
    if (!isValidBevelAngle(angle)) {
      errors.push(`${position} 角度必須在 0° 到 90° 之間（不包含90°）`);
    }
  });
  
  // 檢查左側角度限制
  if (angles.topLeft > 0 && angles.bottomLeft > 0) {
    errors.push('左側不能同時有上下角度（topLeft 和 bottomLeft 不能同時 > 0）');
  }
  
  // 檢查右側角度限制
  if (angles.topRight > 0 && angles.bottomRight > 0) {
    errors.push('右側不能同時有上下角度（topRight 和 bottomRight 不能同時 > 0）');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 計算共刀節省量
 * 公式：savings = sin(sharedAngle * π / 180) * minThickness
 */
export function calculateSharedCutSavings(sharedAngle: number, thickness1: number, thickness2: number): number {
  const minThickness = Math.min(thickness1, thickness2);
  return Math.sin((sharedAngle * Math.PI) / 180) * minThickness;
}

/**
 * 檢查兩個角度是否在容差範圍內可以匹配
 */
export function canAnglesMatch(angle1: number, angle2: number, tolerance: number): boolean {
  if (angle1 === 0 || angle2 === 0) return false;  // 0° 表示無角度，不能共刀
  return Math.abs(angle1 - angle2) <= tolerance;
}

/**
 * 角度匹配結果
 */
export interface AngleMatch {
  part1Position: keyof PartAngles;
  part2Position: keyof PartAngles;
  sharedAngle: number;
  savings: number;
}

/**
 * 零件匹配結果
 */
export interface PartMatch {
  part1Id: string;
  part2Id: string;
  bestAngleMatch: AngleMatch;
  allMatches: AngleMatch[];
}