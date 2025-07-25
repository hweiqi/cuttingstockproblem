import { OptimizedPlacer } from '../../../placement/OptimizedPlacer';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material } from '../../../core/v6/models/Material';

describe('OptimizedPlacer', () => {
  let placer: OptimizedPlacer;
  
  beforeEach(() => {
    placer = new OptimizedPlacer({
      cuttingLoss: 5,
      frontEndLoss: 20,
      backEndLoss: 15
    });
  });

  describe('基本排版功能', () => {
    it('應該成功排版單個零件', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 1 }
      ];
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 3000, quantity: 1, angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 }, thickness: 10 }
      ];
      
      const result = placer.placeParts(parts, materials);
      
      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(1);
      expect(result.virtualMaterialsCreated).toBe(0);
    });

    it('應該處理多個零件的排版', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 1 }
      ];
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 1000, quantity: 3, angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 }, thickness: 10 }
      ];
      
      const result = placer.placeParts(parts, materials);
      
      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(3);
    });

    it('應該處理空材料列表', () => {
      const materials: Material[] = [];
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 1000, quantity: 1, angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 }, thickness: 10 }
      ];
      
      const result = placer.placeParts(parts, materials);
      
      expect(result.success).toBe(true);
      expect(result.virtualMaterialsCreated).toBeGreaterThan(0);
      expect(result.placedParts).toHaveLength(1);
    });
  });

  describe('共刀切割功能', () => {
    it('應該處理共刀切割鏈', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 1 }
      ];
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 2000, quantity: 2, angles: { topLeft: 0, topRight: 45, bottomLeft: 0, bottomRight: 0 }, thickness: 10 }
      ];
      
      const result = placer.placeParts(parts, materials);
      
      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(2);
    });
  });

  describe('錯誤處理', () => {
    it('應該處理超長零件', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 1 }
      ];
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 20000, quantity: 1, angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 }, thickness: 10 }
      ];
      
      const result = placer.placeParts(parts, materials);
      
      expect(result.success).toBe(true);
      expect(result.virtualMaterialsCreated).toBeGreaterThan(0);
    });
  });
});