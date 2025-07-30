import { V6CuttingService } from '../../services/V6CuttingService';
import { RandomTestGenerator } from '../../utils/RandomTestGenerator';
import { Material, Part } from '../../types';

describe('50000 零件測試場景', () => {
  let service: V6CuttingService;
  let generator: RandomTestGenerator;

  beforeEach(() => {
    service = new V6CuttingService();
    generator = new RandomTestGenerator();
    
    // 更新切割損耗配置
    service.updateConstraints(5, 20);
  });

  it('應該能夠處理 50000 個零件並達到高排版率', () => {
    // 生成固定50000個實例的測試場景
    const parts = generator.generateRandomPartsWithFixedInstances(50000, {
      min: 500,
      max: 5000
    });
    
    // 使用標準材料配置
    const materials: Material[] = [
      { id: 'M1', length: 6000 },
      { id: 'M2', length: 9000 },
      { id: 'M3', length: 12000 },
      { id: 'M4', length: 15000 }
    ];
    
    console.log('測試場景生成完成:');
    console.log(`- 零件種類數: ${parts.length}`);
    console.log(`- 零件實例總數: ${parts.reduce((sum, p) => sum + (p.quantity || 1), 0)}`);
    console.log(`- 材料種類: ${materials.length}`);
    
    // 記錄開始時間
    const startTime = Date.now();
    
    // 執行優化
    const result = service.optimize(materials, parts, 5, 20);
    
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
    
    const totalParts = parts.reduce((sum, part) => 
      sum + (part.quantity || 1), 0
    );
    
    const placementRate = totalPlacedParts / totalParts;
    const materialUtilization = totalMaterialUsed / totalMaterialLength;
    
    console.log('\n測試結果:');
    console.log(`- 處理時間: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}秒)`);
    console.log(`- 已排版零件: ${totalPlacedParts} / ${totalParts}`);
    console.log(`- 排版率: ${(placementRate * 100).toFixed(2)}%`);
    console.log(`- 使用材料數: ${result.cutPlans?.length || 0}`);
    console.log(`- 材料利用率: ${(materialUtilization * 100).toFixed(2)}%`);
    
    // 驗證結果
    expect(processingTime).toBeLessThan(120000); // 應在 2 分鐘內完成
    expect(placementRate).toBeGreaterThan(0.9); // 至少 90% 的排版率
    expect(materialUtilization).toBeGreaterThan(0.6); // 至少 60% 的材料利用率
    
    // 詳細報告
    if (placementRate < 0.95) {
      console.log('\n警告: 排版率低於預期 95%');
      
      // 分析未排版的原因
      const unplacedCount = totalParts - totalPlacedParts;
      console.log(`- 未排版零件數: ${unplacedCount}`);
      
      // 按長度分組統計
      const partsByLength = new Map<number, number>();
      parts.forEach(part => {
        const lengthGroup = Math.ceil(part.length / 1000) * 1000;
        partsByLength.set(lengthGroup, (partsByLength.get(lengthGroup) || 0) + (part.quantity || 1));
      });
      
      console.log('\n零件長度分佈:');
      Array.from(partsByLength.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([length, count]) => {
          console.log(`  ${length-1000}-${length}mm: ${count} 個`);
        });
    }
  }, 300000); // 設定測試超時為 5 分鐘

  it('應該能夠處理多種長度的零件', () => {
    // 生成具有多種規格的測試場景
    const parts: Part[] = [];
    const specs = [
      { length: 500, quantity: 5000 },
      { length: 800, quantity: 8000 },
      { length: 1000, quantity: 10000 },
      { length: 1200, quantity: 8000 },
      { length: 1500, quantity: 7000 },
      { length: 2000, quantity: 6000 },
      { length: 2500, quantity: 4000 },
      { length: 3000, quantity: 2000 }
    ];
    
    specs.forEach((spec, index) => {
      parts.push({
        id: `P${index}`,
        length: spec.length,
        quantity: spec.quantity,
        angles: {
          topLeft: 0,
          topRight: 0,
          bottomLeft: 0,
          bottomRight: 0
        },
        thickness: 5
      });
    });
    
    const materials: Material[] = [
      { id: 'M1', length: 6000 },
      { id: 'M2', length: 9000 },
      { id: 'M3', length: 12000 }
    ];
    
    // 執行優化
    const startTime = Date.now();
    const result = service.optimize(materials, parts, 5, 20);
    const endTime = Date.now();
    
    // 統計結果
    let totalPlacedParts = 0;
    const materialUsage = new Map<string, number>();
    
    if (result.cutPlans) {
      result.cutPlans.forEach(plan => {
        totalPlacedParts += plan.parts?.length || 0;
        const matId = plan.materialId;
        materialUsage.set(matId, (materialUsage.get(matId) || 0) + 1);
      });
    }
    
    const totalParts = specs.reduce((sum, spec) => sum + spec.quantity, 0);
    const placementRate = totalPlacedParts / totalParts;
    
    console.log('\n多規格零件測試結果:');
    console.log(`- 處理時間: ${endTime - startTime}ms`);
    console.log(`- 排版率: ${(placementRate * 100).toFixed(2)}%`);
    console.log(`- 材料使用情況:`);
    materialUsage.forEach((count, matId) => {
      const material = materials.find(m => m.id === matId);
      console.log(`  ${matId}: ${count} 個`);
    });
    
    // 驗證結果
    expect(placementRate).toBeGreaterThan(0.9);
    expect(materialUsage.size).toBeGreaterThan(1); // 應該使用多種材料
  }, 300000);
});