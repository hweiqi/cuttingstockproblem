import { MaterialService } from '../../services/MaterialService';
import { PartService } from '../../services/PartService';
import { RandomTestGenerator } from '../../utils/RandomTestGenerator';

describe('測試場景整合測試', () => {
  let materialService: MaterialService;
  let partService: PartService;
  let generator: RandomTestGenerator;

  beforeEach(() => {
    materialService = new MaterialService();
    partService = new PartService();
    generator = new RandomTestGenerator();
  });

  afterEach(() => {
    materialService.clearAllMaterials();
    partService.clearAllParts();
  });

  test('應該能夠生成並載入50000個零件的測試場景', () => {
    const config = {
      partCount: { min: 50000, max: 50000 },
      partLength: { min: 500, max: 5000 }
    };
    
    const scenario = generator.generateTestScenario(config);
    
    expect(scenario.parts.length).toBe(50000);
    
    // 模擬 onApplyScenario 的行為
    materialService.clearAllMaterials();
    partService.clearAllParts();
    
    // 載入測試材料（如果有提供）
    if (scenario.materials && scenario.materials.length > 0) {
      scenario.materials.forEach(m => {
        materialService.addMaterial(m.length);
      });
    }
    
    // 載入測試零件
    scenario.parts.forEach(p => {
      partService.addPart(p.length, p.quantity, p.angles);
    });
    
    // 驗證零件已成功載入
    const loadedParts = partService.getAllParts();
    expect(loadedParts.length).toBe(50000);
    
    // 驗證總零件數量
    const totalPartsCount = partService.getTotalPartsCount();
    const expectedCount = scenario.parts.reduce((sum, p) => sum + p.quantity, 0);
    expect(totalPartsCount).toBe(expectedCount);
  });

  test('應該能夠正確清除所有資料', () => {
    // 先加入一些資料
    materialService.addMaterial(6000);
    materialService.addMaterial(9000);
    partService.addPart(1000, 5);
    partService.addPart(2000, 3);
    
    expect(materialService.getAllMaterials().length).toBe(2);
    expect(partService.getAllParts().length).toBe(2);
    
    // 清除所有資料
    materialService.clearAllMaterials();
    partService.clearAllParts();
    
    expect(materialService.getAllMaterials().length).toBe(0);
    expect(partService.getAllParts().length).toBe(0);
  });

  test('測試較小規模的場景生成', () => {
    const config = {
      partCount: { min: 10, max: 25 },
      partLength: { min: 800, max: 4000 }
    };
    
    const scenario = generator.generateTestScenario(config);
    
    expect(scenario.parts.length).toBeGreaterThanOrEqual(10);
    expect(scenario.parts.length).toBeLessThanOrEqual(25);
    
    scenario.parts.forEach(part => {
      expect(part.length).toBeGreaterThanOrEqual(800);
      expect(part.length).toBeLessThanOrEqual(4000);
    });
  });
});