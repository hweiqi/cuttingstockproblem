/**
 * 核心資料結構測試
 */

import {
  isValidBevelAngle,
  validatePartAngles,
  calculateSharedCutSavings,
  canAnglesMatch,
  PartAngles,
  DEFAULT_CUTTING_SETTINGS
} from '../../../types/core';

describe('核心資料結構測試', () => {
  
  describe('isValidBevelAngle', () => {
    test('應該接受有效的斜切角度', () => {
      expect(isValidBevelAngle(0)).toBe(true);      // 直角
      expect(isValidBevelAngle(45)).toBe(true);     // 45度
      expect(isValidBevelAngle(89.9)).toBe(true);   // 接近90度
      expect(isValidBevelAngle(30)).toBe(true);     // 30度
    });

    test('應該拒絕無效的斜切角度', () => {
      expect(isValidBevelAngle(90)).toBe(false);    // 90度（不包含）
      expect(isValidBevelAngle(91)).toBe(false);    // 超過90度
      expect(isValidBevelAngle(-1)).toBe(false);    // 負數
      expect(isValidBevelAngle(180)).toBe(false);   // 180度
    });
  });

  describe('validatePartAngles', () => {
    test('應該接受有效的角度組合', () => {
      const validAngles: PartAngles = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0, 
        bottomRight: 30
      };
      
      const result = validatePartAngles(validAngles);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('應該接受全部為0的角度', () => {
      const straightAngles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };
      
      const result = validatePartAngles(straightAngles);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('應該拒絕左側同時有上下角度', () => {
      const invalidAngles: PartAngles = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 30,  // 與topLeft同時存在，違反規則
        bottomRight: 0
      };
      
      const result = validatePartAngles(invalidAngles);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('左側不能同時有上下角度（topLeft 和 bottomLeft 不能同時 > 0）');
    });

    test('應該拒絕右側同時有上下角度', () => {
      const invalidAngles: PartAngles = {
        topLeft: 0,
        topRight: 45,
        bottomLeft: 0,
        bottomRight: 30  // 與topRight同時存在，違反規則
      };
      
      const result = validatePartAngles(invalidAngles);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('右側不能同時有上下角度（topRight 和 bottomRight 不能同時 > 0）');
    });

    test('應該拒絕超出範圍的角度', () => {
      const invalidAngles: PartAngles = {
        topLeft: 90,      // 90度不被允許
        topRight: -10,    // 負數不被允許
        bottomLeft: 100,  // 超過90度
        bottomRight: 0
      };
      
      const result = validatePartAngles(invalidAngles);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(err => err.includes('topLeft'))).toBe(true);
      expect(result.errors.some(err => err.includes('topRight'))).toBe(true);
      expect(result.errors.some(err => err.includes('bottomLeft'))).toBe(true);
    });

    test('應該能同時檢測多個錯誤', () => {
      const invalidAngles: PartAngles = {
        topLeft: 45,
        topRight: 90,     // 無效角度
        bottomLeft: 30,   // 與topLeft衝突
        bottomRight: -5   // 無效角度
      };
      
      const result = validatePartAngles(invalidAngles);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('calculateSharedCutSavings', () => {
    test('應該正確計算45度角的節省量', () => {
      const savings = calculateSharedCutSavings(45, 10, 10);
      // sin(45°) ≈ 0.707
      expect(savings).toBeCloseTo(7.07, 2);
    });

    test('應該正確計算30度角的節省量', () => {
      const savings = calculateSharedCutSavings(30, 20, 15);
      // sin(30°) = 0.5, 最小厚度是15
      expect(savings).toBeCloseTo(7.5, 1);
    });

    test('應該正確計算60度角的節省量', () => {
      const savings = calculateSharedCutSavings(60, 10, 12);
      // sin(60°) ≈ 0.866, 最小厚度是10
      expect(savings).toBeCloseTo(8.66, 2);
    });

    test('應該使用最小厚度進行計算', () => {
      const savings1 = calculateSharedCutSavings(45, 5, 10);  // 應使用5
      const savings2 = calculateSharedCutSavings(45, 10, 5);  // 應使用5
      
      expect(savings1).toBeCloseTo(savings2, 3);
      expect(savings1).toBeCloseTo(3.536, 3);  // sin(45°) * 5
    });

    test('0度角應該返回0節省量', () => {
      const savings = calculateSharedCutSavings(0, 10, 10);
      expect(savings).toBe(0);
    });
  });

  describe('canAnglesMatch', () => {
    test('應該允許相同角度匹配', () => {
      expect(canAnglesMatch(45, 45, 10)).toBe(true);
      expect(canAnglesMatch(30, 30, 5)).toBe(true);
    });

    test('應該允許容差範圍內的角度匹配', () => {
      expect(canAnglesMatch(45, 50, 10)).toBe(true);   // 差5度，容差10度
      expect(canAnglesMatch(45, 40, 10)).toBe(true);   // 差5度，容差10度
      expect(canAnglesMatch(30, 40, 10)).toBe(true);   // 差10度，容差10度
    });

    test('應該拒絕超出容差範圍的角度匹配', () => {
      expect(canAnglesMatch(45, 60, 10)).toBe(false);  // 差15度，超出容差10度
      expect(canAnglesMatch(30, 50, 15)).toBe(false);  // 差20度，超出容差15度
    });

    test('應該拒絕0度角的匹配', () => {
      expect(canAnglesMatch(0, 45, 10)).toBe(false);   // 0度不能共刀
      expect(canAnglesMatch(45, 0, 10)).toBe(false);   // 0度不能共刀
      expect(canAnglesMatch(0, 0, 10)).toBe(false);    // 兩個0度都不能共刀
    });

    test('應該正確處理邊界情況', () => {
      expect(canAnglesMatch(45, 55, 10)).toBe(true);   // 剛好在容差邊界
      expect(canAnglesMatch(45, 35, 10)).toBe(true);   // 剛好在容差邊界
      expect(canAnglesMatch(45, 55.1, 10)).toBe(false); // 稍微超出容差
    });
  });

  describe('DEFAULT_CUTTING_SETTINGS', () => {
    test('應該包含正確的預設值', () => {
      expect(DEFAULT_CUTTING_SETTINGS.frontCuttingLoss).toBe(10);
      expect(DEFAULT_CUTTING_SETTINGS.cuttingLoss).toBe(3);
      expect(DEFAULT_CUTTING_SETTINGS.angleTolerance).toBe(10);
      expect(DEFAULT_CUTTING_SETTINGS.maxChainLength).toBe(50);
    });
  });
});