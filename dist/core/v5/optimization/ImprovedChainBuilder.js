"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImprovedChainBuilder = void 0;
const ComplexChainBuilder_1 = require("../../v4/optimization/ComplexChainBuilder");
/**
 * 改進的鏈式構建器，修復相同零件共刀問題
 */
class ImprovedChainBuilder {
    constructor() {
        this.MAX_CHAIN_LENGTH = 20; // 單個鏈的最大長度，避免過長的鏈
        this.baseBuilder = new ComplexChainBuilder_1.ComplexChainBuilder();
    }
    /**
     * 構建共刀鏈，確保相同零件充分共刀
     */
    buildChains(parts) {
        const allChains = [];
        // 首先處理相同零件的共刀
        const identicalPartsChains = this.buildIdenticalPartsChains(parts);
        allChains.push(...identicalPartsChains);
        // 然後處理剩餘的混合零件共刀
        const remainingParts = this.getRemainingParts(parts, identicalPartsChains);
        if (remainingParts.length > 0) {
            const mixedChains = this.baseBuilder.buildChains(remainingParts);
            allChains.push(...mixedChains);
        }
        return allChains;
    }
    /**
     * 為相同零件構建專門的共刀鏈
     */
    buildIdenticalPartsChains(parts) {
        const chains = [];
        let chainIdCounter = 0;
        // 處理每種零件類型
        for (const part of parts) {
            if (part.quantity < 2)
                continue;
            // 檢查是否有可共刀的角度
            const hasShareableAngles = Object.values(part.angles).some(angle => angle > 0 && angle < 90);
            if (!hasShareableAngles)
                continue;
            // 為這種零件創建共刀鏈
            const chainsForPart = this.createChainsForIdenticalParts(part, chainIdCounter);
            chains.push(...chainsForPart);
            chainIdCounter += chainsForPart.length;
        }
        return chains;
    }
    /**
     * 為單一類型的相同零件創建共刀鏈
     */
    createChainsForIdenticalParts(part, startChainId) {
        const chains = [];
        const totalQuantity = part.quantity;
        // 計算需要多少個鏈
        const chainsNeeded = Math.ceil(totalQuantity / this.MAX_CHAIN_LENGTH);
        for (let chainIndex = 0; chainIndex < chainsNeeded; chainIndex++) {
            const startIdx = chainIndex * this.MAX_CHAIN_LENGTH;
            const endIdx = Math.min(startIdx + this.MAX_CHAIN_LENGTH, totalQuantity);
            const chainLength = endIdx - startIdx;
            if (chainLength < 2)
                continue;
            // 創建鏈中的零件
            const chainParts = [];
            const connections = [];
            for (let i = 0; i < chainLength; i++) {
                chainParts.push({
                    partId: part.id,
                    instanceId: startIdx + i,
                    orientation: { isFlipped: false },
                    position: i
                });
                // 創建與前一個零件的連接
                if (i > 0) {
                    // 選擇最佳的共刀角度
                    const sharedAngle = this.selectBestSharedAngle(part.angles);
                    const savings = this.calculateSavings(sharedAngle);
                    connections.push({
                        fromPart: {
                            partId: part.id,
                            instanceId: startIdx + i - 1,
                            orientation: { isFlipped: false },
                            position: i - 1
                        },
                        toPart: {
                            partId: part.id,
                            instanceId: startIdx + i,
                            orientation: { isFlipped: false },
                            position: i
                        },
                        fromSide: 'right',
                        toSide: 'left',
                        sharedAngle,
                        savings
                    });
                }
            }
            // 計算總節省
            const totalSavings = connections.reduce((sum, conn) => sum + conn.savings, 0);
            const totalLength = part.length * chainLength - totalSavings;
            chains.push({
                id: `identical_chain_${part.id}_${startChainId + chainIndex}`,
                parts: chainParts,
                connections,
                totalLength,
                totalSavings,
                structure: 'linear'
            });
        }
        return chains;
    }
    /**
     * 選擇最佳的共刀角度
     */
    selectBestSharedAngle(angles) {
        // 優先選擇非90度的角度
        const validAngles = Object.values(angles).filter(a => a > 0 && a < 90);
        if (validAngles.length === 0) {
            return 45; // 默認角度
        }
        // 選擇最常見的角度
        const angleCount = new Map();
        for (const angle of validAngles) {
            angleCount.set(angle, (angleCount.get(angle) || 0) + 1);
        }
        // 返回出現次數最多的角度
        let bestAngle = validAngles[0];
        let maxCount = 0;
        for (const [angle, count] of angleCount) {
            if (count > maxCount) {
                maxCount = count;
                bestAngle = angle;
            }
        }
        return bestAngle;
    }
    /**
     * 計算共刀節省量
     */
    calculateSavings(angle) {
        // 基於角度計算節省量
        // 角度越大，節省越多
        const baseThickness = 20; // 假設基礎厚度
        const radians = (angle * Math.PI) / 180;
        const savings = baseThickness / Math.sin(radians);
        // 限制最大節省量
        return Math.min(savings, 50);
    }
    /**
     * 獲取未被相同零件鏈使用的剩餘零件
     */
    getRemainingParts(originalParts, identicalChains) {
        const usedQuantities = new Map();
        // 統計已使用的數量
        for (const chain of identicalChains) {
            for (const part of chain.parts) {
                const current = usedQuantities.get(part.partId) || 0;
                usedQuantities.set(part.partId, current + 1);
            }
        }
        // 創建剩餘零件列表
        const remainingParts = [];
        for (const part of originalParts) {
            const used = usedQuantities.get(part.id) || 0;
            const remaining = part.quantity - used;
            if (remaining > 0) {
                remainingParts.push({
                    ...part,
                    quantity: remaining
                });
            }
        }
        return remainingParts;
    }
}
exports.ImprovedChainBuilder = ImprovedChainBuilder;
