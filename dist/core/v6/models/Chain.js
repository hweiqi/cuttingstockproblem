"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineChainStructure = determineChainStructure;
exports.calculateChainTotalLength = calculateChainTotalLength;
/**
 * 判斷鏈的結構類型
 */
function determineChainStructure(chain) {
    const partTypes = new Set(chain.parts.map(p => p.partId));
    // 如果只有一種零件類型
    if (partTypes.size === 1) {
        if (chain.parts.length > 10) {
            return 'batch';
        }
        return 'linear';
    }
    // 如果有多種零件類型
    if (partTypes.size === 2) {
        return 'mixed';
    }
    // 3種或更多零件類型
    return 'complex';
}
/**
 * 計算鏈的總長度
 */
function calculateChainTotalLength(chain, partLengths) {
    let totalLength = 0;
    for (const part of chain.parts) {
        const length = partLengths.get(part.partId) || 0;
        totalLength += length;
    }
    // 減去共刀節省的長度
    totalLength -= chain.totalSavings;
    return totalLength;
}
