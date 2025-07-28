import { OptimizedPlacer } from '../../../placement/OptimizedPlacer';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material } from '../../../core/v6/models/Material';

describe('OptimizedPlacer - 新排版邏輯測試', () => {
  let placer: OptimizedPlacer;

  beforeEach(() => {
    placer = new OptimizedPlacer({
      cuttingLoss: 3,
      frontEndLoss: 10,
      backEndLoss: 10
    });
  });

  describe('無虛擬材料測試', () => {
    it('不應創建任何虛擬材料', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1000,
          quantity: 5,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 2 }
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBe(5);
    });

    it('材料不足時應報告未排版零件而非創建虛擬材料', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 5000,
          quantity: 10, // 總長度50000mm
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 3 } // 總長度18000mm，明顯不足
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(false);
      expect(result.unplacedParts.length).toBeGreaterThan(0);
    });
  });

  describe('優先使用最長母材測試', () => {
    it('應優先使用最長的母材', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1000,
          quantity: 3,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1-short', length: 3000, quantity: 2 },
        { id: 'M2-long', length: 12000, quantity: 1 },
        { id: 'M3-medium', length: 6000, quantity: 2 }
      ];

      const result = placer.placeParts(parts, materials);

      // 檢查第一個使用的材料應該是最長的
      const firstUsedMaterial = result.usedMaterials[0];
      expect(firstUsedMaterial.material.id).toContain('M2-long');
      expect(firstUsedMaterial.material.length).toBe(12000);
    });

    it('當最長母材效率太低時應使用其他長度', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 500, // 很短的零件
          quantity: 1,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1-short', length: 1000, quantity: 1 },
        { id: 'M2-long', length: 12000, quantity: 1 }
      ];

      const result = placer.placeParts(parts, materials);

      // 應該選擇較短的材料以獲得更好的效率
      const usedMaterial = result.placedParts[0].materialId;
      expect(usedMaterial).toContain('M1-short');
    });
  });

  describe('共刀鏈測試', () => {
    it('應正確處理共刀鏈並計算節省', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 2000,
          quantity: 3,
          angles: { topLeft: 45, topRight: 45, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        },
        {
          id: 'P2',
          length: 2000,
          quantity: 3,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 12000, quantity: 2 }
      ];

      // 創建共刀鏈
      const chains = [{
        id: 'chain1',
        parts: [
          { partId: 'P1', instanceId: 0, position: 0 },
          { partId: 'P2', instanceId: 0, position: 1 }
        ],
        connections: [{
          fromPart: { partId: 'P1', instanceId: 0, anglePosition: 'topLeft' as const },
          toPart: { partId: 'P2', instanceId: 0, anglePosition: 'topLeft' as const },
          sharedAngle: 45,
          savings: 10
        }],
        totalLength: 3990,
        totalSavings: 10,
        structure: 'mixed' as const,
        isOptimized: true
      }];

      const result = placer.placePartsWithChains(parts, materials, chains);

      expect(result.totalSavings).toBeGreaterThan(0);
      expect(result.report.sharedCuttingPairs).toBeGreaterThan(0);
    });
  });

  describe('極限排版測試', () => {
    it('應使用多輪策略確保所有零件都能排版', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 2900,
          quantity: 2,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        },
        {
          id: 'P2',
          length: 2950,
          quantity: 2,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 3000, quantity: 4 } // 每個材料只能放一個零件
      ];

      const result = placer.placeParts(parts, materials);

      // 通過減少損耗，應該能夠排版所有零件
      expect(result.placedParts.length).toBe(4);
      expect(result.unplacedParts.length).toBe(0);
      expect(result.success).toBe(true);
    });

    it('當材料確實不足時應正確報告', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 5900, // 加上最小損耗後超過6000
          quantity: 3,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 2 } // 只能放2個
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.placedParts.length).toBe(2);
      expect(result.unplacedParts.length).toBe(1);
      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('材料選擇效率測試', () => {
    it('應該在已使用的材料上繼續排版以提高效率', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1000,
          quantity: 6,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 3 }
      ];

      const result = placer.placeParts(parts, materials);

      // 應該高效使用材料
      expect(result.usedMaterials.length).toBeLessThanOrEqual(2);
      expect(result.report.materialUtilization).toBeGreaterThan(0.5);
    });
  });
});