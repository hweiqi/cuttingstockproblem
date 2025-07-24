import { SharedCutCalculatorFixed } from '../../../utils/SharedCutCalculatorFixed';
import { PlacedPart } from '../../../types';

describe('SharedCutCalculatorFixed', () => {
  let calculator: SharedCutCalculatorFixed;

  beforeEach(() => {
    calculator = new SharedCutCalculatorFixed();
  });

  describe('calculateActualCuttingLoss', () => {
    it('should return 0 for shared cut', () => {
      const part: PlacedPart = {
        partId: 'part-1',
        length: 2500,
        position: 10,
        isSharedCut: true,
        angleSavings: 62.76
      };
      
      const loss = calculator.calculateActualCuttingLoss(part, 3);
      expect(loss).toBe(0); // 共刀時沒有切割損耗
    });

    it('should return normal cutting loss for non-shared cut', () => {
      const part: PlacedPart = {
        partId: 'part-1',
        length: 2500,
        position: 10,
        isSharedCut: false
      };
      
      const loss = calculator.calculateActualCuttingLoss(part, 3);
      expect(loss).toBe(3);
    });
  });

  describe('calculateSharedCutSavings', () => {
    it('should calculate savings correctly', () => {
      const part1: PlacedPart = {
        partId: 'part-1',
        length: 2500,
        position: 10,
        isSharedCut: true,
        sharedWith: 'part-2',
        angleSavings: 62.76
      };

      const part2: PlacedPart = {
        partId: 'part-2',
        length: 2500,
        position: 2572.76, // 10 + 2500 + 62.76
        isSharedCut: true,
        sharedWith: 'part-1',
        angleSavings: 62.76
      };

      // 共刀節省的是原本的切割損耗 + 角度匹配帶來的額外節省
      const savings = calculator.calculateSharedCutSavings(part1, part2, 3);
      expect(savings).toBeCloseTo(62.76, 2);
    });

    it('should handle zero angle savings', () => {
      const part1: PlacedPart = {
        partId: 'part-1',
        length: 2500,
        position: 10,
        isSharedCut: true,
        sharedWith: 'part-2'
      };

      const part2: PlacedPart = {
        partId: 'part-2',
        length: 2500,
        position: 2510,
        isSharedCut: true,
        sharedWith: 'part-1'
      };

      // 沒有角度節省時，只節省切割損耗
      const savings = calculator.calculateSharedCutSavings(part1, part2, 3);
      expect(savings).toBe(3);
    });
  });

  describe('validateSharedCutLayout', () => {
    it('should validate correct shared cut layout', () => {
      const parts: PlacedPart[] = [
        {
          partId: 'part-1',
          length: 2500,
          position: 10,
          isSharedCut: true,
          sharedWith: 'part-2',
          angleSavings: 62.76
        },
        {
          partId: 'part-2',
          length: 2500,
          position: 2572.76,
          isSharedCut: true,
          sharedWith: 'part-1',
          angleSavings: 62.76
        }
      ];

      const validation = calculator.validateSharedCutLayout(parts, 3);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect negative cutting loss', () => {
      const parts: PlacedPart[] = [
        {
          partId: 'part-1',
          length: 2500,
          position: 10,
          isSharedCut: true,
          sharedWith: 'part-2',
          angleSavings: 100 // 太大的節省
        },
        {
          partId: 'part-2',
          length: 2500,
          position: 2510, // 位置太近
          isSharedCut: true,
          sharedWith: 'part-1',
          angleSavings: 100
        }
      ];

      const validation = calculator.validateSharedCutLayout(parts, 3);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('negative gap'))).toBe(true);
    });

    it('should detect overlapping parts', () => {
      const parts: PlacedPart[] = [
        {
          partId: 'part-1',
          length: 2500,
          position: 10,
          isSharedCut: false
        },
        {
          partId: 'part-2',
          length: 2500,
          position: 2000, // 重疊了
          isSharedCut: false
        }
      ];

      const validation = calculator.validateSharedCutLayout(parts, 3);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Overlapping'))).toBe(true);
    });
  });

  describe('calculateCorrectPosition', () => {
    it('should calculate correct position for shared cut', () => {
      const previousPart: PlacedPart = {
        partId: 'part-1',
        length: 2500,
        position: 10,
        isSharedCut: false
      };

      const currentPart: PlacedPart = {
        partId: 'part-2',
        length: 2500,
        position: 0, // Will be calculated
        isSharedCut: true,
        sharedWith: 'part-1',
        angleSavings: 62.76
      };

      const position = calculator.calculateCorrectPosition(
        previousPart,
        currentPart,
        3
      );

      // 10 + 2500 + 62.76 = 2572.76
      expect(position).toBeCloseTo(2572.76, 2);
    });

    it('should calculate correct position for normal cut', () => {
      const previousPart: PlacedPart = {
        partId: 'part-1',
        length: 2500,
        position: 10,
        isSharedCut: false
      };

      const currentPart: PlacedPart = {
        partId: 'part-2',
        length: 2500,
        position: 0,
        isSharedCut: false
      };

      const position = calculator.calculateCorrectPosition(
        previousPart,
        currentPart,
        3
      );

      // 10 + 2500 + 3 = 2513
      expect(position).toBe(2513);
    });
  });

  describe('fixSharedCutLayout', () => {
    it('should fix incorrect shared cut positions', () => {
      const parts: PlacedPart[] = [
        {
          partId: 'part-1',
          length: 2500,
          position: 10,
          isSharedCut: true,
          sharedWith: 'part-2',
          angleSavings: 62.76
        },
        {
          partId: 'part-2',
          length: 2500,
          position: 2513, // 錯誤的位置
          isSharedCut: true,
          sharedWith: 'part-1',
          angleSavings: 62.76
        }
      ];

      const fixed = calculator.fixSharedCutLayout(parts, 3);
      
      expect(fixed[0].position).toBe(10);
      expect(fixed[1].position).toBeCloseTo(2572.76, 2);
    });

    it('should maintain correct positions', () => {
      const parts: PlacedPart[] = [
        {
          partId: 'part-1',
          length: 2500,
          position: 10,
          isSharedCut: false
        },
        {
          partId: 'part-2',
          length: 2500,
          position: 2513,
          isSharedCut: false
        }
      ];

      const fixed = calculator.fixSharedCutLayout(parts, 3);
      
      expect(fixed[0].position).toBe(10);
      expect(fixed[1].position).toBe(2513);
    });
  });
});