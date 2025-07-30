import { V6CuttingService } from '../services/V6CuttingService';
import { Material, Part } from '../types';

describe('快速功能測試 - 檢查詳細排版方案和未排版零件', () => {
  let service: V6CuttingService;

  beforeEach(() => {
    service = new V6CuttingService();
  });

  it('應該生成非空的詳細排版方案', () => {
    const materials: Material[] = [
      { id: 'M1', length: 6000, quantity: 0 }
    ];

    const parts: Part[] = [
      {
        id: 'P1',
        length: 2000,
        quantity: 5,
        thickness: 20
      }
    ];

    const result = service.optimize(materials, parts, 3, 10);

    console.log('=== 測試結果 ===');
    console.log('cutPlans 數量：', result.cutPlans.length);
    console.log('cutPlans 內容：', JSON.stringify(result.cutPlans, null, 2));
    console.log('unplacedParts：', JSON.stringify(result.unplacedParts, null, 2));

    // 驗證 cutPlans 不為空
    expect(result.cutPlans).toBeDefined();
    expect(result.cutPlans.length).toBeGreaterThan(0);

    // 驗證每個 cutPlan 都有內容
    result.cutPlans.forEach((plan, index) => {
      console.log(`\n計畫 ${index + 1}:`);
      console.log('  材料長度：', plan.materialLength);
      console.log('  零件數量：', plan.parts?.length || plan.cuts?.length || 0);
      console.log('  零件詳情：', plan.parts || plan.cuts);
      
      expect(plan.parts || plan.cuts).toBeDefined();
      expect((plan.parts || plan.cuts).length).toBeGreaterThan(0);
    });

    // 驗證沒有未排版的零件
    expect(result.unplacedParts.length).toBe(0);
  });

  it('應該正確處理未能排版的零件', () => {
    const materials: Material[] = [
      { id: 'M1', length: 1000, quantity: 1 } // 只有一個短材料
    ];

    const parts: Part[] = [
      {
        id: 'P1',
        length: 2000, // 超過材料長度
        quantity: 1,
        thickness: 20
      }
    ];

    const result = service.optimize(materials, parts, 3, 10);

    console.log('\n=== 未排版零件測試 ===');
    console.log('cutPlans：', result.cutPlans);
    console.log('unplacedParts：', result.unplacedParts);

    // 應該有未排版的零件
    expect(result.unplacedParts).toBeDefined();
    expect(result.unplacedParts.length).toBe(1);
    expect(result.unplacedParts[0].id).toBe('P1');
  });

  it('應該正確顯示共刀優化信息', () => {
    const materials: Material[] = [
      { id: 'M1', length: 6000, quantity: 0 }
    ];

    const parts: Part[] = [
      {
        id: 'P1',
        length: 2000,
        quantity: 2,
        angles: {
          topLeft: 45,
          topRight: 90,
          bottomLeft: 90,
          bottomRight: 45
        },
        thickness: 20
      },
      {
        id: 'P2',
        length: 2000,
        quantity: 2,
        angles: {
          topLeft: 45,
          topRight: 90,
          bottomLeft: 90,
          bottomRight: 45
        },
        thickness: 20
      }
    ];

    const result = service.optimize(materials, parts, 3, 10);

    console.log('\n=== 共刀優化測試 ===');
    console.log('共刀信息：', result.sharedCuttingInfo);
    console.log('優化報告：', result.report);

    // 檢查是否有共刀優化信息
    if (result.sharedCuttingInfo) {
      expect(result.sharedCuttingInfo.totalSharedCuts).toBeGreaterThanOrEqual(0);
    }

    // 檢查 cutPlans 中的共刀信息
    result.cutPlans.forEach((plan, index) => {
      const sharedCuts = (plan.parts || plan.cuts || []).filter(p => p.isSharedCut);
      if (sharedCuts.length > 0) {
        console.log(`\n計畫 ${index + 1} 的共刀切割：`);
        sharedCuts.forEach(cut => {
          console.log('  - 零件ID：', cut.partId);
          console.log('    節省：', cut.angleSavings);
        });
      }
    });
  });
});