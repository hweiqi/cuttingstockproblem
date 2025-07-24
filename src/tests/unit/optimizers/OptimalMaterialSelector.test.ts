import { OptimalMaterialSelector } from '../../../optimizers/OptimalMaterialSelector';
import { Material, Part } from '../../../types';
import { STANDARD_MATERIAL_LENGTHS } from '../../../config/MaterialConfig';

describe('OptimalMaterialSelector', () => {
  let selector: OptimalMaterialSelector;

  beforeEach(() => {
    selector = new OptimalMaterialSelector();
  });

  describe('selectOptimalMaterial', () => {
    it('should select exact fit material when available', () => {
      const parts: Part[] = [
        { id: 'part-1', length: 2950, quantity: 2 }
      ];
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      // 2950 * 2 + 3 + 10 + 10 = 5923 < 6000
      const selected = selector.selectOptimalMaterial(parts, cuttingLoss, endLosses);
      expect(selected).toBe(6000);
    });

    it('should select material with best utilization for single part', () => {
      const parts: Part[] = [
        { id: 'part-1', length: 8500, quantity: 1 }
      ];
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      // 8500 + 10 + 10 = 8520, 利用率: 8520/9000 = 94.7%
      const selected = selector.selectOptimalMaterial(parts, cuttingLoss, endLosses);
      expect(selected).toBe(9000);
    });

    it('should handle multiple parts optimization', () => {
      const parts: Part[] = [
        { id: 'part-1', length: 2500, quantity: 2 },
        { id: 'part-2', length: 2500, quantity: 2 }
      ];
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      // 可以在一個10000mm材料上放4個2500mm零件
      // 2500 * 4 + 3 * 3 + 10 + 10 = 10029 > 10000
      // 實際上10000mm可以放3個，12000mm可以放4個
      const selected = selector.selectOptimalMaterial(parts, cuttingLoss, endLosses);
      expect(selected).toBe(12000); // 能放下所有4個零件的最小材料
    });

    it('should consider shared cutting when enabled', () => {
      const parts: Part[] = [
        { 
          id: 'part-1', 
          length: 3000, 
          quantity: 2,
          angles: { topLeft: 45, topRight: 90, bottomLeft: 90, bottomRight: 45 }
        },
        { 
          id: 'part-2', 
          length: 3000, 
          quantity: 2,
          angles: { topLeft: 90, topRight: 45, bottomLeft: 45, bottomRight: 90 }
        }
      ];
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      // 共刀可以節省切割損耗
      const selectedWithShared = selector.selectOptimalMaterial(parts, cuttingLoss, endLosses, true);
      const selectedWithoutShared = selector.selectOptimalMaterial(parts, cuttingLoss, endLosses, false);
      
      // 共刀應該允許更好的材料利用
      expect(selectedWithShared).toBeLessThanOrEqual(selectedWithoutShared);
    });

    it('should handle parts longer than standard materials', () => {
      const parts: Part[] = [
        { id: 'part-1', length: 16000, quantity: 1 }
      ];
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      const selected = selector.selectOptimalMaterial(parts, cuttingLoss, endLosses);
      expect(selected).toBe(15000); // 最大標準長度
    });

    it('should handle empty parts array', () => {
      const parts: Part[] = [];
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      const selected = selector.selectOptimalMaterial(parts, cuttingLoss, endLosses);
      expect(selected).toBe(6000); // 默認最小長度
    });

    it('should handle zero quantity parts', () => {
      const parts: Part[] = [
        { id: 'part-1', length: 3000, quantity: 0 }
      ];
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      const selected = selector.selectOptimalMaterial(parts, cuttingLoss, endLosses);
      expect(selected).toBe(6000); // 默認最小長度
    });
  });

  describe('calculateOptimalLayout', () => {
    it('should calculate optimal layout for simple case', () => {
      const parts: Part[] = [
        { id: 'part-1', length: 2500, quantity: 2 }
      ];
      const materialLength = 6000;
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      const layout = selector.calculateOptimalLayout(parts, materialLength, cuttingLoss, endLosses);
      
      expect(layout.parts).toHaveLength(2);
      expect(layout.totalLength).toBe(5023); // 10 + 2500 + 3 + 2500 + 10
      expect(layout.utilization).toBeCloseTo(0.837, 3);
      expect(layout.waste).toBe(977);
    });

    it('should optimize layout with mixed parts', () => {
      const parts: Part[] = [
        { id: 'part-1', length: 3000, quantity: 1 },
        { id: 'part-2', length: 2500, quantity: 1 }
      ];
      const materialLength = 6000;
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      const layout = selector.calculateOptimalLayout(parts, materialLength, cuttingLoss, endLosses);
      
      expect(layout.parts).toHaveLength(2);
      expect(layout.totalLength).toBe(5523); // 10 + 3000 + 3 + 2500 + 10
      expect(layout.utilization).toBeCloseTo(0.9205, 3);
    });

    it('should handle parts that exceed material length', () => {
      const parts: Part[] = [
        { id: 'part-1', length: 3000, quantity: 3 }
      ];
      const materialLength = 6000;
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      const layout = selector.calculateOptimalLayout(parts, materialLength, cuttingLoss, endLosses);
      
      // 6000mm: 10 + 3000 + 3 + 3000 + 10 = 6023 > 6000
      // 所以只能放1個3000mm的零件
      expect(layout.parts).toHaveLength(1);
      expect(layout.remainingParts).toHaveLength(1);
      expect(layout.remainingParts[0].quantity).toBe(2);
    });

    it('should calculate shared cutting layout', () => {
      const parts: Part[] = [
        { 
          id: 'part-1', 
          length: 2500, 
          quantity: 1,
          angles: { topLeft: 45, topRight: 90, bottomLeft: 90, bottomRight: 45 }
        },
        { 
          id: 'part-2', 
          length: 2500, 
          quantity: 1,
          angles: { topLeft: 90, topRight: 45, bottomLeft: 45, bottomRight: 90 }
        }
      ];
      const materialLength = 6000;
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      const layout = selector.calculateOptimalLayout(parts, materialLength, cuttingLoss, endLosses, true);
      
      expect(layout.parts).toHaveLength(2);
      expect(layout.sharedCuts).toBeDefined();
      expect(layout.sharedCuts!.length).toBeGreaterThan(0);
      expect(layout.totalLength).toBeLessThan(5023); // 應該比沒有共刀時更短
    });
  });

  describe('suggestBestMaterialForParts', () => {
    it('should suggest best material based on utilization target', () => {
      const parts: Part[] = [
        { id: 'part-1', length: 2500, quantity: 2 }
      ];
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      const targetUtilization = 0.85;
      
      const suggestion = selector.suggestBestMaterialForParts(
        parts, cuttingLoss, endLosses, targetUtilization
      );
      
      expect(suggestion.recommendedLength).toBe(6000);
      expect(suggestion.expectedUtilization).toBeGreaterThan(0.8);
      expect(suggestion.alternativeOptions).toBeDefined();
    });

    it('should provide alternative options', () => {
      const parts: Part[] = [
        { id: 'part-1', length: 4000, quantity: 2 }
      ];
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      const suggestion = selector.suggestBestMaterialForParts(
        parts, cuttingLoss, endLosses, 0.85
      );
      
      expect(suggestion.alternativeOptions).toHaveLength(STANDARD_MATERIAL_LENGTHS.length);
      expect(suggestion.alternativeOptions[0].utilization).toBeGreaterThan(
        suggestion.alternativeOptions[1].utilization
      );
    });

    it('should include warnings for poor utilization', () => {
      const parts: Part[] = [
        { id: 'part-1', length: 1000, quantity: 1 }
      ];
      const cuttingLoss = 3;
      const endLosses = { front: 10, back: 10 };
      
      const suggestion = selector.suggestBestMaterialForParts(
        parts, cuttingLoss, endLosses, 0.85
      );
      
      expect(suggestion.warnings).toBeDefined();
      expect(suggestion.warnings!.length).toBeGreaterThan(0);
      expect(suggestion.warnings![0]).toContain('Low utilization');
    });
  });
});