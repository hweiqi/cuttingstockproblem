/**
 * 標準材料長度配置
 */
export declare const STANDARD_MATERIAL_LENGTHS: readonly [6000, 9000, 10000, 12000, 15000];
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
export declare const DEFAULT_MATERIAL_CONFIG: MaterialConfig;
/**
 * 驗證材料長度是否為標準長度
 */
export declare function isStandardLength(length: number): length is StandardMaterialLength;
/**
 * 獲取最接近的標準材料長度
 */
export declare function getNearestStandardLength(requiredLength: number): StandardMaterialLength;
/**
 * 計算材料利用率
 */
export declare function calculateMaterialUtilization(usedLength: number, materialLength: number): number;
/**
 * 選擇最佳材料長度
 * @param requiredLength 所需長度（包含所有損耗）
 * @param targetUtilization 目標利用率（默認85%）
 * @returns 最佳材料長度
 */
export declare function selectOptimalMaterialLength(requiredLength: number, targetUtilization?: number): StandardMaterialLength;
