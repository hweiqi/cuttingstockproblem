import { V6CuttingService } from '../../services/V6CuttingService';
import { RandomTestGenerator } from '../../utils/RandomTestGenerator';
import { Material, Part } from '../../types';

/**
 * 小規模性能測試
 * 測試修復後的系統在中等規模下的表現
 */

describe('小規模性能測試', () => {
  let service: V6CuttingService;
  let generator: RandomTestGenerator;

  beforeEach(() => {
    service = new V6CuttingService();
    generator = new RandomTestGenerator();
    
    // 更新切割損耗配置
    service.updateConstraints(5, 20);
  });

  it('應該能處理 1000 個零件並達到高排版率', () => {
    // 生成測試場景
    const config = {
      partCount: { min: 1000, max: 1000 },
      partLength: { min: 500, max: 5000 }
    };
    const scenario = generator.generateTestScenario(config);
    
    console.log('測試場景生成完成:');
    console.log(`- 零件總數: ${scenario.parts.length}`);
    console.log(`- 材料種類: ${scenario.materials.length}`);
    
    // 記錄開始時間
    const startTime = Date.now();
    
    // 執行優化
    const result = service.optimize(scenario.materials, scenario.parts, 5, 20);
    
    // 計算執行時間
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // 統計結果
    let totalPlacedParts = 0;
    let totalMaterialUsed = 0;
    let totalMaterialLength = 0;
    
    if (result.cutPlans) {
      result.cutPlans.forEach(plan => {
        totalPlacedParts += plan.parts?.length || 0;
        const wasteLength = plan.waste || plan.wasteLength || 0;
        totalMaterialUsed += (plan.materialLength - wasteLength);
        totalMaterialLength += plan.materialLength;
      });
    }
    
    const totalParts = scenario.parts.reduce((sum, part) => 
      sum + (part.quantity || 1), 0
    );
    
    const placementRate = totalPlacedParts / totalParts;
    const materialUtilization = totalMaterialLength > 0 ? totalMaterialUsed / totalMaterialLength : 0;
    
    console.log('\n測試結果:');
    console.log(`- 處理時間: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}秒)`);
    console.log(`- 已排版零件: ${totalPlacedParts} / ${totalParts}`);
    console.log(`- 排版率: ${(placementRate * 100).toFixed(2)}%`);
    console.log(`- 使用材料數: ${result.cutPlans?.length || 0}`);
    console.log(`- 材料利用率: ${(materialUtilization * 100).toFixed(2)}%`);
    console.log(`- 未排版零件數: ${result.unplacedParts?.length || 0}`);
    
    // 檢查共刀資訊
    if (result.sharedCuttingInfo) {
      console.log('\n=== 共刀資訊 ===');
      console.log(`- 共刀切割數: ${result.sharedCuttingInfo.totalSharedCuts}`);
      console.log(`- 總節省: ${result.sharedCuttingInfo.totalSavings?.toFixed(2) || 0}mm`);
    }
    
    // 驗證結果
    expect(processingTime).toBeLessThan(30000); // 應在 30 秒內完成
    expect(placementRate).toBeGreaterThan(0.8); // 至少 80% 的排版率
    expect(materialUtilization).toBeGreaterThan(0.5); // 至少 50% 的材料利用率
    expect(result.cutPlans?.length).toBeGreaterThan(0); // 應該生成排版方案
    
    // 詳細報告
    if (placementRate < 0.9) {
      console.log('\n警告: 排版率低於 90%');
      if (result.unplacedParts && result.unplacedParts.length > 0) {
        console.log(`- 未排版零件數: ${result.unplacedParts.length}`);
        // 顯示前5個未排版零件
        result.unplacedParts.slice(0, 5).forEach(part => {
          console.log(`  - ${part.id}: ${part.length}mm × ${part.quantity}`);
        });
      }
    } else {
      console.log('✅ 排版率達到預期標準');
    }
  }, 60000); // 設定測試超時為 1 分鐘
});