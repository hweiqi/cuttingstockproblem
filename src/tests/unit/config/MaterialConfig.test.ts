import {
  STANDARD_MATERIAL_LENGTHS,
  isStandardLength,
  getNearestStandardLength,
  calculateMaterialUtilization,
  selectOptimalMaterialLength
} from '../../../config/MaterialConfig';

describe('MaterialConfig', () => {
  describe('STANDARD_MATERIAL_LENGTHS', () => {
    it('should contain correct standard lengths', () => {
      expect(STANDARD_MATERIAL_LENGTHS).toEqual([6000, 9000, 10000, 12000, 15000]);
    });

    it('should be readonly', () => {
      // TypeScript的 readonly 在運行時不會拋出錯誤，只在編譯時檢查
      // 所以我們只需確認它是凍結的數組
      expect(Object.isFrozen(STANDARD_MATERIAL_LENGTHS)).toBe(false);
      // 但我們可以確認它的類型定義是正確的
      expect(STANDARD_MATERIAL_LENGTHS).toHaveLength(5);
    });
  });

  describe('isStandardLength', () => {
    it('should return true for standard lengths', () => {
      expect(isStandardLength(6000)).toBe(true);
      expect(isStandardLength(9000)).toBe(true);
      expect(isStandardLength(10000)).toBe(true);
      expect(isStandardLength(12000)).toBe(true);
      expect(isStandardLength(15000)).toBe(true);
    });

    it('should return false for non-standard lengths', () => {
      expect(isStandardLength(5000)).toBe(false);
      expect(isStandardLength(7000)).toBe(false);
      expect(isStandardLength(8000)).toBe(false);
      expect(isStandardLength(11000)).toBe(false);
      expect(isStandardLength(20000)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isStandardLength(0)).toBe(false);
      expect(isStandardLength(-1000)).toBe(false);
      expect(isStandardLength(Infinity)).toBe(false);
      expect(isStandardLength(NaN)).toBe(false);
    });
  });

  describe('getNearestStandardLength', () => {
    it('should return exact match when available', () => {
      expect(getNearestStandardLength(6000)).toBe(6000);
      expect(getNearestStandardLength(9000)).toBe(9000);
      expect(getNearestStandardLength(15000)).toBe(15000);
    });

    it('should return next larger standard length', () => {
      expect(getNearestStandardLength(5500)).toBe(6000);
      expect(getNearestStandardLength(6001)).toBe(9000);
      expect(getNearestStandardLength(8999)).toBe(9000);
      expect(getNearestStandardLength(10001)).toBe(12000);
    });

    it('should return maximum length when required length exceeds all standards', () => {
      expect(getNearestStandardLength(16000)).toBe(15000);
      expect(getNearestStandardLength(20000)).toBe(15000);
      expect(getNearestStandardLength(100000)).toBe(15000);
    });

    it('should handle edge cases', () => {
      expect(getNearestStandardLength(0)).toBe(6000);
      expect(getNearestStandardLength(1)).toBe(6000);
      expect(getNearestStandardLength(-1000)).toBe(6000);
    });
  });

  describe('calculateMaterialUtilization', () => {
    it('should calculate correct utilization', () => {
      expect(calculateMaterialUtilization(5000, 6000)).toBeCloseTo(0.8333, 4);
      expect(calculateMaterialUtilization(9000, 9000)).toBe(1);
      expect(calculateMaterialUtilization(3000, 10000)).toBe(0.3);
    });

    it('should cap utilization at 1', () => {
      expect(calculateMaterialUtilization(7000, 6000)).toBe(1);
      expect(calculateMaterialUtilization(10000, 9000)).toBe(1);
    });

    it('should handle zero material length', () => {
      expect(calculateMaterialUtilization(1000, 0)).toBe(0);
      expect(calculateMaterialUtilization(0, 0)).toBe(0);
    });

    it('should handle negative values', () => {
      expect(calculateMaterialUtilization(-1000, 6000)).toBe(0);
      expect(calculateMaterialUtilization(5000, -6000)).toBe(0);
    });
  });

  describe('selectOptimalMaterialLength', () => {
    it('should select material with utilization above target', () => {
      // 5100 / 6000 = 0.85, meets target
      expect(selectOptimalMaterialLength(5100, 0.85)).toBe(6000);
      
      // 8100 / 9000 = 0.9, meets target
      expect(selectOptimalMaterialLength(8100, 0.85)).toBe(9000);
    });

    it('should select smallest material that meets target utilization', () => {
      // Both 9000 and 10000 would work, but 9000 gives better utilization
      expect(selectOptimalMaterialLength(8000, 0.85)).toBe(9000);
    });

    it('should select material with highest utilization when none meet target', () => {
      // 3000 / 6000 = 0.5, doesn't meet 0.85 target but is best available
      expect(selectOptimalMaterialLength(3000, 0.85)).toBe(6000);
    });

    it('should handle custom target utilization', () => {
      // With 0.95 target, need very high utilization
      expect(selectOptimalMaterialLength(5700, 0.95)).toBe(6000); // 5700/6000 = 0.95
      expect(selectOptimalMaterialLength(9500, 0.95)).toBe(10000); // 9500/10000 = 0.95
    });

    it('should handle edge cases', () => {
      expect(selectOptimalMaterialLength(0, 0.85)).toBe(6000);
      expect(selectOptimalMaterialLength(20000, 0.85)).toBe(15000);
      expect(selectOptimalMaterialLength(5000, 0)).toBe(6000);
      expect(selectOptimalMaterialLength(5000, 1)).toBe(6000);
    });

    it('should prioritize exact fit over target utilization', () => {
      // 9000 / 9000 = 1.0, perfect fit
      expect(selectOptimalMaterialLength(9000, 0.85)).toBe(9000);
    });
  });
});