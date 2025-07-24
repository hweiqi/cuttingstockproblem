"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MATERIAL_CONFIG = exports.STANDARD_MATERIAL_LENGTHS = void 0;
exports.isStandardLength = isStandardLength;
exports.getNearestStandardLength = getNearestStandardLength;
exports.calculateMaterialUtilization = calculateMaterialUtilization;
exports.selectOptimalMaterialLength = selectOptimalMaterialLength;
/**
 * 標準材料長度配置
 */
exports.STANDARD_MATERIAL_LENGTHS = [6000, 9000, 10000, 12000, 15000];
/**
 * 默認材料配置
 */
exports.DEFAULT_MATERIAL_CONFIG = {
    availableLengths: exports.STANDARD_MATERIAL_LENGTHS,
    defaultQuantity: 999 // 假設無限供應
};
/**
 * 驗證材料長度是否為標準長度
 */
function isStandardLength(length) {
    return exports.STANDARD_MATERIAL_LENGTHS.includes(length);
}
/**
 * 獲取最接近的標準材料長度
 */
function getNearestStandardLength(requiredLength) {
    // 找到第一個大於或等於所需長度的標準材料
    for (var _i = 0, STANDARD_MATERIAL_LENGTHS_1 = exports.STANDARD_MATERIAL_LENGTHS; _i < STANDARD_MATERIAL_LENGTHS_1.length; _i++) {
        var standardLength = STANDARD_MATERIAL_LENGTHS_1[_i];
        if (standardLength >= requiredLength) {
            return standardLength;
        }
    }
    // 如果沒有找到，返回最大的標準長度
    return exports.STANDARD_MATERIAL_LENGTHS[exports.STANDARD_MATERIAL_LENGTHS.length - 1];
}
/**
 * 計算材料利用率
 */
function calculateMaterialUtilization(usedLength, materialLength) {
    if (materialLength <= 0)
        return 0;
    if (usedLength <= 0)
        return 0;
    return Math.min(1, Math.abs(usedLength) / Math.abs(materialLength));
}
/**
 * 選擇最佳材料長度
 * @param requiredLength 所需長度（包含所有損耗）
 * @param targetUtilization 目標利用率（默認85%）
 * @returns 最佳材料長度
 */
function selectOptimalMaterialLength(requiredLength, targetUtilization) {
    if (targetUtilization === void 0) { targetUtilization = 0.85; }
    if (requiredLength <= 0) {
        return exports.STANDARD_MATERIAL_LENGTHS[0];
    }
    // 如果超過最大長度，返回最大長度
    if (requiredLength > exports.STANDARD_MATERIAL_LENGTHS[exports.STANDARD_MATERIAL_LENGTHS.length - 1]) {
        return exports.STANDARD_MATERIAL_LENGTHS[exports.STANDARD_MATERIAL_LENGTHS.length - 1];
    }
    var bestLength = exports.STANDARD_MATERIAL_LENGTHS[0];
    var bestUtilization = 0;
    for (var _i = 0, STANDARD_MATERIAL_LENGTHS_2 = exports.STANDARD_MATERIAL_LENGTHS; _i < STANDARD_MATERIAL_LENGTHS_2.length; _i++) {
        var length_1 = STANDARD_MATERIAL_LENGTHS_2[_i];
        if (length_1 >= requiredLength) {
            var utilization = requiredLength / length_1;
            // 如果利用率超過目標，直接選擇第一個滿足的
            if (utilization >= targetUtilization) {
                return length_1;
            }
            // 否則記錄利用率最高的
            if (utilization > bestUtilization) {
                bestUtilization = utilization;
                bestLength = length_1;
            }
        }
    }
    return bestLength;
}
