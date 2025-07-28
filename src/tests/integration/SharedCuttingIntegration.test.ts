import { V6System } from '../../core/v6/system/V6System';
import { PartWithQuantity } from '../../core/v6/models/Part';
import { Material } from '../../core/v6/models/Material';

describe('共刀功能整合測試', () => {
  let system: V6System;

  beforeEach(() => {
    system = new V6System({
      angleTolerance: 5,
      prioritizeMixedChains: true,
      constraints: {
        cuttingLoss: 5,
        frontEndLoss: 20,
        backEndLoss: 15
      }
    });
  });

  it('應該正確計算並報告共刀節省', () => {
    const parts: PartWithQuantity[] = [
      {
        id: 'PART-A',
        length: 2000,
        quantity: 5,
        angles: {
          topLeft: 45,
          topRight: 0,
          bottomLeft: 0,
          bottomRight: 0
        },
        thickness: 20
      },
      {
        id: 'PART-B',
        length: 2000,
        quantity: 5,
        angles: {
          topLeft: 0,
          topRight: 45,
          bottomLeft: 0,
          bottomRight: 0
        },
        thickness: 20
      }
    ];

    const materials: Material[] = [
      { id: 'MAT-10M', length: 10000, quantity: 0 } // 無限供應
    ];

    const result = system.optimize(parts, materials);

    console.log('\n=== 共刀功能測試結果 ===');
    console.log(`共刀鏈數：${result.optimization.chainsBuilt}`);
    console.log(`總節省：${result.optimization.totalChainSavings.toFixed(2)}mm`);
    console.log(`共刀配對數：${result.report.sharedCuttingPairs}`);
    console.log(`PlacementResult.totalSavings：${result.totalSavings.toFixed(2)}mm`);

    // 檢查具體的共刀資訊
    let sharedCutCount = 0;
    let totalActualSavings = 0;
    const sharedPairs = new Map<string, number>();

    result.placedParts.forEach(part => {
      if (part.sharedCuttingInfo) {
        sharedCutCount++;
        const pairKey = [
          `${part.partId}_${part.partInstanceId}`,
          `${part.sharedCuttingInfo.pairedWithPartId}_${part.sharedCuttingInfo.pairedWithInstanceId}`
        ].sort().join('-');
        
        if (!sharedPairs.has(pairKey)) {
          sharedPairs.set(pairKey, part.sharedCuttingInfo.savings);
          totalActualSavings += part.sharedCuttingInfo.savings;
        }
      }
    });

    console.log(`\n實際共刀零件數：${sharedCutCount}`);
    console.log(`唯一共刀配對數：${sharedPairs.size}`);
    console.log(`實際總節省：${totalActualSavings.toFixed(2)}mm`);

    // 詳細輸出前幾個共刀配對
    let count = 0;
    sharedPairs.forEach((savings, pair) => {
      if (count++ < 5) {
        console.log(`配對 ${pair}: 節省 ${savings}mm`);
      }
    });

    // 驗證
    expect(result.optimization.chainsBuilt).toBeGreaterThan(0);
    expect(result.optimization.totalChainSavings).toBeGreaterThan(0);
    expect(result.totalSavings).toBeGreaterThan(0);
    expect(sharedCutCount).toBeGreaterThan(0);
  });

  it('沒有角度的零件不應該有共刀節省', () => {
    const parts: PartWithQuantity[] = [
      {
        id: 'STRAIGHT-PART',
        length: 2000,
        quantity: 10,
        angles: {
          topLeft: 0,
          topRight: 0,
          bottomLeft: 0,
          bottomRight: 0
        },
        thickness: 20
      }
    ];

    const materials: Material[] = [
      { id: 'MAT-10M', length: 10000, quantity: 0 }
    ];

    const result = system.optimize(parts, materials);

    console.log('\n=== 無角度零件測試 ===');
    console.log(`共刀鏈數：${result.optimization.chainsBuilt}`);
    console.log(`總節省：${result.optimization.totalChainSavings.toFixed(2)}mm`);

    expect(result.optimization.chainsBuilt).toBe(0);
    expect(result.optimization.totalChainSavings).toBe(0);
    expect(result.totalSavings).toBe(0);
  });

  it('應該處理實際生產場景', () => {
    const parts: PartWithQuantity[] = [
      {
        id: 'part-6-1753668666207',
        length: 4784,
        quantity: 85,
        angles: {
          topLeft: 33,
          topRight: 0,
          bottomLeft: 0,
          bottomRight: 0
        },
        thickness: 25
      },
      {
        id: 'part-7-1753668666208',
        length: 3000,
        quantity: 50,
        angles: {
          topLeft: 0,
          topRight: 33,
          bottomLeft: 0,
          bottomRight: 0
        },
        thickness: 25
      }
    ];

    const materials: Material[] = [
      { id: 'MAT-6M', length: 6000, quantity: 0 },
      { id: 'MAT-10M', length: 10000, quantity: 0 },
      { id: 'MAT-12M', length: 12000, quantity: 0 }
    ];

    const result = system.optimize(parts, materials);

    console.log('\n=== 實際生產場景測試 ===');
    console.log(`需要排版零件總數：${85 + 50}`);
    console.log(`實際排版零件數：${result.placedParts.length}`);
    console.log(`未排版零件數：${result.unplacedParts.length}`);
    console.log(`共刀節省：${result.totalSavings.toFixed(2)}mm`);
    console.log(`材料利用率：${(result.report.materialUtilization * 100).toFixed(2)}%`);
    console.log(`使用材料數：${result.usedMaterials.length}`);

    // 所有零件都應該被排版
    expect(result.placedParts.length).toBe(135);
    expect(result.unplacedParts.length).toBe(0);
    expect(result.success).toBe(true);
    
    // 應該有共刀節省
    if (result.optimization.chainsBuilt > 0) {
      expect(result.totalSavings).toBeGreaterThan(0);
    }
  });
});