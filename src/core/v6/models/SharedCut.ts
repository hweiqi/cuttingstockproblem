import { AnglePositionType } from './Part';

/**
 * 角度位置（已棄用，使用 AnglePositionType）
 */
export type AnglePosition = AnglePositionType;

/**
 * 角度匹配結果
 */
export interface AngleMatch {
  part1Id: string;              // 第一個零件ID
  part2Id: string;              // 第二個零件ID
  part1Position: AnglePosition; // 第一個零件的角度位置
  part2Position: AnglePosition; // 第二個零件的角度位置
  angle: number;                // 匹配的角度值
  isExactMatch: boolean;        // 是否完全匹配
  angleDifference?: number;     // 角度差異（如果不是完全匹配）
  averageAngle?: number;        // 平均角度（如果不是完全匹配）
  savings: number;              // 節省的材料長度
  score: number;                // 匹配分數（用於排序）
}

/**
 * 共刀配對
 */
export interface SharedCutPair {
  part1: {
    id: string;
    instanceId: number;
    position: AnglePosition;
  };
  part2: {
    id: string;
    instanceId: number;
    position: AnglePosition;
  };
  sharedAngle: number;
  savings: number;
}

/**
 * 計算共刀節省量
 * @param angle 共刀角度
 * @param thickness 材料厚度
 * @returns 節省的長度
 */
export function calculateSharedCutSavings(angle: number, thickness: number): number {
  if (angle <= 0 || angle >= 90) {
    return 0;
  }
  
  // 基於角度和厚度計算節省量
  const radians = (angle * Math.PI) / 180;
  const savings = thickness / Math.sin(radians);
  
  // 限制最大節省量，避免不合理的值
  return Math.min(savings, thickness * 3);
}

/**
 * 計算匹配分數
 * @param match 角度匹配
 * @returns 分數（越高越好）
 */
export function calculateMatchScore(match: AngleMatch): number {
  let score = match.savings;
  
  // 完全匹配獲得額外分數
  if (match.isExactMatch) {
    score *= 1.2;
  } else {
    // 根據角度差異減少分數
    const penalty = (match.angleDifference || 0) * 2;
    score = Math.max(score - penalty, score * 0.5);
  }
  
  return score;
}