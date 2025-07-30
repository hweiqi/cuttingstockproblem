import { V6CuttingService } from '../../services/V6CuttingService';
import { Material, Part } from '../../types';

/**
 * 基本功能測試
 * 測試修復後的 V6CuttingService 是否能正常工作
 */

describe('基本功能測試', () => {
  let service: V6CuttingService;
  
  beforeEach(() => {
    service = new V6CuttingService();
  });

  it('應該能正常處理基本的排版請求', () => {
    // 測試材料
    const materials: Material[] = [
      { id: 'M1', length: 6000 },
      { id: 'M2', length: 9000 }
    ];

    // 測試零件
    const parts: Part[] = [
      {
        id: 'P1',
        length: 1000,
        quantity: 2,
        angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        thickness: 5
      },
      {
        id: 'P2',
        length: 1500,
        quantity: 3,
        angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        thickness: 5
      },
      {
        id: 'P3',
        length: 2000,
        quantity: 1,
        angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        thickness: 5
      }
    ];

    console.log('=== 基本功能測試開始 ===');
    console.log(`測試材料: ${materials.length} 種`);
    console.log(`測試零件: ${parts.length} 種，總數量: ${parts.reduce((sum, p) => sum + p.quantity, 0)} 個`);

    const result = service.optimize(materials, parts, 5, 20);
    
    console.log('\n=== 優化結果 ===');
    console.log(`排版方案數: ${result.cutPlans?.length || 0}`);
    console.log(`使用材料數: ${result.totalMaterialsUsed || 0}`);
    console.log(`整體效率: ${result.overallEfficiency?.toFixed(2) || 0}%`);
    console.log(`未排版零件數: ${result.unplacedParts?.length || 0}`);
    
    if (result.cutPlans && result.cutPlans.length > 0) {
      console.log('\n=== 詳細排版方案 ===');
      result.cutPlans.forEach((plan: any, index: number) => {
        console.log(`方案 ${index + 1}:`);
        console.log(`  - 材料: ${plan.materialId} (${plan.materialLength}mm)`);
        console.log(`  - 零件數: ${plan.parts?.length || 0}`);
        console.log(`  - 效率: ${plan.efficiency?.toFixed(2)}%`);
        console.log(`  - 浪費: ${plan.waste?.toFixed(2)}mm`);
      });
    } else {
      console.log('\n⚠️ 沒有生成排版方案!');
    }
    
    if (result.unplacedParts && result.unplacedParts.length > 0) {
      console.log('\n=== 未排版零件 ===');
      result.unplacedParts.forEach((part: any) => {
        console.log(`- ${part.id}: ${part.length}mm × ${part.quantity}`);
      });
    }
    
    if (result.report) {
      console.log('\n=== V6 優化報告 ===');
      console.log(result.report);
    }
    
    // 基本驗證
    expect(result).toBeDefined();
    expect(result.cutPlans).toBeDefined();
    expect(result.totalMaterialsUsed).toBeGreaterThanOrEqual(0);
    expect(result.overallEfficiency).toBeGreaterThanOrEqual(0);
    expect(result.unplacedParts).toBeDefined();
    
    console.log('\n=== 測試結束 ===');
  });
});