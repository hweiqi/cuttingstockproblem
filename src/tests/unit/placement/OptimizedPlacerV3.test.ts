import { describe, test, expect, beforeEach } from '@jest/globals';
import { OptimizedPlacerV3 } from '../../../placement/OptimizedPlacerV3';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material, PlacementConstraints } from '../../../core/v6/models/Material';
import { SharedCutChain } from '../../../core/v6/models/Chain';

describe('OptimizedPlacerV3 - 優化版排版器測試', () => {
  let placer: OptimizedPlacerV3;
  
  const defaultConstraints: PlacementConstraints = {
    cuttingLoss: 5,
    frontEndLoss: 20,
    minPartSpacing: 0
  };

  beforeEach(() => {
    placer = new OptimizedPlacerV3(defaultConstraints);
  });

  const createPart = (id: string, length: number, quantity = 1): PartWithQuantity => ({
    id,
    length,
    quantity,
    angles: { topLeft: 90, topRight: 90, bottomLeft: 90, bottomRight: 90 },
    thickness: 20
  });

  const createMaterial = (id: string, length: number, quantity = 1): Material => ({
    id,
    length,
    quantity,
    type: 'standard'
  });

  describe('記憶化快取', () => {
    test('應該快取相同的排版組合', () => {
      const parts: PartWithQuantity[] = [
        createPart('A', 1000, 5),
        createPart('B', 800, 5)
      ];
      const materials: Material[] = [
        createMaterial('M1', 3000, 10)
      ];

      // 第一次排版
      const startTime1 = performance.now();
      const result1 = placer.placeParts(parts, materials);
      const endTime1 = performance.now();
      const time1 = endTime1 - startTime1;

      // 第二次排版（應該使用快取）
      const startTime2 = performance.now();
      const result2 = placer.placeParts(parts, materials);
      const endTime2 = performance.now();
      const time2 = endTime2 - startTime2;

      expect(result1.placedParts.length).toBe(result2.placedParts.length);
      expect(time2).toBeLessThan(time1 * 0.5); // 第二次應該快很多
    });

    test('應該處理部分相同的排版組合', () => {
      const parts1: PartWithQuantity[] = [
        createPart('A', 1000, 5),
        createPart('B', 800, 5)
      ];
      
      const parts2: PartWithQuantity[] = [
        createPart('A', 1000, 5),
        createPart('B', 800, 5),
        createPart('C', 600, 3)
      ];
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 10)
      ];

      // 第一次排版
      placer.placeParts(parts1, materials);

      // 第二次排版（應該部分使用快取）
      const startTime = performance.now();
      const result = placer.placeParts(parts2, materials);
      const endTime = performance.now();

      expect(result.placedParts.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('分支限界法', () => {
    test('應該提前剪枝不可能的解', () => {
      const parts: PartWithQuantity[] = [
        createPart('A', 2500, 3), // 需要至少 3 個材料
        createPart('B', 1000, 5),
        createPart('C', 800, 5)
      ];
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 2) // 只有 2 個材料
      ];

      const result = placer.placeParts(parts, materials);

      // 應該快速判斷出無法完全排版
      expect(result.unplacedParts.length).toBeGreaterThan(0);
      expect(result.report.processingTime).toBeLessThan(100);
    });

    test('應該使用界限優化搜索', () => {
      const parts: PartWithQuantity[] = [];
      for (let i = 0; i < 20; i++) {
        parts.push(createPart(`P${i}`, 500 + (i % 10) * 100, 2));
      }
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 5),
        createMaterial('M2', 2000, 5)
      ];

      const startTime = performance.now();
      const result = placer.placeParts(parts, materials);
      const endTime = performance.now();

      expect(result.placedParts.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('並行計算', () => {
    test('應該並行處理不同材料實例', () => {
      const parts: PartWithQuantity[] = [
        createPart('A', 1000, 20),
        createPart('B', 800, 20),
        createPart('C', 600, 20)
      ];
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 5),
        createMaterial('M2', 2500, 5),
        createMaterial('M3', 2000, 5)
      ];

      const result = placer.placeParts(parts, materials);

      // 驗證使用了多個材料類型
      const usedMaterialTypes = new Set(result.usedMaterials.map(m => m.material.id));
      expect(usedMaterialTypes.size).toBeGreaterThan(1);
    });
  });

  describe('優化策略', () => {
    test('應該優先使用最適合的材料', () => {
      const parts: PartWithQuantity[] = [
        createPart('A', 2800, 1), // 只能放在 3000mm 材料上
        createPart('B', 1800, 1), // 只能放在 2000mm 或更大材料上
        createPart('C', 900, 2)   // 可以放在任何材料上
      ];
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 1),
        createMaterial('M2', 2000, 1),
        createMaterial('M3', 1000, 2)
      ];

      const result = placer.placeParts(parts, materials);

      // 驗證零件 A 被放在 M1 上
      const partAPlacement = result.placedParts.find(p => p.partId === 'A');
      expect(partAPlacement?.materialId).toContain('M1');

      // 驗證零件 B 被放在 M2 上
      const partBPlacement = result.placedParts.find(p => p.partId === 'B');
      expect(partBPlacement?.materialId).toContain('M2');
    });

    test('應該最小化材料浪費', () => {
      const parts: PartWithQuantity[] = [
        createPart('A', 1000, 3),
        createPart('B', 900, 3),
        createPart('C', 800, 3)
      ];
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 10)
      ];

      const result = placer.placeParts(parts, materials);

      // 驗證材料利用率
      expect(result.report.materialUtilization).toBeGreaterThan(0.8); // 80% 以上
      expect(result.report.wastePercentage).toBeLessThan(0.2); // 浪費少於 20%
    });
  });

  describe('共刀鏈整合', () => {
    test('應該正確處理共刀鏈', () => {
      const parts: PartWithQuantity[] = [
        createPart('A', 1000, 2),
        createPart('B', 800, 2)
      ];
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 5)
      ];

      const chains: SharedCutChain[] = [{
        id: 'chain1',
        parts: [
          { partId: 'A', instanceId: 0, position: 0 },
          { partId: 'A', instanceId: 1, position: 1 }
        ],
        connections: [{
          fromPart: { partId: 'A', instanceId: 0, anglePosition: 'topLeft' },
          toPart: { partId: 'A', instanceId: 1, anglePosition: 'topLeft' },
          sharedAngle: 45,
          savings: 20
        }],
        totalLength: 1980,
        totalSavings: 20,
        structure: 'batch',
        isOptimized: true
      }];

      const result = placer.placePartsWithChains(parts, materials, chains);

      expect(result.placedParts.length).toBe(4);
      expect(result.totalSavings).toBeGreaterThan(0);
    });
  });

  describe('效能基準測試', () => {
    test('應該在合理時間內處理1000個零件', () => {
      const parts: PartWithQuantity[] = [];
      for (let i = 0; i < 100; i++) {
        parts.push(createPart(`P${i}`, 500 + (i % 10) * 100, 10));
      }
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 200),
        createMaterial('M2', 2000, 200)
      ];

      const startTime = performance.now();
      const result = placer.placeParts(parts, materials);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5000); // 5秒內完成
      expect(result.placedParts.length).toBeGreaterThan(900); // 至少排版 90%
    });

    test('應該在合理時間內處理10000個零件', () => {
      const parts: PartWithQuantity[] = [];
      for (let i = 0; i < 200; i++) {
        parts.push(createPart(`P${i}`, 500 + (i % 10) * 100, 50));
      }
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 500),
        createMaterial('M2', 2000, 500)
      ];

      const startTime = performance.now();
      const result = placer.placeParts(parts, materials);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(30000); // 30秒內完成
      expect(result.report.totalParts).toBe(10000);
    });
  });

  describe('錯誤處理', () => {
    test('應該處理空輸入', () => {
      const result = placer.placeParts([], []);
      expect(result.placedParts).toEqual([]);
      expect(result.unplacedParts).toEqual([]);
    });

    test('應該處理沒有材料的情況', () => {
      const parts: PartWithQuantity[] = [
        createPart('A', 1000, 5)
      ];

      const result = placer.placeParts(parts, []);
      
      expect(result.placedParts).toEqual([]);
      expect(result.unplacedParts.length).toBe(5);
      expect(result.warnings).toContain('沒有提供材料，無法進行排版');
    });
  });
});