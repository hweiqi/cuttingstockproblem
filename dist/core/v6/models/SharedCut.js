"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSharedCutSavings = calculateSharedCutSavings;
exports.calculateMatchScore = calculateMatchScore;
/**
 * 計算共刀節省量
 * @param angle 共刀角度
 * @param thickness 材料厚度
 * @returns 節省的長度
 */
function calculateSharedCutSavings(angle, thickness) {
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
function calculateMatchScore(match) {
    let score = match.savings;
    // 完全匹配獲得額外分數
    if (match.isExactMatch) {
        score *= 1.2;
    }
    else {
        // 根據角度差異減少分數
        const penalty = (match.angleDifference || 0) * 2;
        score = Math.max(score - penalty, score * 0.5);
    }
    return score;
}
