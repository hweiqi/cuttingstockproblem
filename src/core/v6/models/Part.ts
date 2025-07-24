/**
 * 零件角度定義
 */
export interface PartAngles {
  topLeft: number;      // 左上角角度
  topRight: number;     // 右上角角度
  bottomLeft: number;   // 左下角角度
  bottomRight: number;  // 右下角角度
}

/**
 * 零件定義
 */
export interface Part {
  id: string;           // 零件ID
  length: number;       // 零件長度
  angles: PartAngles;   // 四個角的角度
  thickness: number;    // 零件厚度
}

/**
 * 帶數量的零件
 */
export interface PartWithQuantity extends Part {
  quantity: number;     // 零件數量
}

/**
 * 零件實例（用於區分相同ID的不同實例）
 */
export interface PartInstance {
  part: Part;          // 零件定義
  instanceId: number;  // 實例ID
}

/**
 * 零件方向
 */
export type PartOrientation = 'normal' | 'flipped';

/**
 * 判斷角度是否為斜切角度
 */
export function isBevelAngle(angle: number): boolean {
  return angle > 0 && angle < 90;
}

/**
 * 獲取零件的所有斜切角度
 */
export function getBevelAngles(part: Part): number[] {
  const angles: number[] = [];
  
  if (isBevelAngle(part.angles.topLeft)) angles.push(part.angles.topLeft);
  if (isBevelAngle(part.angles.topRight)) angles.push(part.angles.topRight);
  if (isBevelAngle(part.angles.bottomLeft)) angles.push(part.angles.bottomLeft);
  if (isBevelAngle(part.angles.bottomRight)) angles.push(part.angles.bottomRight);
  
  return angles;
}

/**
 * 角度位置類型
 */
export type AnglePositionType = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';