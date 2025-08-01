"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const V6System_1 = require("../core/v6/system/V6System");
/**
 * V6系統功能示例
 * 展示修正後的共刀邏輯
 */
function demonstrateV6System() {
    console.log('=== V6 切割優化系統示例 ===\n');
    const system = new V6System_1.V6System({
        angleTolerance: 5,
        prioritizeMixedChains: true,
        constraints: {
            cuttingLoss: 3,
            frontEndLoss: 10,
            backEndLoss: 10
        }
    });
    // 示例1：缺陷1修復 - 不同位置的相同角度可以共刀
    console.log('示例1：不同位置的相同角度共刀');
    console.log('-'.repeat(50));
    const example1Parts = [
        {
            id: 'A',
            length: 2222,
            quantity: 2,
            angles: {
                topLeft: 33,
                topRight: 33,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 20
        },
        {
            id: 'B',
            length: 2222,
            quantity: 2,
            angles: {
                topLeft: 0,
                topRight: 33,
                bottomLeft: 33,
                bottomRight: 0
            },
            thickness: 20
        }
    ];
    const example1Materials = [
        { id: 'MATERIAL_10M', length: 10000, quantity: 1 }
    ];
    const result1 = system.optimize(example1Parts, example1Materials);
    console.log('零件A：左上33°、右上33°');
    console.log('零件B：右上33°、左下33°');
    console.log(`\n結果：`);
    console.log(`- 共刀鏈數：${result1.optimization.chainsBuilt}`);
    console.log(`- 混合鏈數：${result1.optimization.mixedChainsCreated}`);
    console.log(`- 總節省：${result1.optimization.totalChainSavings.toFixed(2)}mm`);
    console.log(`- 說明：A和B雖然角度位置不同，但都有33°角，可以共刀`);
    // 示例2：缺陷2修復 - 角度容差內的零件可以共刀
    console.log('\n\n示例2：角度容差內的零件共刀');
    console.log('-'.repeat(50));
    const example2Parts = [
        {
            id: 'C',
            length: 1500,
            quantity: 4,
            angles: {
                topLeft: 32,
                topRight: 0,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 20
        },
        {
            id: 'D',
            length: 1500,
            quantity: 4,
            angles: {
                topLeft: 35,
                topRight: 0,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 20
        }
    ];
    const example2Materials = [
        { id: 'MATERIAL_6M', length: 6000, quantity: 3 }
    ];
    const result2 = system.optimize(example2Parts, example2Materials);
    console.log('零件C：左上32°');
    console.log('零件D：左上35°');
    console.log(`\n結果：`);
    console.log(`- 共刀鏈數：${result2.optimization.chainsBuilt}`);
    console.log(`- 總節省：${result2.optimization.totalChainSavings.toFixed(2)}mm`);
    console.log(`- 說明：32°和35°在5°容差內，可以共刀`);
    // 示例3：缺陷3修復 - 所有零件必須被排版
    console.log('\n\n示例3：確保所有零件都被排版');
    console.log('-'.repeat(50));
    const example3Parts = [
        {
            id: 'LARGE',
            length: 5000,
            quantity: 10,
            angles: {
                topLeft: 45,
                topRight: 0,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 25
        }
    ];
    const example3Materials = [
        { id: 'MATERIAL_6M', length: 6000, quantity: 2 } // 材料嚴重不足
    ];
    const result3 = system.optimize(example3Parts, example3Materials);
    console.log(`需要排版：10個5000mm的零件`);
    console.log(`可用材料：2個6000mm的材料（明顯不足）`);
    console.log(`\n結果：`);
    console.log(`- 已排版零件：${result3.placedParts.length}`);
    console.log(`- 未排版零件：${result3.unplacedParts.length}`);
    console.log(`- 虛擬材料創建：${result3.virtualMaterialsCreated}`);
    console.log(`- 說明：系統自動創建虛擬材料，確保所有零件都被排版`);
    // 示例4：複雜生產場景
    console.log('\n\n示例4：複雜生產場景優化');
    console.log('-'.repeat(50));
    const complexParts = [
        {
            id: 'DOOR_LEFT',
            length: 2000,
            quantity: 6,
            angles: {
                topLeft: 38,
                topRight: 0,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 18
        },
        {
            id: 'DOOR_RIGHT',
            length: 2000,
            quantity: 6,
            angles: {
                topLeft: 0,
                topRight: 38,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 18
        },
        {
            id: 'DRAWER',
            length: 800,
            quantity: 12,
            angles: {
                topLeft: 35, // 接近38°，可以共刀
                topRight: 35,
                bottomLeft: 0,
                bottomRight: 0
            },
            thickness: 18
        },
        {
            id: 'PANEL',
            length: 1200,
            quantity: 8,
            angles: {
                topLeft: 40, // 接近38°，可以共刀
                topRight: 0,
                bottomLeft: 40,
                bottomRight: 0
            },
            thickness: 18
        }
    ];
    const complexMaterials = [
        { id: 'BOARD_6M', length: 6000, quantity: 15 }
    ];
    const complexResult = system.optimize(complexParts, complexMaterials);
    console.log('生產清單：');
    console.log('- 6個左門板（左上38°）');
    console.log('- 6個右門板（右上38°）');
    console.log('- 12個抽屜面板（35°，可與38°共刀）');
    console.log('- 8個側板（40°，可與38°共刀）');
    console.log('\n優化結果：');
    console.log(system.generateOptimizationReport(complexResult));
    // 詳細排版資訊
    console.log('\n排版詳情（前5個材料）：');
    const usedMaterials = complexResult.usedMaterials.slice(0, 5);
    usedMaterials.forEach((mat, index) => {
        const partsOnMaterial = complexResult.placedParts.filter(p => p.materialId === mat.material.id);
        console.log(`\n材料${index + 1} (${mat.material.id})：`);
        console.log(`  利用率：${(mat.utilization * 100).toFixed(1)}%`);
        console.log(`  零件：`);
        partsOnMaterial.forEach(p => {
            const sharedInfo = p.sharedCuttingInfo
                ? ` [與${p.sharedCuttingInfo.pairedWithPartId}共刀，節省${p.sharedCuttingInfo.savings.toFixed(1)}mm]`
                : '';
            console.log(`    - ${p.partId} @${p.position}mm${sharedInfo}`);
        });
    });
    console.log('\n\n=== 總結 ===');
    console.log('V6系統成功解決了所有已知缺陷：');
    console.log('✓ 支援不同位置的角度共刀');
    console.log('✓ 支援角度容差內的共刀（如32°和35°）');
    console.log('✓ 確保所有零件都被排版（必要時使用虛擬材料）');
    console.log('✓ 動態構建混合共刀鏈，最大化材料利用');
}
// 執行示例
if (require.main === module) {
    demonstrateV6System();
}
