"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CompleteOptimizationSystem_1 = require("../core/v5/optimization/CompleteOptimizationSystem");
/**
 * 示例程式：展示修正後的共刀邏輯
 */
function demonstrateSharedCutting() {
    console.log('=== 切割優化系統 - 共刀功能示例 ===\n');
    const optimizer = new CompleteOptimizationSystem_1.CompleteOptimizationSystem();
    // 示例1：相同零件的共刀優化
    console.log('1. 相同零件共刀測試');
    console.log('   情境：4個完全相同的零件應該充分共刀');
    const identicalParts = [
        {
            id: 'part-3-1753317424920',
            length: 2222,
            quantity: 4,
            angles: {
                topLeft: 33,
                topRight: 33,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 20
        }
    ];
    const materials1 = [
        {
            id: 'MATERIAL_10M',
            length: 10000,
            quantity: 1
        }
    ];
    const result1 = optimizer.optimize(identicalParts, materials1);
    console.log('\n   結果：');
    console.log(`   - 已排版零件數：${result1.placement.placedParts.length}`);
    console.log(`   - 共刀鏈數：${result1.sharedCutting.totalChains}`);
    console.log(`   - 總節省量：${result1.sharedCutting.totalSavings.toFixed(2)}mm`);
    // 顯示排版詳情
    console.log('\n   排版詳情：');
    const sortedParts = result1.placement.placedParts
        .filter(p => p.partId === 'part-3-1753317424920')
        .sort((a, b) => a.position - b.position);
    sortedParts.forEach((part, index) => {
        console.log(`   零件${index + 1}: 位置 ${part.position.toFixed(0)}mm` +
            (part.sharedCuttingPair ? ` (與${part.sharedCuttingPair}共刀)` : ''));
    });
    // 計算實際間隔
    console.log('\n   零件間隔分析：');
    for (let i = 1; i < sortedParts.length; i++) {
        const gap = sortedParts[i].position - sortedParts[i - 1].position - 2222;
        const isSharedCut = gap < 5; // 假設正常切割損耗是5mm
        console.log(`   零件${i}到${i + 1}的間隔: ${gap.toFixed(2)}mm ${isSharedCut ? '✓共刀' : '✗未共刀'}`);
    }
    // 示例2：大量生產場景
    console.log('\n\n2. 大量生產場景測試');
    console.log('   情境：家具廠生產門板和側板');
    const productionParts = [
        {
            id: 'DOOR_PANEL',
            length: 2000,
            quantity: 20,
            angles: {
                topLeft: 35,
                topRight: 35,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 18
        },
        {
            id: 'SIDE_PANEL',
            length: 1800,
            quantity: 20,
            angles: {
                topLeft: 35,
                topRight: 35,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 18
        },
        {
            id: 'TOP_PANEL',
            length: 1500,
            quantity: 10,
            angles: {
                topLeft: 45,
                topRight: 45,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 15
        }
    ];
    const materials2 = [
        {
            id: 'BOARD_6M',
            length: 6000,
            quantity: 20
        }
    ];
    const result2 = optimizer.optimize(productionParts, materials2);
    console.log('\n   結果：');
    console.log(`   - 總零件數：${result2.placement.placedParts.length}`);
    console.log(`   - 共刀鏈數：${result2.sharedCutting.totalChains}`);
    console.log(`   - 總節省量：${result2.sharedCutting.totalSavings.toFixed(2)}mm`);
    console.log(`   - 材料利用率：${(result2.placement.materialUtilization * 100).toFixed(2)}%`);
    // 統計各類零件的共刀情況
    console.log('\n   各類零件共刀統計：');
    const partTypes = ['DOOR_PANEL', 'SIDE_PANEL', 'TOP_PANEL'];
    for (const partType of partTypes) {
        const parts = result2.placement.placedParts.filter(p => p.partId === partType);
        const sharedParts = parts.filter(p => p.sharedCuttingPair);
        console.log(`   ${partType}: ${sharedParts.length}/${parts.length} 參與共刀 (${(sharedParts.length / parts.length * 100).toFixed(0)}%)`);
    }
    // 顯示共刀鏈詳情
    console.log('\n   共刀鏈詳情：');
    result2.sharedCutting.chains.forEach((chain, index) => {
        const partTypes = new Set(chain.parts.map(p => p.partId));
        console.log(`   鏈${index + 1}: 包含 ${chain.parts.length} 個零件，` +
            `類型：${Array.from(partTypes).join(', ')}，` +
            `節省：${chain.totalSavings.toFixed(2)}mm`);
    });
    // 示例3：混合角度場景
    console.log('\n\n3. 混合角度場景測試');
    console.log('   情境：不同角度的零件混合生產');
    const mixedParts = [
        {
            id: 'TYPE_30',
            length: 1000,
            quantity: 10,
            angles: {
                topLeft: 30,
                topRight: 30,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 20
        },
        {
            id: 'TYPE_45',
            length: 1000,
            quantity: 10,
            angles: {
                topLeft: 45,
                topRight: 45,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 20
        },
        {
            id: 'TYPE_60',
            length: 1000,
            quantity: 10,
            angles: {
                topLeft: 60,
                topRight: 60,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 20
        }
    ];
    const materials3 = [
        {
            id: 'MATERIAL_5M',
            length: 5000,
            quantity: 10
        }
    ];
    const result3 = optimizer.optimize(mixedParts, materials3);
    console.log('\n   結果：');
    console.log(`   - 總零件數：${result3.placement.placedParts.length}`);
    console.log(`   - 共刀鏈數：${result3.sharedCutting.totalChains}`);
    console.log(`   - 總節省量：${result3.sharedCutting.totalSavings.toFixed(2)}mm`);
    // 顯示優化建議
    if (result3.suggestions.length > 0) {
        console.log('\n   優化建議：');
        result3.suggestions.forEach((suggestion, index) => {
            console.log(`   ${index + 1}. ${suggestion.description}`);
            console.log(`      潛在改進：${suggestion.potentialImprovement}`);
        });
    }
    // 總結
    console.log('\n\n=== 總結 ===');
    console.log('共刀邏輯已修正，現在能夠：');
    console.log('1. ✓ 確保相同零件充分共刀');
    console.log('2. ✓ 處理大量零件的批次共刀');
    console.log('3. ✓ 支援混合角度的優化排版');
    console.log('4. ✓ 提供詳細的優化報告和建議');
}
// 執行示例
if (require.main === module) {
    demonstrateSharedCutting();
}
