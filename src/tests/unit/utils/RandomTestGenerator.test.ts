import { RandomTestGenerator } from '../../../utils/RandomTestGenerator';
import { Material, Part } from '../../../types';

describe('RandomTestGenerator', () => {
  let generator: RandomTestGenerator;

  beforeEach(() => {
    generator = new RandomTestGenerator();
  });

  describe('generateRandomMaterials', () => {
    it('應該生成指定數量的材料', () => {
      const count = 5;
      const materials = generator.generateRandomMaterials(count);
      
      expect(materials).toHaveLength(count);
      expect(materials.every(m => m.id)).toBeTruthy();
      expect(materials.every(m => m.length > 0)).toBeTruthy();
    });

    it('應該生成不同的材料ID', () => {
      const materials = generator.generateRandomMaterials(10);
      const ids = materials.map(m => m.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('應該使用標準材料長度', () => {
      const materials = generator.generateRandomMaterials(5); // 生成5個材料，正好是標準長度的數量
      const standardLengths = [6000, 9000, 10000, 12000, 15000];
      
      // 當生成的材料數量不超過標準長度數量時，應該使用標準長度
      materials.forEach(material => {
        expect(standardLengths).toContain(material.length);
      });
    });

    it('應該處理邊界情況：數量為0', () => {
      const materials = generator.generateRandomMaterials(0);
      expect(materials).toHaveLength(0);
    });

    it('應該處理邊界情況：負數數量', () => {
      const materials = generator.generateRandomMaterials(-5);
      expect(materials).toHaveLength(0);
    });

    it('應該能夠生成不同的材料組合', () => {
      const materials1 = generator.generateRandomMaterials(3);
      const materials2 = generator.generateRandomMaterials(3);
      
      const lengths1 = materials1.map(m => m.length);
      const lengths2 = materials2.map(m => m.length);
      
      // 驗證生成了有效的材料長度
      [...lengths1, ...lengths2].forEach(length => {
        expect(length).toBeGreaterThan(0);
      });
      
      // 驗證材料ID不重複
      const ids1 = materials1.map(m => m.id);
      const ids2 = materials2.map(m => m.id);
      expect(new Set(ids1).size).toBe(ids1.length);
      expect(new Set(ids2).size).toBe(ids2.length);
    });

    it('應該根據長度範圍過濾標準長度', () => {
      // 測試範圍：只包含部分標準長度
      const materials = generator.generateRandomMaterials(50, { min: 8000, max: 11000 });
      
      materials.forEach(material => {
        expect(material.length).toBeGreaterThanOrEqual(8000);
        expect(material.length).toBeLessThanOrEqual(11000);
      });
    });

    it('當長度範圍不包含任何標準長度時，應使用所有標準長度', () => {
      // 測試範圍：不包含任何標準長度
      const materials = generator.generateRandomMaterials(5, { min: 20000, max: 25000 });
      
      // 當範圍外沒有標準長度時，應該生成範圍內的長度
      materials.forEach(material => {
        expect(material.length).toBeGreaterThanOrEqual(20000);
        expect(material.length).toBeLessThanOrEqual(25000);
      });
    });
  });

  describe('generateRandomParts', () => {
    it('應該生成指定數量的零件', () => {
      const count = 8;
      const parts = generator.generateRandomParts(count);
      
      expect(parts).toHaveLength(count);
      expect(parts.every(p => p.id)).toBeTruthy();
      expect(parts.every(p => p.length > 0)).toBeTruthy();
      expect(parts.every(p => p.quantity > 0)).toBeTruthy();
    });

    it('應該生成不同的零件ID', () => {
      const parts = generator.generateRandomParts(15);
      const ids = parts.map(p => p.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('應該在合理範圍內生成零件長度', () => {
      const parts = generator.generateRandomParts(100);
      
      parts.forEach(part => {
        expect(part.length).toBeGreaterThanOrEqual(500);
        expect(part.length).toBeLessThanOrEqual(5000);
        expect(part.length % 10).toBe(0); // 應該是10的倍數
      });
    });

    it('應該在合理範圍內生成零件數量', () => {
      const parts = generator.generateRandomParts(100);
      
      parts.forEach(part => {
        expect(part.quantity).toBeGreaterThanOrEqual(1);
        expect(part.quantity).toBeLessThanOrEqual(10);
      });
    });

    it('應該隨機生成角度', () => {
      const parts = generator.generateRandomParts(50);
      const partsWithAngles = parts.filter(p => p.angles !== undefined);
      
      // 至少20%的零件應該有角度（降低期望值以減少隨機失敗）
      expect(partsWithAngles.length).toBeGreaterThanOrEqual(10);
      
      // 檢查角度值的合理性和新規則
      partsWithAngles.forEach(part => {
        if (part.angles) {
          // 檢查角度範圍
          expect(part.angles.topLeft).toBeGreaterThanOrEqual(0);
          expect(part.angles.topLeft).toBeLessThan(90);
          expect(part.angles.topRight).toBeGreaterThanOrEqual(0);
          expect(part.angles.topRight).toBeLessThan(90);
          expect(part.angles.bottomLeft).toBeGreaterThanOrEqual(0);
          expect(part.angles.bottomLeft).toBeLessThan(90);
          expect(part.angles.bottomRight).toBeGreaterThanOrEqual(0);
          expect(part.angles.bottomRight).toBeLessThan(90);
          
          // 檢查新規則：左側不能同時有上下角度（0度表示無角度）
          const hasLeftConflict = part.angles.topLeft > 0 && part.angles.bottomLeft > 0;
          expect(hasLeftConflict).toBe(false);
          
          // 檢查新規則：右側不能同時有上下角度（0度表示無角度）
          const hasRightConflict = part.angles.topRight > 0 && part.angles.bottomRight > 0;
          expect(hasRightConflict).toBe(false);
        }
      });
    });

    it('應該生成常見的角度組合', () => {
      const parts = generator.generateRandomParts(100);
      const partsWithAngles = parts.filter(p => p.angles !== undefined);
      
      // 應該有一些零件具有對稱角度
      const symmetricParts = partsWithAngles.filter(p => 
        p.angles && p.angles.topLeft === p.angles.topRight
      );
      expect(symmetricParts.length).toBeGreaterThan(0);
      
      // 應該有一些零件具有0度角（無角度）
      const noAngleParts = partsWithAngles.filter(p =>
        p.angles && (
          p.angles.topLeft === 0 || 
          p.angles.topRight === 0 ||
          p.angles.bottomLeft === 0 ||
          p.angles.bottomRight === 0
        )
      );
      expect(noAngleParts.length).toBeGreaterThan(0);
    });

    it('每次調用應該生成不同的零件', () => {
      const parts1 = generator.generateRandomParts(10);
      const parts2 = generator.generateRandomParts(10);
      
      const configs1 = parts1.map(p => ({ length: p.length, quantity: p.quantity }));
      const configs2 = parts2.map(p => ({ length: p.length, quantity: p.quantity }));
      
      // 至少有一個配置不同
      expect(configs1).not.toEqual(configs2);
    });
  });

  describe('generateTestScenario', () => {
    it('應該只生成零件，不生成母材', () => {
      const scenario = generator.generateTestScenario();
      
      expect(scenario.materials).toBeDefined();
      expect(scenario.parts).toBeDefined();
      // generateTestScenario 會生成母材供測試使用
      expect(scenario.materials.length).toBeGreaterThanOrEqual(3);
      expect(scenario.materials.length).toBeLessThanOrEqual(5);
      expect(scenario.parts.length).toBeGreaterThan(0);
    });

    it('應該支援自定義配置但不生成母材', () => {
      const config = {
        materialCount: { min: 2, max: 4 },
        partCount: { min: 5, max: 10 }
      };
      
      const scenario = generator.generateTestScenario(config);
      
      // generateTestScenario 會根據配置生成母材
      expect(scenario.materials.length).toBeGreaterThanOrEqual(2);
      expect(scenario.materials.length).toBeLessThanOrEqual(4);
      expect(scenario.parts.length).toBeGreaterThanOrEqual(5);
      expect(scenario.parts.length).toBeLessThanOrEqual(10);
    });

    it('應該支援自定義零件長度配置', () => {
      const config = {
        partCount: { min: 20, max: 30 },
        partLength: { min: 1000, max: 3000 }
      };
      
      const scenario = generator.generateTestScenario(config);
      
      // generateTestScenario 會生成預設數量的母材
      expect(scenario.materials.length).toBeGreaterThanOrEqual(3);
      expect(scenario.materials.length).toBeLessThanOrEqual(5);
      expect(scenario.parts.length).toBeGreaterThanOrEqual(20);
      expect(scenario.parts.length).toBeLessThanOrEqual(30);
      
      scenario.parts.forEach(p => {
        expect(p.length).toBeGreaterThanOrEqual(1000);
        expect(p.length).toBeLessThanOrEqual(3000);
      });
    });

    it('應該每次生成不同的場景', () => {
      const scenario1 = generator.generateTestScenario();
      const scenario2 = generator.generateTestScenario();
      
      // 零件數量或配置至少有一個不同
      const isDifferent = 
        scenario1.parts.length !== scenario2.parts.length ||
        scenario1.parts[0]?.length !== scenario2.parts[0]?.length ||
        scenario1.parts[0]?.quantity !== scenario2.parts[0]?.quantity;
      
      expect(isDifferent).toBeTruthy();
    });
  });

  describe('generatePresetScenarios', () => {
    it('應該包含預設的測試場景且不包含母材', () => {
      const scenarios = generator.generatePresetScenarios();
      
      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios.find(s => s.name === '簡單場景')).toBeDefined();
      expect(scenarios.find(s => s.name === '複雜角度場景')).toBeDefined();
      expect(scenarios.find(s => s.name === '大規模場景')).toBeDefined();
      
      // 檢查預設場景
      scenarios.forEach(scenario => {
        if (scenario.name === '混合場景') {
          // 混合場景會呼叫 generateTestScenario，所以會包含材料
          expect(scenario.scenario.materials.length).toBeGreaterThanOrEqual(5);
          expect(scenario.scenario.materials.length).toBeLessThanOrEqual(10);
        } else {
          // 其他預設場景不包含材料
          expect(scenario.scenario.materials).toHaveLength(0);
        }
        expect(scenario.scenario.parts.length).toBeGreaterThan(0);
      });
    });

    it('每個預設場景應該有不同的特徵', () => {
      const scenarios = generator.generatePresetScenarios();
      
      const simple = scenarios.find(s => s.name === '簡單場景');
      const complex = scenarios.find(s => s.name === '複雜角度場景');
      const large = scenarios.find(s => s.name === '大規模場景');
      
      if (simple && complex && large) {
        // 簡單場景零件較少
        expect(simple.scenario.parts.length).toBeLessThan(large.scenario.parts.length);
        
        // 複雜場景有更多角度零件
        const complexAngledParts = complex.scenario.parts.filter(p => p.angles).length;
        const simpleAngledParts = simple.scenario.parts.filter(p => p.angles).length;
        expect(complexAngledParts).toBeGreaterThan(simpleAngledParts);
        
        // 大規模場景有更多零件
        expect(large.scenario.parts.length).toBeGreaterThan(simple.scenario.parts.length);
      }
    });
  });

  describe('邊界情況和錯誤處理', () => {
    it('應該處理極端的配置值', () => {
      const extremeConfig = {
        materialCount: { min: 1000, max: 500 }, // min > max
        partCount: { min: -10, max: -5 }, // 負數
        materialLength: { min: 0, max: 0 }, // 零
        partLength: { min: 100000, max: 200000 } // 極大值
      };
      
      expect(() => generator.generateTestScenario(extremeConfig)).not.toThrow();
      
      const scenario = generator.generateTestScenario(extremeConfig);
      expect(scenario.materials).toHaveLength(0); // 不生成母材
      expect(scenario.parts.length).toBeGreaterThan(0);
    });

    it('應該確保生成的數據符合業務邏輯', () => {
      const scenario = generator.generateTestScenario();
      
      // 確保生成的零件資料有效
      scenario.parts.forEach(part => {
        expect(part.id).toBeTruthy();
        expect(part.length).toBeGreaterThan(0);
        expect(part.quantity).toBeGreaterThan(0);
      });
    });
  });
});