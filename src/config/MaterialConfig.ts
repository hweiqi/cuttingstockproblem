/**
 * 標準材料長度配置
 */
export const STANDARD_MATERIAL_LENGTHS = [6000, 9000, 10000, 12000, 15000] as const;

export type StandardMaterialLength = typeof STANDARD_MATERIAL_LENGTHS[number];

/**
 * 材料配置介面
 */
export interface MaterialConfig {
  availableLengths: readonly number[];
  defaultQuantity: number;
}

/**
 * 默認材料配置
 */
export const DEFAULT_MATERIAL_CONFIG: MaterialConfig = {
  availableLengths: STANDARD_MATERIAL_LENGTHS,
  defaultQuantity: 999 // 假設無限供應
};

/**
 * 驗證材料長度是否為標準長度
 */
export function isStandardLength(length: number): length is StandardMaterialLength {
  return (STANDARD_MATERIAL_LENGTHS as readonly number[]).includes(length);
}

/**
 * 獲取最接近的標準材料長度
 */
export function getNearestStandardLength(requiredLength: number): StandardMaterialLength {
  // 找到第一個大於或等於所需長度的標準材料
  for (const standardLength of STANDARD_MATERIAL_LENGTHS) {
    if (standardLength >= requiredLength) {
      return standardLength;
    }
  }
  // 如果沒有找到，返回最大的標準長度
  return STANDARD_MATERIAL_LENGTHS[STANDARD_MATERIAL_LENGTHS.length - 1];
}

/**
 * 計算材料利用率
 */
export function calculateMaterialUtilization(usedLength: number, materialLength: number): number {
  if (materialLength <= 0) return 0;
  if (usedLength <= 0) return 0;
  return Math.min(1, Math.abs(usedLength) / Math.abs(materialLength));
}

/**
 * 選擇最佳材料長度
 * @param requiredLength 所需長度（包含所有損耗）
 * @param targetUtilization 目標利用率（默認85%）
 * @returns 最佳材料長度
 */
export function selectOptimalMaterialLength(
  requiredLength: number, 
  targetUtilization: number = 0.85
): StandardMaterialLength {
  if (requiredLength <= 0) {
    return STANDARD_MATERIAL_LENGTHS[0];
  }

  // 如果超過最大長度，返回最大長度
  if (requiredLength > STANDARD_MATERIAL_LENGTHS[STANDARD_MATERIAL_LENGTHS.length - 1]) {
    return STANDARD_MATERIAL_LENGTHS[STANDARD_MATERIAL_LENGTHS.length - 1];
  }

  let bestLength: StandardMaterialLength = STANDARD_MATERIAL_LENGTHS[0];
  let bestUtilization = 0;

  for (const length of STANDARD_MATERIAL_LENGTHS) {
    if (length >= requiredLength) {
      const utilization = requiredLength / length;
      
      // 如果利用率超過目標，直接選擇第一個滿足的
      if (utilization >= targetUtilization) {
        return length;
      }
      
      // 否則記錄利用率最高的
      if (utilization > bestUtilization) {
        bestUtilization = utilization;
        bestLength = length;
      }
    }
  }

  return bestLength;
}