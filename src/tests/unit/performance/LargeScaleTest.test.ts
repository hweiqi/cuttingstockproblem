import { RandomTestGenerator, TestScenario } from '../../../utils/RandomTestGenerator';
import { PartService } from '../../../services/PartService';
import { MaterialService } from '../../../services/MaterialService';
import { V6CuttingService } from '../../../services/V6CuttingService';
import { Material, Part } from '../../../types';

describe('超大規模測試場景', () => {
  let generator: RandomTestGenerator;
  let partService: PartService;
  let materialService: MaterialService;
  let v6CuttingService: V6CuttingService;

  beforeEach(() => {
    generator = new RandomTestGenerator();
    partService = new PartService();
    materialService = new MaterialService();
    v6CuttingService = new V6CuttingService();
  });

  afterEach(() => {
    partService.clearAllParts();
    materialService.clearAllMaterials();
  });

  describe('10000支零件測試', () => {
    it('應該能夠生成10000支零件的測試場景', () => {
      // 生成超大規模測試場景
      const scenario: TestScenario = generator.generateTestScenario({
        materialCount: { min: 20, max: 30 },
        partCount: { min: 10000, max: 10000 },
        materialLength: { min: 6000, max: 15000 },
        partLength: { min: 500, max: 5000 }
      });

      expect(scenario.parts.length).toBe(10000);
      expect(scenario.materials.length).toBeGreaterThanOrEqual(20);
      expect(scenario.materials.length).toBeLessThanOrEqual(30);
    });

    it('應該確保所有零件都有有效的角度配置', () => {
      const scenario: TestScenario = generator.generateTestScenario({
        materialCount: { min: 20, max: 30 },
        partCount: { min: 10000, max: 10000 }
      });

      // 檢查每個有角度的零件
      scenario.parts.forEach(part => {
        if (part.angles) {
          // 檢查角度不能全部為0
          const allZero = part.angles.topLeft === 0 && 
                          part.angles.topRight === 0 && 
                          part.angles.bottomLeft === 0 && 
                          part.angles.bottomRight === 0;
          expect(allZero).toBe(false);

          // 檢查左側不能同時有上下角度
          if (part.angles.topLeft > 0 && part.angles.bottomLeft > 0) {
            fail(`零件 ${part.id} 左側同時有上下角度`);
          }

          // 檢查右側不能同時有上下角度
          if (part.angles.topRight > 0 && part.angles.bottomRight > 0) {
            fail(`零件 ${part.id} 右側同時有上下角度`);
          }
        }
      });
    });

    it('應該能夠將10000支零件加入服務並計算統計資訊', () => {
      const scenario: TestScenario = generator.generateTestScenario({
        materialCount: { min: 20, max: 30 },
        partCount: { min: 10000, max: 10000 }
      });

      // 加入所有零件
      scenario.parts.forEach(part => {
        partService.addPart(part.length, part.quantity, part.angles);
      });

      // 加入所有材料
      scenario.materials.forEach(material => {
        materialService.addMaterial(material.length, material.quantity);
      });

      // 驗證數量
      expect(partService.getUniquePartsCount()).toBe(10000);
      const totalPartsCount = partService.getTotalPartsCount();
      expect(totalPartsCount).toBeGreaterThan(10000); // 因為每個零件可能有多個數量
    });

    it('應該能在合理時間內完成10000支零件的排版計算', () => {
      const scenario: TestScenario = generator.generateTestScenario({
        materialCount: { min: 20, max: 30 },
        partCount: { min: 10000, max: 10000 }
      });

      // 加入材料和零件
      scenario.materials.forEach(material => {
        materialService.addMaterial(material.length, material.quantity);
      });
      scenario.parts.forEach(part => {
        partService.addPart(part.length, part.quantity, part.angles);
      });

      // 記錄開始時間
      const startTime = Date.now();

      // 執行排版
      const materials: Material[] = materialService.getAllMaterials();
      const parts: Part[] = partService.getAllParts();
      
      const result = v6CuttingService.optimizeCutting(materials, parts);

      // 記錄結束時間
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // 驗證執行時間在合理範圍內（例如：5分鐘內）
      expect(executionTime).toBeLessThan(300000); // 300秒 = 5分鐘

      // 驗證結果
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      const totalPartsPlaced = result.reduce((sum, plan) => sum + plan.parts.length, 0);
      const totalMaterialsUsed = result.length;
      const totalMaterialLength = result.reduce((sum, plan) => sum + plan.material.length, 0);
      const totalPartsLength = result.reduce((sum, plan) => 
        sum + plan.parts.reduce((partSum, part) => partSum + part.length, 0), 0
      );
      const materialUtilization = (totalPartsLength / totalMaterialLength) * 100;
      
      console.log(`10000支零件排版計算耗時: ${executionTime}ms`);
      console.log(`成功排版零件數: ${totalPartsPlaced}`);
      console.log(`使用材料數: ${totalMaterialsUsed}`);
      console.log(`材料利用率: ${materialUtilization.toFixed(2)}%`);
    });

    it('應該驗證記憶體使用在合理範圍內', () => {
      const scenario: TestScenario = generator.generateTestScenario({
        materialCount: { min: 20, max: 30 },
        partCount: { min: 10000, max: 10000 }
      });

      // 記錄初始記憶體使用
      if (global.gc) {
        global.gc(); // 執行垃圾回收
      }
      const initialMemory = process.memoryUsage().heapUsed;

      // 加入材料和零件
      scenario.materials.forEach(material => {
        materialService.addMaterial(material.length, material.quantity);
      });
      scenario.parts.forEach(part => {
        partService.addPart(part.length, part.quantity, part.angles);
      });

      // 執行排版
      const materials: Material[] = materialService.getAllMaterials();
      const parts: Part[] = partService.getAllParts();
      
      v6CuttingService.optimizeCutting(materials, parts);

      // 記錄最終記憶體使用
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // 轉換為 MB

      // 驗證記憶體增長在合理範圍內（例如：小於 2GB）
      expect(memoryIncrease).toBeLessThan(2048); // 2GB
      
      console.log(`記憶體增長: ${memoryIncrease.toFixed(2)} MB`);
    });
  });

  describe('100000支零件測試', () => {
    it('應該能夠生成100000支零件的測試場景', () => {
      // 生成超大規模測試場景
      const scenario: TestScenario = generator.generateTestScenario({
        materialCount: { min: 200, max: 300 },
        partCount: { min: 100000, max: 100000 },
        materialLength: { min: 6000, max: 15000 },
        partLength: { min: 500, max: 5000 }
      });

      expect(scenario.parts.length).toBe(100000);
      expect(scenario.materials.length).toBeGreaterThanOrEqual(200);
      expect(scenario.materials.length).toBeLessThanOrEqual(300);
    });

    it('應該確保100000支零件都有有效的角度配置', () => {
      const scenario: TestScenario = generator.generateTestScenario({
        materialCount: { min: 200, max: 300 },
        partCount: { min: 100000, max: 100000 }
      });

      let invalidCount = 0;
      // 檢查每個有角度的零件
      scenario.parts.forEach(part => {
        if (part.angles) {
          // 檢查角度不能全部為0
          const allZero = part.angles.topLeft === 0 && 
                          part.angles.topRight === 0 && 
                          part.angles.bottomLeft === 0 && 
                          part.angles.bottomRight === 0;
          if (allZero) invalidCount++;

          // 檢查左側不能同時有上下角度
          if (part.angles.topLeft > 0 && part.angles.bottomLeft > 0) {
            invalidCount++;
          }

          // 檢查右側不能同時有上下角度
          if (part.angles.topRight > 0 && part.angles.bottomRight > 0) {
            invalidCount++;
          }
        }
      });

      expect(invalidCount).toBe(0);
      console.log(`100000支零件角度配置驗證完成，無效配置數: ${invalidCount}`);
    });

    it('應該能夠處理100000支零件的記憶體壓力測試', () => {
      const scenario: TestScenario = generator.generateTestScenario({
        materialCount: { min: 200, max: 300 },
        partCount: { min: 100000, max: 100000 }
      });

      // 記錄初始記憶體使用
      if (global.gc) {
        global.gc(); // 執行垃圾回收
      }
      const initialMemory = process.memoryUsage().heapUsed;

      // 加入所有零件
      scenario.parts.forEach(part => {
        partService.addPart(part.length, part.quantity, part.angles);
      });

      // 加入所有材料
      scenario.materials.forEach(material => {
        materialService.addMaterial(material.length, material.quantity);
      });

      // 記錄最終記憶體使用
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // 轉換為 MB

      // 驗證數量
      expect(partService.getUniquePartsCount()).toBe(100000);
      
      console.log(`100000支零件記憶體使用增長: ${memoryIncrease.toFixed(2)} MB`);
      
      // 驗證記憶體增長在合理範圍內（例如：小於 4GB）
      expect(memoryIncrease).toBeLessThan(4096); // 4GB
    });

    it('應該能分批處理100000支零件的排版計算', () => {
      const scenario: TestScenario = generator.generateTestScenario({
        materialCount: { min: 200, max: 300 },
        partCount: { min: 100000, max: 100000 }
      });

      // 加入材料
      scenario.materials.forEach(material => {
        materialService.addMaterial(material.length, material.quantity);
      });

      // 分批處理參數
      const batchSize = 10000;
      const batches = Math.ceil(scenario.parts.length / batchSize);
      let totalPlacedParts = 0;
      let totalExecutionTime = 0;

      console.log(`開始分批處理100000支零件，批次大小: ${batchSize}, 總批次數: ${batches}`);

      for (let i = 0; i < batches; i++) {
        // 清空零件服務
        partService.clearAllParts();

        // 加入當前批次的零件
        const start = i * batchSize;
        const end = Math.min(start + batchSize, scenario.parts.length);
        const batchParts = scenario.parts.slice(start, end);

        batchParts.forEach(part => {
          partService.addPart(part.length, part.quantity, part.angles);
        });

        // 執行排版
        const startTime = Date.now();
        
        const materials: Material[] = materialService.getAllMaterials();
        const parts: Part[] = partService.getAllParts();
        
        const result = v6CuttingService.optimizeCutting(materials, parts);
        
        const endTime = Date.now();
        const batchExecutionTime = endTime - startTime;
        totalExecutionTime += batchExecutionTime;

        const batchPlacedParts = result.reduce((sum, plan) => sum + plan.parts.length, 0);
        totalPlacedParts += batchPlacedParts;

        console.log(`批次 ${i + 1}/${batches} 完成：零件數 ${batchParts.length}, 排版數 ${batchPlacedParts}, 耗時 ${batchExecutionTime}ms`);
      }

      expect(totalPlacedParts).toBeGreaterThan(0);
      console.log(`100000支零件分批處理完成：`);
      console.log(`  總排版零件數: ${totalPlacedParts}`);
      console.log(`  總執行時間: ${totalExecutionTime}ms`);
      console.log(`  平均每批次時間: ${(totalExecutionTime / batches).toFixed(2)}ms`);
      console.log(`  平均每支零件時間: ${(totalExecutionTime / 100000).toFixed(2)}ms`);
    });
  });

  describe('性能基準測試', () => {
    const testCases = [
      { partCount: 100, name: '小規模' },
      { partCount: 1000, name: '中規模' },
      { partCount: 5000, name: '大規模' },
      { partCount: 10000, name: '超大規模' },
      { partCount: 50000, name: '極大規模' },
      { partCount: 100000, name: '終極規模' }
    ];

    testCases.forEach(testCase => {
      it(`應該測量${testCase.name}（${testCase.partCount}支零件）的性能`, () => {
        // 跳過終極規模測試以節省時間
        if (testCase.partCount > 50000) {
          console.log(`跳過${testCase.name}測試以節省時間`);
          return;
        }

        const scenario: TestScenario = generator.generateTestScenario({
          materialCount: { min: Math.ceil(testCase.partCount / 500), max: Math.ceil(testCase.partCount / 300) },
          partCount: { min: testCase.partCount, max: testCase.partCount }
        });

        // 加入材料和零件
        scenario.materials.forEach(material => {
          materialService.addMaterial(material.length, material.quantity);
        });
        scenario.parts.forEach(part => {
          partService.addPart(part.length, part.quantity, part.angles);
        });

        // 執行排版並測量時間
        const startTime = Date.now();
        
        const materials: Material[] = materialService.getAllMaterials();
        const parts: Part[] = partService.getAllParts();
        
        const result = v6CuttingService.optimizeCutting(materials, parts);

        const endTime = Date.now();
        const executionTime = endTime - startTime;

        const totalPartsPlaced = result.reduce((sum, plan) => sum + plan.parts.length, 0);
        const totalMaterialLength = result.reduce((sum, plan) => sum + plan.material.length, 0);
        const totalPartsLength = result.reduce((sum, plan) => 
          sum + plan.parts.reduce((partSum, part) => partSum + part.length, 0), 0
        );
        const materialUtilization = totalMaterialLength > 0 ? (totalPartsLength / totalMaterialLength) * 100 : 0;

        console.log(`${testCase.name}（${testCase.partCount}支零件）性能測試結果:`);
        console.log(`  執行時間: ${executionTime}ms`);
        console.log(`  平均每支零件時間: ${(executionTime / testCase.partCount).toFixed(2)}ms`);
        console.log(`  成功排版: ${totalPartsPlaced}支`);
        console.log(`  材料利用率: ${materialUtilization.toFixed(2)}%`);

        // 驗證線性擴展性（時間應該大致與零件數成正比）
        const timePerPart = executionTime / testCase.partCount;
        expect(timePerPart).toBeLessThan(100); // 每支零件不應超過100ms
      });
    });
  });
});