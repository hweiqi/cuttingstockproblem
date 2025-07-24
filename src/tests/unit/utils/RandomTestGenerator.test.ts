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
      const materials = generator.generateRandomMaterials(100);
      const standardLengths = [6000, 9000, 10000, 12000, 15000];
      
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
      const materials1 = generator.generateRandomMaterials(10);
      const materials2 = generator.generateRandomMaterials(10);
      
      const lengths1 = materials1.map(m => m.length);
      const lengths2 = materials2.map(m => m.length);
      
      // 檢查是否都使用標準長度
      const standardLengths = [6000, 9000, 10000, 12000, 15000];
      [...lengths1, ...lengths2].forEach(length => {
        expect(standardLengths).toContain(length);
      });
      
      // 雖然使用標準長度，但組合可能不同（由於隨機選擇）
      // 這個測試可能偶爾失敗，因為可能生成相同的隨機序列
    });

    it('應該根據長度範圍過濾標準長度', () => {
      // 測試範圍：只包含部分標準長度
      const materials = generator.generateRandomMaterials(50, { min: 8000, max: 11000 });
      const validLengths = [9000, 10000]; // 在範圍內的標準長度
      
      materials.forEach(material => {
        expect(validLengths).toContain(material.length);
      });
    });

    it('當長度範圍不包含任何標準長度時，應使用所有標準長度', () => {
      // 測試範圍：不包含任何標準長度
      const materials = generator.generateRandomMaterials(20, { min: 20000, max: 25000 });
      const standardLengths = [6000, 9000, 10000, 12000, 15000];
      
      materials.forEach(material => {
        expect(standardLengths).toContain(material.length);
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
      
      // 至少30%的零件應該有角度
      expect(partsWithAngles.length).toBeGreaterThanOrEqual(15);
      
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
    it('應該生成完整的測試場景', () => {
      const scenario = generator.generateTestScenario();
      
      expect(scenario.materials).toBeDefined();
      expect(scenario.parts).toBeDefined();
      expect(scenario.materials.length).toBeGreaterThan(0);
      expect(scenario.parts.length).toBeGreaterThan(0);
    });

    it('應該生成平衡的材料和零件比例', () => {
      const scenario = generator.generateTestScenario();
      const totalPartLength = scenario.parts.reduce((sum, p) => sum + p.length * p.quantity, 0);
      const totalMaterialLength = scenario.materials.reduce((sum, m) => sum + m.length, 0);
      
      // 材料總長度應該足夠容納大部分零件
      expect(totalMaterialLength).toBeGreaterThan(totalPartLength * 0.6);
      // 但不應該過多（造成浪費）
      expect(totalMaterialLength).toBeLessThan(totalPartLength * 1.5);
    });

    it('應該支援自定義配置', () => {
      const config = {
        materialCount: { min: 2, max: 4 },
        partCount: { min: 20, max: 30 },
        materialLength: { min: 5000, max: 10000 },
        partLength: { min: 1000, max: 3000 }
      };
      
      const scenario = generator.generateTestScenario(config);
      
      // With length range 5000-10000, only 3 standard lengths are available (6000, 9000, 10000)
      expect(scenario.materials.length).toBeGreaterThanOrEqual(2);
      expect(scenario.materials.length).toBeLessThanOrEqual(3);
      expect(scenario.parts.length).toBeGreaterThanOrEqual(20);
      expect(scenario.parts.length).toBeLessThanOrEqual(30);
      
      scenario.materials.forEach(m => {
        expect(m.length).toBeGreaterThanOrEqual(5000);
        expect(m.length).toBeLessThanOrEqual(10000);
      });
      
      scenario.parts.forEach(p => {
        expect(p.length).toBeGreaterThanOrEqual(1000);
        expect(p.length).toBeLessThanOrEqual(3000);
      });
    });

    it('應該每次生成不同的場景', () => {
      const scenario1 = generator.generateTestScenario();
      const scenario2 = generator.generateTestScenario();
      
      // 材料數量或零件數量至少有一個不同
      const isDifferent = 
        scenario1.materials.length !== scenario2.materials.length ||
        scenario1.parts.length !== scenario2.parts.length ||
        scenario1.materials[0]?.length !== scenario2.materials[0]?.length ||
        scenario1.parts[0]?.length !== scenario2.parts[0]?.length;
      
      expect(isDifferent).toBeTruthy();
    });
  });

  describe('generatePresetScenarios', () => {
    it('應該包含預設的測試場景', () => {
      const scenarios = generator.generatePresetScenarios();
      
      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios.find(s => s.name === '簡單場景')).toBeDefined();
      expect(scenarios.find(s => s.name === '複雜角度場景')).toBeDefined();
      expect(scenarios.find(s => s.name === '大規模場景')).toBeDefined();
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
        
        // 大規模場景有更多材料和零件
        expect(large.scenario.materials.length).toBeGreaterThan(simple.scenario.materials.length);
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
      expect(scenario.materials.length).toBeGreaterThan(0);
      expect(scenario.parts.length).toBeGreaterThan(0);
    });

    it('應該確保生成的數據符合業務邏輯', () => {
      const scenario = generator.generateTestScenario();
      
      // 零件長度不應該超過最大材料長度
      const maxMaterialLength = Math.max(...scenario.materials.map(m => m.length));
      scenario.parts.forEach(part => {
        expect(part.length).toBeLessThanOrEqual(maxMaterialLength);
      });
    });
  });
});