import { V6CuttingService } from '../../services/V6CuttingService';
import { RandomTestGenerator } from '../../utils/RandomTestGenerator';
import { Material, Part } from '../../types';

describe('大規模效能測試', () => {
  let v6Service: V6CuttingService;
  let generator: RandomTestGenerator;

  beforeEach(() => {
    v6Service = new V6CuttingService();
    generator = new RandomTestGenerator();
  });

  test('50000個零件的效能測試', () => {
    console.log('開始50000個零件效能測試...');
    
    // 生成測試數據
    const startGeneration = performance.now();
    const config = {
      partCount: { min: 50000, max: 50000 },
      partLength: { min: 500, max: 5000 }
    };
    const scenario = generator.generateTestScenario(config);
    const generationTime = performance.now() - startGeneration;
    
    console.log(`✓ 生成50000個零件耗時: ${generationTime.toFixed(2)}ms`);
    expect(scenario.parts.length).toBe(50000);
    
    // 準備材料（使用標準材料）
    const materials: Material[] = [
      { id: 'M1', length: 6000 },
      { id: 'M2', length: 9000 },
      { id: 'M3', length: 12000 },
      { id: 'M4', length: 15000 }
    ];
    
    // 執行優化
    console.log('開始執行排版優化...');
    const startOptimization = performance.now();
    
    try {
      const result = v6Service.optimizeCutting(materials, scenario.parts);
      const optimizationTime = performance.now() - startOptimization;
      
      console.log(`✓ 排版優化完成，耗時: ${optimizationTime.toFixed(2)}ms`);
      console.log(`✓ 使用材料數量: ${result.length}`);
      
      // 計算統計數據
      const totalParts = scenario.parts.reduce((sum, p) => sum + p.quantity, 0);
      const placedParts = result.reduce((sum, plan) => 
        sum + (plan.cuts?.length || plan.parts?.length || 0), 0
      );
      
      console.log(`✓ 總零件數: ${totalParts}`);
      console.log(`✓ 已排版零件數: ${placedParts}`);
      
      // 效能基準檢查
      expect(optimizationTime).toBeLessThan(300000); // 5分鐘內完成
      expect(placedParts).toBeGreaterThan(0); // 至少排版了一些零件
      
    } catch (error) {
      console.error('優化過程出錯:', error);
      throw error;
    }
  });

  test('測試不同規模的效能', () => {
    const scales = [100, 1000, 5000, 10000];
    const results: any[] = [];
    
    scales.forEach(scale => {
      const config = {
        partCount: { min: scale, max: scale },
        partLength: { min: 500, max: 5000 }
      };
      
      const startTime = performance.now();
      const scenario = generator.generateTestScenario(config);
      
      // 簡單的材料配置
      const materials: Material[] = [
        { id: 'M1', length: 12000 }
      ];
      
      try {
        const result = v6Service.optimizeCutting(materials, scenario.parts);
        const endTime = performance.now();
        
        results.push({
          scale,
          time: endTime - startTime,
          materialsUsed: result.length
        });
        
        console.log(`規模 ${scale}: ${(endTime - startTime).toFixed(2)}ms`);
      } catch (error) {
        console.error(`規模 ${scale} 失敗:`, error);
      }
    });
    
    // 顯示效能趨勢
    console.table(results);
  });

  test('記憶體使用測試', () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memBefore = process.memoryUsage();
      
      const config = {
        partCount: { min: 50000, max: 50000 },
        partLength: { min: 500, max: 5000 }
      };
      const scenario = generator.generateTestScenario(config);
      
      const memAfter = process.memoryUsage();
      
      const memUsed = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
      console.log(`記憶體使用: ${memUsed.toFixed(2)} MB`);
      
      // 確保記憶體使用在合理範圍內
      expect(memUsed).toBeLessThan(1000); // 小於1GB
    } else {
      console.log('記憶體測試跳過（非Node環境）');
    }
  });
});