import { OptimizedPlacer } from '../../../placement/OptimizedPlacer';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material } from '../../../core/v6/models/Material';

describe('無限材料供應測試', () => {
  let placer: OptimizedPlacer;

  beforeEach(() => {
    placer = new OptimizedPlacer({
      cuttingLoss: 5,
      frontEndLoss: 20,
      backEndLoss: 15
    });
  });

  describe('材料數量無限供應', () => {
    it('當零件總長度超過給定材料總長度時，應自動增加材料實例', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 5000,
          quantity: 10, // 總長度 50000mm
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 2 } // 總長度只有 12000mm
      ];

      const result = placer.placeParts(parts, materials);

      // 所有零件都應該被排版
      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBe(10);
      expect(result.unplacedParts.length).toBe(0);
      
      // 應該使用超過2個材料實例
      expect(result.usedMaterials.length).toBeGreaterThan(2);
    });

    it('應該能處理超長零件（長度超過最長材料）', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 8000, // 超過材料長度
          quantity: 2,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 1 },
        { id: 'M2', length: 7000, quantity: 1 }
      ];

      const result = placer.placeParts(parts, materials);

      // 雖然零件長度超過材料，但系統應該使用更長的標準材料
      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBe(2);
      expect(result.unplacedParts.length).toBe(0);
    });

    it('應該在需要時自動選擇合適的材料規格', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 2000,
          quantity: 5,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        },
        {
          id: 'P2',
          length: 5000,
          quantity: 3,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 3000, quantity: 1 }, // 太短
        { id: 'M2', length: 6000, quantity: 1 }  // 數量不足
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBe(8);
      expect(result.unplacedParts.length).toBe(0);
    });

    it('應該優化材料使用，最小化材料數量', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1000,
          quantity: 20,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 1 } // 只給定1個材料
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBe(20);
      
      // 檢查材料利用率應該較高
      expect(result.report.materialUtilization).toBeGreaterThan(0.7);
      
      // 每個6000mm材料應該能放約5個1000mm零件（考慮損耗）
      // 20個零件應該需要約4-5個材料
      expect(result.usedMaterials.length).toBeLessThanOrEqual(5);
    });

    it('混合零件大小時應該正確分配材料', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'LARGE',
          length: 4000,
          quantity: 5,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        },
        {
          id: 'MEDIUM',
          length: 2000,
          quantity: 10,
          angles: { topLeft: 0, topRight: 30, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        },
        {
          id: 'SMALL',
          length: 500,
          quantity: 20,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 1 },
        { id: 'M2', length: 12000, quantity: 1 }
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBe(35);
      expect(result.unplacedParts.length).toBe(0);
      
      // 應該有效利用不同長度的材料
      const usedMaterialTypes = new Set(result.usedMaterials.map(m => m.material.length));
      expect(usedMaterialTypes.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('材料規格自動選擇', () => {
    it('應該根據零件需求自動選擇標準材料長度', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 11000, // 需要12000mm或更長的材料
          quantity: 2,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 1 } // 太短
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBe(2);
      
      // 應該自動選用12000mm或15000mm的標準材料
      const usedLengths = result.usedMaterials.map(m => m.material.length);
      expect(usedLengths.some(len => len >= 12000)).toBe(true);
    });
  });

  describe('極端情況處理', () => {
    it('應該處理大量零件的排版需求', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1500,
          quantity: 100, // 大量零件
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 1 } // 明顯不足
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBe(100);
      expect(result.unplacedParts.length).toBe(0);
    });

    it('應該處理零材料的情況', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 2000,
          quantity: 5,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const materials: Material[] = []; // 沒有給定任何材料

      const result = placer.placeParts(parts, materials);

      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBe(5);
      expect(result.unplacedParts.length).toBe(0);
      
      // 應該自動創建所需的材料
      expect(result.usedMaterials.length).toBeGreaterThan(0);
    });
  });
});