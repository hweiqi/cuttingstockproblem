"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlexibleAngleMatcher = void 0;
const Part_1 = require("../models/Part");
const SharedCut_1 = require("../models/SharedCut");
/**
 * 靈活的角度匹配器
 * 支援：
 * 1. 完全相同角度的匹配
 * 2. 容差範圍內的角度匹配
 * 3. 不同位置之間的交叉匹配
 */
class FlexibleAngleMatcher {
    constructor(angleTolerance) {
        this.DEFAULT_ANGLE_TOLERANCE = 5; // 默認角度容差（度）
        this.angleTolerance = angleTolerance ?? this.DEFAULT_ANGLE_TOLERANCE;
    }
    /**
     * 獲取當前的角度容差
     */
    getAngleTolerance() {
        return this.angleTolerance;
    }
    /**
     * 找出兩個零件之間所有可能的角度匹配
     */
    findMatches(part1, part2) {
        const matches = [];
        const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
        // 遍歷所有位置組合
        for (const pos1 of positions) {
            const angle1 = part1.angles[pos1];
            if (!(0, Part_1.isBevelAngle)(angle1))
                continue;
            for (const pos2 of positions) {
                const angle2 = part2.angles[pos2];
                if (!(0, Part_1.isBevelAngle)(angle2))
                    continue;
                // 檢查角度是否在容差範圍內
                const angleDiff = Math.abs(angle1 - angle2);
                if (angleDiff <= this.angleTolerance) {
                    const isExact = angleDiff === 0;
                    const avgAngle = (angle1 + angle2) / 2;
                    const matchAngle = isExact ? angle1 : avgAngle;
                    // 使用平均厚度計算節省量
                    const avgThickness = (part1.thickness + part2.thickness) / 2;
                    const savings = (0, SharedCut_1.calculateSharedCutSavings)(matchAngle, avgThickness);
                    const match = {
                        part1Id: part1.id,
                        part2Id: part2.id,
                        part1Position: pos1,
                        part2Position: pos2,
                        angle: matchAngle,
                        isExactMatch: isExact,
                        angleDifference: isExact ? undefined : angleDiff,
                        averageAngle: isExact ? undefined : avgAngle,
                        savings: savings,
                        score: 0 // 稍後計算
                    };
                    match.score = (0, SharedCut_1.calculateMatchScore)(match);
                    matches.push(match);
                }
            }
        }
        // 按分數排序，最好的匹配在前
        return matches.sort((a, b) => b.score - a.score);
    }
    /**
     * 找出一組零件之間的最佳匹配組合
     */
    findBestMatchCombination(parts) {
        const allMatches = [];
        const usedPairs = new Set();
        // 找出所有可能的匹配
        for (let i = 0; i < parts.length; i++) {
            for (let j = i + 1; j < parts.length; j++) {
                const matches = this.findMatches(parts[i], parts[j]);
                allMatches.push(...matches);
            }
        }
        // 按分數排序
        allMatches.sort((a, b) => b.score - a.score);
        // 選擇最佳匹配，避免重複使用同一對零件
        const selectedMatches = [];
        for (const match of allMatches) {
            const pairKey = `${match.part1Id}-${match.part2Id}`;
            const reversePairKey = `${match.part2Id}-${match.part1Id}`;
            if (!usedPairs.has(pairKey) && !usedPairs.has(reversePairKey)) {
                selectedMatches.push(match);
                usedPairs.add(pairKey);
            }
        }
        return selectedMatches;
    }
    /**
     * 檢查兩個角度是否可以共刀
     */
    canShareCut(angle1, angle2) {
        if (!(0, Part_1.isBevelAngle)(angle1) || !(0, Part_1.isBevelAngle)(angle2)) {
            return false;
        }
        return Math.abs(angle1 - angle2) <= this.angleTolerance;
    }
    /**
     * 找出一個零件與一組零件的最佳匹配
     */
    findBestMatchForPart(part, candidates) {
        let bestMatch = null;
        let bestScore = 0;
        for (const candidate of candidates) {
            if (candidate.id === part.id)
                continue;
            const matches = this.findMatches(part, candidate);
            if (matches.length > 0 && matches[0].score > bestScore) {
                bestMatch = matches[0];
                bestScore = matches[0].score;
            }
        }
        return bestMatch;
    }
    /**
     * 評估一組零件的共刀潛力
     */
    evaluateSharedCuttingPotential(parts) {
        const matches = this.findBestMatchCombination(parts);
        const totalSavings = matches.reduce((sum, match) => sum + match.savings, 0);
        return {
            totalPotentialSavings: totalSavings,
            matchCount: matches.length,
            averageSavingsPerMatch: matches.length > 0 ? totalSavings / matches.length : 0
        };
    }
}
exports.FlexibleAngleMatcher = FlexibleAngleMatcher;
