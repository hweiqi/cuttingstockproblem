import { RandomTestGenerator } from '../../utils/RandomTestGenerator';
import { V6CuttingService } from '../../services/V6CuttingService';
import { Material, Part } from '../../types';

describe('測試場景選擇器功能測試', () => {
  let generator: RandomTestGenerator;
  let service: V6CuttingService;

  beforeEach(() => {
    generator = new RandomTestGenerator();
    service = new V6CuttingService();
  });

  describe('隨機場景測試', () => {
    it('完全隨機場景應該正常運作', () => {
      const scenario = generator.generateTestScenario();
      
      expect(scenario.parts).toBeDefined();
      expect(scenario.materials).toBeDefined();
      expect(scenario.parts.length).toBeGreaterThan(0);
      expect(scenario.materials.length).toBeGreaterThan(0);
      
      // 測試優化
      const result = service.optimize(scenario.materials, scenario.parts, 3, 10);
      expect(result.cutPlans).toBeDefined();
      expect(result.cutPlans.length).toBeGreaterThan(0);
    });

    it('中等複雜度場景（10-25零件）應該正常運作', () => {
      const config = {
        partCount: { min: 10, max: 25 },
        partLength: { min: 800, max: 4000 }
      };
      const scenario = generator.generateTestScenario(config);
      
      expect(scenario.parts.length).toBeGreaterThanOrEqual(10);
      expect(scenario.parts.length).toBeLessThanOrEqual(25);
      
      // 測試優化
      const result = service.optimize(scenario.materials, scenario.parts, 3, 10);
      expect(result.cutPlans).toBeDefined();
      expect(result.cutPlans.length).toBeGreaterThan(0);
    });
  });

  describe('大規模測試場景', () => {
    it('大規模（10,000零件）場景應該正常運作', () => {
      const config = {
        partCount: { min: 10000, max: 10000 },
        partLength: { min: 500, max: 5000 }
      };
      const scenario = generator.generateTestScenario(config);
      
      // 計算總零件數
      const totalParts = scenario.parts.reduce((sum, part) => sum + part.quantity, 0);
      console.log(`生成了 ${scenario.parts.length} 種零件，總計 ${totalParts} 個零件實例`);
      
      expect(scenario.parts.length).toBeGreaterThan(0);
      expect(totalParts).toBeGreaterThanOrEqual(10000);
      
      // 測試優化（大規模測試可能需要較長時間）
      const startTime = Date.now();
      const result = service.optimize(scenario.materials, scenario.parts, 3, 10);
      const endTime = Date.now();
      
      console.log(`優化10,000零件耗時：${endTime - startTime}ms`);
      expect(result.cutPlans).toBeDefined();
      expect(result.cutPlans.length).toBeGreaterThan(0);
    }, 60000); // 60秒超時
    
    it('效能測試（50,000零件）場景應該正常運作', () => {
      const config = {
        partCount: { min: 50000, max: 50000 },
        partLength: { min: 500, max: 5000 }
      };
      const scenario = generator.generateTestScenario(config);
      
      // 計算總零件數
      const totalParts = scenario.parts.reduce((sum, part) => sum + part.quantity, 0);
      console.log(`生成了 ${scenario.parts.length} 種零件，總計 ${totalParts} 個零件實例`);
      
      expect(scenario.parts.length).toBeGreaterThan(0);
      expect(totalParts).toBeGreaterThanOrEqual(50000);
      
      // 測試優化（大規模測試可能需要較長時間）
      const startTime = Date.now();
      const result = service.optimize(scenario.materials, scenario.parts, 3, 10);
      const endTime = Date.now();
      
      console.log(`優化50,000零件耗時：${endTime - startTime}ms`);
      expect(result.cutPlans).toBeDefined();
      expect(result.cutPlans.length).toBeGreaterThan(0);
    }, 300000); // 5分鐘超時
    
    it('終極規模（100,000零件）場景應該正常運作', () => {
      const config = {
        partCount: { min: 100000, max: 100000 },
        partLength: { min: 500, max: 5000 }
      };
      const scenario = generator.generateTestScenario(config);
      
      // 計算總零件數
      const totalParts = scenario.parts.reduce((sum, part) => sum + part.quantity, 0);
      console.log(`生成了 ${scenario.parts.length} 種零件，總計 ${totalParts} 個零件實例`);
      
      expect(scenario.parts.length).toBeGreaterThan(0);
      expect(totalParts).toBeGreaterThanOrEqual(100000);
      
      // 測試優化（大規模測試可能需要較長時間）
      const startTime = Date.now();
      const result = service.optimize(scenario.materials, scenario.parts, 3, 10);
      const endTime = Date.now();
      
      console.log(`優化100,000零件耗時：${endTime - startTime}ms`);
      expect(result.cutPlans).toBeDefined();
      expect(result.cutPlans.length).toBeGreaterThan(0);
    }, 600000); // 10分鐘超時
  });

  describe('預設場景測試', () => {
    it('所有預設場景應該正常運作', () => {
      const presetScenarios = generator.generatePresetScenarios();
      
      expect(presetScenarios.length).toBeGreaterThan(0);
      
      presetScenarios.forEach(preset => {
        console.log(`測試預設場景：${preset.name} - ${preset.description}`);
        
        // 如果場景沒有材料，添加默認材料
        const materials = preset.scenario.materials.length > 0 
          ? preset.scenario.materials 
          : [
              { id: 'M1', length: 6000 },
              { id: 'M2', length: 9000 },
              { id: 'M3', length: 12000 },
              { id: 'M4', length: 15000 }
            ];
        
        const result = service.optimize(materials, preset.scenario.parts, 3, 10);
        
        expect(result.cutPlans).toBeDefined();
        expect(result.cutPlans.length).toBeGreaterThan(0);
        
        // 計算排版率
        const totalParts = preset.scenario.parts.reduce((sum, p) => sum + (p.quantity || 1), 0);
        const placedParts = result.cutPlans.reduce((sum, plan) => 
          sum + (plan.parts?.length || 0), 0
        );
        const placementRate = placedParts / totalParts;
        
        console.log(`  - 總零件數：${totalParts}`);
        console.log(`  - 已排版：${placedParts}`);
        console.log(`  - 排版率：${(placementRate * 100).toFixed(2)}%`);
        console.log(`  - 使用材料數：${result.totalMaterialsUsed}`);
        console.log(`  - 整體效率：${result.overallEfficiency?.toFixed(2)}%`);
        
        expect(placementRate).toBeGreaterThan(0.7); // 至少70%的排版率
      });
    });
  });

  describe('測試場景數據驗證', () => {
    it('生成的零件應該有有效的長度和數量', () => {
      const parts = generator.generateRandomParts(100);
      
      parts.forEach(part => {
        expect(part.id).toBeDefined();
        expect(part.length).toBeGreaterThan(0);
        expect(part.length).toBeLessThanOrEqual(20000);
        expect(part.quantity).toBeGreaterThan(0);
        expect(part.quantity).toBeLessThanOrEqual(10);
        
        if (part.angles) {
          // 驗證角度值
          expect(part.angles.topLeft).toBeGreaterThanOrEqual(0);
          expect(part.angles.topLeft).toBeLessThanOrEqual(90);
          expect(part.angles.topRight).toBeGreaterThanOrEqual(0);
          expect(part.angles.topRight).toBeLessThanOrEqual(90);
          expect(part.angles.bottomLeft).toBeGreaterThanOrEqual(0);
          expect(part.angles.bottomLeft).toBeLessThanOrEqual(90);
          expect(part.angles.bottomRight).toBeGreaterThanOrEqual(0);
          expect(part.angles.bottomRight).toBeLessThanOrEqual(90);
        }
      });
    });
    
    it('生成的材料應該有有效的長度且不重複', () => {
      const materials = generator.generateRandomMaterials(10);
      const lengths = new Set<number>();
      
      materials.forEach(material => {
        expect(material.id).toBeDefined();
        expect(material.length).toBeGreaterThan(0);
        expect(material.length).toBeLessThanOrEqual(20000);
        
        // 檢查長度不重複
        expect(lengths.has(material.length)).toBe(false);
        lengths.add(material.length);
      });
    });
  });
});