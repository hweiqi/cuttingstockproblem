import { RandomTestGenerator } from '../../utils/RandomTestGenerator';
import { V6CuttingService } from '../../services/V6CuttingService';
import { Material, Part } from '../../types';

describe('測試場景選擇器基本功能測試', () => {
  let generator: RandomTestGenerator;
  let service: V6CuttingService;

  beforeEach(() => {
    generator = new RandomTestGenerator();
    service = new V6CuttingService();
  });

  describe('預設場景基本測試', () => {
    it('所有預設場景應該正常生成', () => {
      const presetScenarios = generator.generatePresetScenarios();
      
      expect(presetScenarios.length).toBeGreaterThan(0);
      
      presetScenarios.forEach(preset => {
        console.log(`檢查預設場景：${preset.name} - ${preset.description}`);
        
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.scenario).toBeDefined();
        expect(preset.scenario.parts).toBeDefined();
        expect(preset.scenario.parts.length).toBeGreaterThan(0);
        
        // 計算總零件數
        const totalParts = preset.scenario.parts.reduce((sum, p) => sum + (p.quantity || 1), 0);
        console.log(`  - 零件種類：${preset.scenario.parts.length}`);
        console.log(`  - 總零件數：${totalParts}`);
      });
    });
  });

  describe('隨機場景生成測試', () => {
    it('完全隨機場景應該正常生成', () => {
      const scenario = generator.generateTestScenario();
      
      expect(scenario.parts).toBeDefined();
      expect(scenario.materials).toBeDefined();
      expect(scenario.parts.length).toBeGreaterThan(0);
      expect(scenario.parts.length).toBeLessThanOrEqual(15); // 默認最大15
      expect(scenario.materials.length).toBeGreaterThan(0);
      expect(scenario.materials.length).toBeLessThanOrEqual(5); // 默認最大5
      
      console.log(`生成隨機場景：${scenario.parts.length} 種零件，${scenario.materials.length} 種材料`);
    });

    it('中等複雜度場景應該符合配置', () => {
      const config = {
        partCount: { min: 10, max: 25 },
        partLength: { min: 800, max: 4000 }
      };
      const scenario = generator.generateTestScenario(config);
      
      expect(scenario.parts.length).toBeGreaterThanOrEqual(10);
      expect(scenario.parts.length).toBeLessThanOrEqual(25);
      
      // 檢查零件長度範圍
      scenario.parts.forEach(part => {
        expect(part.length).toBeGreaterThanOrEqual(800);
        expect(part.length).toBeLessThanOrEqual(4000);
      });
      
      console.log(`生成中等複雜度場景：${scenario.parts.length} 種零件`);
    });
  });

  describe('小規模優化測試', () => {
    it('簡單場景應該能成功優化', () => {
      const presetScenarios = generator.generatePresetScenarios();
      const simpleScenario = presetScenarios.find(s => s.name === '簡單場景');
      
      expect(simpleScenario).toBeDefined();
      
      if (simpleScenario) {
        // 添加默認材料
        const materials: Material[] = [
          { id: 'M1', length: 6000 },
          { id: 'M2', length: 9000 },
          { id: 'M3', length: 12000 }
        ];
        
        const result = service.optimize(materials, simpleScenario.scenario.parts, 3, 10);
        
        expect(result.cutPlans).toBeDefined();
        expect(result.cutPlans.length).toBeGreaterThan(0);
        expect(result.totalMaterialsUsed).toBeGreaterThan(0);
        expect(result.overallEfficiency).toBeGreaterThan(0);
        
        console.log('簡單場景優化結果：');
        console.log(`  - 使用材料數：${result.totalMaterialsUsed}`);
        console.log(`  - 整體效率：${result.overallEfficiency?.toFixed(2)}%`);
        console.log(`  - 總浪費：${result.totalWaste?.toFixed(2)}mm`);
      }
    });

    it('複雜角度場景應該能成功優化', () => {
      const presetScenarios = generator.generatePresetScenarios();
      const complexScenario = presetScenarios.find(s => s.name === '複雜角度場景');
      
      expect(complexScenario).toBeDefined();
      
      if (complexScenario) {
        // 添加默認材料
        const materials: Material[] = [
          { id: 'M1', length: 6000 },
          { id: 'M2', length: 9000 },
          { id: 'M3', length: 12000 },
          { id: 'M4', length: 15000 }
        ];
        
        const result = service.optimize(materials, complexScenario.scenario.parts, 3, 10);
        
        expect(result.cutPlans).toBeDefined();
        expect(result.cutPlans.length).toBeGreaterThan(0);
        
        // 檢查是否有共刀優化
        if (result.sharedCuttingInfo) {
          console.log('複雜角度場景優化結果：');
          console.log(`  - 共刀切割數：${result.sharedCuttingInfo.totalSharedCuts}`);
          console.log(`  - 共刀節省：${result.sharedCuttingInfo.totalSavings?.toFixed(2)}mm`);
        }
        
        console.log(`  - 使用材料數：${result.totalMaterialsUsed}`);
        console.log(`  - 整體效率：${result.overallEfficiency?.toFixed(2)}%`);
      }
    });
  });

  describe('數據驗證測試', () => {
    it('生成的零件應該有有效的屬性', () => {
      const parts = generator.generateRandomParts(50);
      
      expect(parts.length).toBe(50);
      
      parts.forEach((part, index) => {
        expect(part.id).toBeDefined();
        expect(part.id).toContain('P');
        expect(part.length).toBeGreaterThan(0);
        expect(part.length % 10).toBe(0); // 長度應該是10的倍數
        expect(part.quantity).toBeGreaterThanOrEqual(1);
        expect(part.quantity).toBeLessThanOrEqual(10);
        
        if (part.angles) {
          // 驗證角度值在有效範圍內
          Object.values(part.angles).forEach(angle => {
            expect(angle).toBeGreaterThanOrEqual(0);
            expect(angle).toBeLessThanOrEqual(90);
          });
        }
      });
    });
    
    it('生成的材料應該有唯一的長度', () => {
      const materials = generator.generateRandomMaterials(10);
      
      expect(materials.length).toBe(10);
      
      const lengths = new Set<number>();
      materials.forEach(material => {
        expect(material.id).toBeDefined();
        expect(material.id).toContain('M');
        expect(material.length).toBeGreaterThan(0);
        
        // 確保長度唯一
        expect(lengths.has(material.length)).toBe(false);
        lengths.add(material.length);
      });
    });
  });
});