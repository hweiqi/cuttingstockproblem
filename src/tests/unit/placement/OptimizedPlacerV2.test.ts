import { OptimizedPlacerV2 } from '../../../placement/OptimizedPlacerV2';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material } from '../../../core/v6/models/Material';

describe('OptimizedPlacerV2', () => {
  let placer: OptimizedPlacerV2;

  beforeEach(() => {
    placer = new OptimizedPlacerV2({
      cuttingLoss: 5,
      frontEndLoss: 20,
      backEndLoss: 15
    });
  });

  describe('基本排版功能', () => {
    it('應該成功排版單個零件', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 2000,
          quantity: 1,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 1 }
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(1);
      expect(result.unplacedParts).toHaveLength(0);
    });

    it('應該處理多個零件的排版', () => {
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
      expect(result.placedParts).toHaveLength(5);
      expect(result.unplacedParts).toHaveLength(0);
    });

    it('應該正確處理空材料列表', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 2000,
          quantity: 1,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(false);
      expect(result.placedParts).toHaveLength(0);
      expect(result.unplacedParts).toHaveLength(1);
      expect(result.warnings.some(w => w.includes('沒有提供材料'))).toBe(true);
    });
  });

  describe('無限材料供應', () => {
    it('應該動態創建材料實例', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 2000,
          quantity: 20,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 0 } // 無限供應
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(20);
      expect(result.unplacedParts).toHaveLength(0);
      expect(result.usedMaterials.length).toBeGreaterThan(1);
    });

    it('不應該為太短的無限材料創建實例', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 8000,
          quantity: 2,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 0 } // 無限供應但太短
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(false);
      expect(result.placedParts).toHaveLength(0);
      expect(result.unplacedParts).toHaveLength(2);
      expect(result.warnings.some(w => w.includes('長度超出'))).toBe(true);
    });
  });

  describe('混合材料供應', () => {
    it('應該正確處理有限和無限材料的組合', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 2000,
          quantity: 10,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 2 },  // 有限供應
        { id: 'M2', length: 9000, quantity: 0 }   // 無限供應
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(10);
      expect(result.unplacedParts).toHaveLength(0);
    });
  });

  describe('共刀鏈處理', () => {
    it('應該正確處理共刀鏈', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 2000,
          quantity: 2,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 1 }
      ];

      const chains = [{
        id: 'chain1',
        parts: [
          { partId: 'P1', instanceId: 0, position: 0 },
          { partId: 'P1', instanceId: 1, position: 1 }
        ],
        connections: [{
          fromPart: 0,
          toPart: 1,
          sharedAngle: 45,
          savings: 20
        }],
        totalSavings: 20,
        structure: 'linear' as const
      }];

      const result = placer.placePartsWithChains(parts, materials, chains);

      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(2);
      expect(result.totalSavings).toBeGreaterThan(0);
    });
  });

  describe('邊界情況', () => {
    it('應該處理空零件列表', () => {
      const parts: PartWithQuantity[] = [];
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 1 }
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(0);
      expect(result.unplacedParts).toHaveLength(0);
    });

    it('應該處理零件長度恰好等於材料長度的情況', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 5960, // 6000 - 20(front) - 15(back) - 5(tolerance)
          quantity: 1,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 1 }
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(1);
    });
  });
});