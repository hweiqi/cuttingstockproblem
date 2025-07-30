import { V6CuttingService } from '../../services/V6CuttingService';
import { Material, Part } from '../../types';

/**
 * 手動測試優化 UI 功能
 * 這個測試幫助診斷優化按鈕和進度條的問題
 */
describe('優化 UI 功能檢查', () => {
  let service: V6CuttingService;
  
  beforeEach(() => {
    service = new V6CuttingService();
  });
  
  it('檢查完整的優化流程和結果', () => {
    console.log('\n===== 優化功能檢查開始 =====\n');
    
    // 準備測試數據
    const materials: Material[] = [
      { id: 'M1', length: 6000 },
      { id: 'M2', length: 9000 },
      { id: 'M3', length: 12000 }
    ];
    
    const parts: Part[] = [
      { id: 'P1', length: 2000, quantity: 3 },
      { id: 'P2', length: 3000, quantity: 2 },
      { id: 'P3', length: 1500, quantity: 4 },
      { id: 'P4', length: 4000, quantity: 1 }
    ];
    
    console.log('輸入數據：');
    console.log(`- 材料：${materials.length} 種`);
    materials.forEach(m => console.log(`  ${m.id}: ${m.length}mm`));
    console.log(`- 零件：${parts.length} 種`);
    parts.forEach(p => console.log(`  ${p.id}: ${p.length}mm x ${p.quantity}`));
    
    // 執行優化
    console.log('\n執行優化...');
    const startTime = Date.now();
    const result = service.optimize(materials, parts, 3, 10);
    const endTime = Date.now();
    
    console.log(`\n優化完成，耗時：${endTime - startTime}ms`);
    
    // 檢查結果結構
    console.log('\n結果結構檢查：');
    console.log(`- cutPlans: ${result.cutPlans ? '✓' : '✗'} (${result.cutPlans?.length || 0} 個方案)`);
    console.log(`- totalMaterialsUsed: ${result.totalMaterialsUsed !== undefined ? '✓' : '✗'} (${result.totalMaterialsUsed})`);
    console.log(`- totalWaste: ${result.totalWaste !== undefined ? '✓' : '✗'} (${result.totalWaste?.toFixed(2)}mm)`);
    console.log(`- overallEfficiency: ${result.overallEfficiency !== undefined ? '✓' : '✗'} (${result.overallEfficiency?.toFixed(2)}%)`);
    console.log(`- unplacedParts: ${result.unplacedParts ? '✓' : '✗'} (${result.unplacedParts?.length || 0} 個)`);
    console.log(`- materialUtilization: ${result.materialUtilization !== undefined ? '✓' : '✗'} (${(result.materialUtilization * 100).toFixed(2)}%)`);
    console.log(`- report: ${result.report ? '✓' : '✗'} (${result.report ? '有報告' : '無報告'})`);
    console.log(`- sharedCuttingInfo: ${result.sharedCuttingInfo ? '✓' : '✗'}`);
    
    if (result.sharedCuttingInfo) {
      console.log(`  - totalSharedCuts: ${result.sharedCuttingInfo.totalSharedCuts}`);
      console.log(`  - totalSavings: ${result.sharedCuttingInfo.totalSavings?.toFixed(2)}mm`);
    }
    
    // 檢查每個切割方案
    console.log('\n切割方案詳情：');
    result.cutPlans?.forEach((plan, index) => {
      console.log(`\n方案 ${index + 1}:`);
      console.log(`- 材料：${plan.materialId} (${plan.materialLength}mm)`);
      console.log(`- 零件數：${plan.parts?.length || 0}`);
      console.log(`- 餘料：${plan.waste?.toFixed(2) || plan.wasteLength?.toFixed(2) || 0}mm`);
      console.log(`- 效率：${plan.efficiency?.toFixed(2) || (plan.utilization ? (plan.utilization * 100).toFixed(2) : 0)}%`);
      
      // 檢查零件詳情
      if (plan.parts && plan.parts.length > 0) {
        console.log('- 零件列表：');
        plan.parts.forEach((part, pIndex) => {
          console.log(`  ${pIndex + 1}. ${part.partId}: ${part.length}mm @ ${part.position}mm`);
          if (part.isSharedCut) {
            console.log(`     [共刀] 節省：${part.angleSavings?.toFixed(2) || 0}mm`);
          }
        });
      }
    });
    
    // 檢查報告內容
    if (result.report) {
      console.log('\n優化報告內容：');
      console.log('---報告開始---');
      console.log(result.report);
      console.log('---報告結束---');
    }
    
    console.log('\n===== 優化功能檢查結束 =====\n');
    
    // 驗證必要欄位
    expect(result.cutPlans).toBeDefined();
    expect(result.cutPlans.length).toBeGreaterThan(0);
    expect(result.totalMaterialsUsed).toBeGreaterThan(0);
    expect(result.overallEfficiency).toBeGreaterThan(0);
    expect(result.report).toBeDefined();
    expect(result.sharedCuttingInfo).toBeDefined();
  });
  
  it('檢查大規模數據優化', () => {
    console.log('\n===== 大規模數據優化檢查 =====\n');
    
    const materials: Material[] = [
      { id: 'M1', length: 6000 },
      { id: 'M2', length: 9000 },
      { id: 'M3', length: 12000 },
      { id: 'M4', length: 15000 }
    ];
    
    // 生成 100 個零件
    const parts: Part[] = [];
    for (let i = 0; i < 100; i++) {
      parts.push({
        id: `P${i + 1}`,
        length: 1000 + (i % 10) * 300,
        quantity: 5
      });
    }
    
    console.log(`測試規模：${parts.length} 種零件，總計 ${parts.reduce((sum, p) => sum + p.quantity, 0)} 個實例`);
    
    const startTime = Date.now();
    const result = service.optimize(materials, parts, 3, 10);
    const endTime = Date.now();
    
    console.log(`\n優化完成，耗時：${endTime - startTime}ms`);
    console.log(`- 使用材料數：${result.totalMaterialsUsed}`);
    console.log(`- 切割方案數：${result.cutPlans.length}`);
    console.log(`- 整體效率：${result.overallEfficiency?.toFixed(2)}%`);
    console.log(`- 未排版零件：${result.unplacedParts.length}`);
    
    expect(result.cutPlans.length).toBeGreaterThan(0);
    expect(result.totalMaterialsUsed).toBeGreaterThan(0);
  });
});