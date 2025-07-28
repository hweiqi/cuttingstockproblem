/**
 * 材料配置介面
 */
export interface MaterialConfig {
  availableLengths: readonly number[];
  defaultQuantity: number;
}

/**
 * 計算材料利用率
 */
export function calculateMaterialUtilization(usedLength: number, materialLength: number): number {
  if (materialLength <= 0) return 0;
  if (usedLength <= 0) return 0;
  return Math.min(1, Math.abs(usedLength) / Math.abs(materialLength));
}