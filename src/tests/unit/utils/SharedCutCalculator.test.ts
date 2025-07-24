import { SharedCutCalculator } from '../../../utils/SharedCutCalculator';
import { PlacedPart } from '../../../types';

describe('SharedCutCalculator', () => {
  let calculator: SharedCutCalculator;

  beforeEach(() => {
    calculator = new SharedCutCalculator();
  });

  describe('calculateSharedCutSavings', () => {
    it('should calculate savings for two parts with shared cut', () => {
      const part1: PlacedPart = {
        partId: 'part-1',
        length: 3000,
        position: 10,
        isSharedCut: true,
        sharedWith: 'part-2',
        angleSavings: 3
      };

      const part2: PlacedPart = {
        partId: 'part-2',
        length: 3000,
        position: 3013,
        isSharedCut: true,
        sharedWith: 'part-1',
        angleSavings: 3
      };

      const savings = calculator.calculateSharedCutSavings(part1, part2, 3);
      expect(savings).toBe(3);
    });

    it('should return 0 for non-shared cut parts', () => {
      const part1: PlacedPart = {
        partId: 'part-1',
        length: 3000,
        position: 10,
        isSharedCut: false
      };

      const part2: PlacedPart = {
        partId: 'part-2',
        length: 3000,
        position: 3020,
        isSharedCut: false
      };

      const savings = calculator.calculateSharedCutSavings(part1, part2, 3);
      expect(savings).toBe(0);
    });

    it('should handle parts with different cutting losses', () => {
      const part1: PlacedPart = {
        partId: 'part-1',
        length: 2000,
        position: 10,
        isSharedCut: true,
        sharedWith: 'part-2',
        angleSavings: 5
      };

      const part2: PlacedPart = {
        partId: 'part-2',
        length: 2500,
        position: 2015,
        isSharedCut: true,
        sharedWith: 'part-1',
        angleSavings: 5
      };

      const savings = calculator.calculateSharedCutSavings(part1, part2, 5);
      expect(savings).toBe(5);
    });

    it('should handle multiple shared cuts in a chain', () => {
      const parts: PlacedPart[] = [
        {
          partId: 'part-1',
          length: 1000,
          position: 10,
          isSharedCut: true,
          sharedWith: 'part-2',
          angleSavings: 3
        },
        {
          partId: 'part-2',
          length: 1500,
          position: 1013,
          isSharedCut: true,
          sharedWith: 'part-1 + part-3',
          angleSavings: 3
        },
        {
          partId: 'part-3',
          length: 2000,
          position: 2516,
          isSharedCut: true,
          sharedWith: 'part-2',
          angleSavings: 3
        }
      ];

      const totalSavings = calculator.calculateTotalSharedCutSavings(parts, 3);
      expect(totalSavings).toBe(6); // 2 shared cuts * 3mm each
    });

    it('should handle edge cases with zero length parts', () => {
      const part1: PlacedPart = {
        partId: 'part-1',
        length: 0,
        position: 10,
        isSharedCut: true,
        sharedWith: 'part-2'
      };

      const part2: PlacedPart = {
        partId: 'part-2',
        length: 1000,
        position: 10,
        isSharedCut: true,
        sharedWith: 'part-1'
      };

      const savings = calculator.calculateSharedCutSavings(part1, part2, 3);
      expect(savings).toBe(0);
    });

    it('should handle invalid shared cut configurations', () => {
      const part1: PlacedPart = {
        partId: 'part-1',
        length: 1000,
        position: 10,
        isSharedCut: true,
        sharedWith: 'part-3' // Wrong partner
      };

      const part2: PlacedPart = {
        partId: 'part-2',
        length: 1000,
        position: 1013,
        isSharedCut: false
      };

      const savings = calculator.calculateSharedCutSavings(part1, part2, 3);
      expect(savings).toBe(0);
    });

    it('should calculate savings from angleSavings property if available', () => {
      const part1: PlacedPart = {
        partId: 'part-1',
        length: 3000,
        position: 10,
        isSharedCut: true,
        sharedWith: 'part-2',
        angleSavings: 5
      };

      const part2: PlacedPart = {
        partId: 'part-2',
        length: 3000,
        position: 3015,
        isSharedCut: true,
        sharedWith: 'part-1',
        angleSavings: 5
      };

      const savings = calculator.calculateSharedCutSavings(part1, part2, 3);
      expect(savings).toBe(5);
    });

    it('should handle negative positions correctly', () => {
      const part1: PlacedPart = {
        partId: 'part-1',
        length: 1000,
        position: -10,
        isSharedCut: true,
        sharedWith: 'part-2',
        angleSavings: 3
      };

      const part2: PlacedPart = {
        partId: 'part-2',
        length: 1000,
        position: 993,
        isSharedCut: true,
        sharedWith: 'part-1',
        angleSavings: 3
      };

      const savings = calculator.calculateSharedCutSavings(part1, part2, 3);
      expect(savings).toBe(3);
    });

    it('should validate shared cut pairs consistency', () => {
      const part1: PlacedPart = {
        partId: 'part-1',
        length: 1000,
        position: 10,
        isSharedCut: true,
        sharedWith: 'part-2',
        angleSavings: 3
      };

      const part2: PlacedPart = {
        partId: 'part-2',
        length: 1000,
        position: 1013,
        isSharedCut: true,
        sharedWith: 'part-1',
        angleSavings: 5 // Different savings amount - should take the first one
      };

      const savings = calculator.calculateSharedCutSavings(part1, part2, 3);
      expect(savings).toBe(3);
    });
  });

  describe('calculateTotalSharedCutSavings', () => {
    it('should calculate total savings for all shared cuts in a plan', () => {
      const parts: PlacedPart[] = [
        {
          partId: 'part-1',
          length: 1000,
          position: 10,
          isSharedCut: true,
          sharedWith: 'part-2',
          angleSavings: 3
        },
        {
          partId: 'part-2',
          length: 1000,
          position: 1013,
          isSharedCut: true,
          sharedWith: 'part-1',
          angleSavings: 3
        },
        {
          partId: 'part-3',
          length: 1000,
          position: 2020,
          isSharedCut: false
        },
        {
          partId: 'part-4',
          length: 1000,
          position: 3030,
          isSharedCut: true,
          sharedWith: 'part-5',
          angleSavings: 5
        },
        {
          partId: 'part-5',
          length: 1000,
          position: 4035,
          isSharedCut: true,
          sharedWith: 'part-4',
          angleSavings: 5
        }
      ];

      const totalSavings = calculator.calculateTotalSharedCutSavings(parts, 3);
      expect(totalSavings).toBe(8); // 3mm + 5mm
    });

    it('should handle empty parts array', () => {
      const totalSavings = calculator.calculateTotalSharedCutSavings([], 3);
      expect(totalSavings).toBe(0);
    });

    it('should handle array with no shared cuts', () => {
      const parts: PlacedPart[] = [
        {
          partId: 'part-1',
          length: 1000,
          position: 10,
          isSharedCut: false
        },
        {
          partId: 'part-2',
          length: 1000,
          position: 1020,
          isSharedCut: false
        }
      ];

      const totalSavings = calculator.calculateTotalSharedCutSavings(parts, 3);
      expect(totalSavings).toBe(0);
    });
  });

  describe('getSharedCutPairs', () => {
    it('should identify all shared cut pairs', () => {
      const parts: PlacedPart[] = [
        {
          partId: 'part-1',
          length: 1000,
          position: 10,
          isSharedCut: true,
          sharedWith: 'part-2',
          angleSavings: 3
        },
        {
          partId: 'part-2',
          length: 1000,
          position: 1013,
          isSharedCut: true,
          sharedWith: 'part-1',
          angleSavings: 3
        },
        {
          partId: 'part-3',
          length: 1000,
          position: 2020,
          isSharedCut: true,
          sharedWith: 'part-4',
          angleSavings: 5
        },
        {
          partId: 'part-4',
          length: 1000,
          position: 3025,
          isSharedCut: true,
          sharedWith: 'part-3',
          angleSavings: 5
        }
      ];

      const pairs = calculator.getSharedCutPairs(parts);
      expect(pairs).toHaveLength(2);
      expect(pairs[0]).toEqual({
        part1Id: 'part-1',
        part2Id: 'part-2',
        savings: 3,
        position1: 10,
        position2: 1013
      });
      expect(pairs[1]).toEqual({
        part1Id: 'part-3',
        part2Id: 'part-4',
        savings: 5,
        position1: 2020,
        position2: 3025
      });
    });

    it('should handle complex shared cut chains', () => {
      const parts: PlacedPart[] = [
        {
          partId: 'part-1',
          length: 1000,
          position: 10,
          isSharedCut: true,
          sharedWith: 'part-2',
          angleSavings: 3
        },
        {
          partId: 'part-2',
          length: 1000,
          position: 1013,
          isSharedCut: true,
          sharedWith: 'part-1 + part-3',
          angleSavings: 3
        },
        {
          partId: 'part-3',
          length: 1000,
          position: 2016,
          isSharedCut: true,
          sharedWith: 'part-2',
          angleSavings: 3
        }
      ];

      const pairs = calculator.getSharedCutPairs(parts);
      expect(pairs).toHaveLength(2);
      expect(pairs.some(p => p.part1Id === 'part-1' && p.part2Id === 'part-2')).toBe(true);
      expect(pairs.some(p => p.part1Id === 'part-2' && p.part2Id === 'part-3')).toBe(true);
    });
  });
});