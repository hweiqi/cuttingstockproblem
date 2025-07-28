/**
 * 共刀節省計算詳細測試
 * 驗證計算公式：savings = sin(sharedAngle * π / 180) * minThickness
 */

import { calculateSharedCutSavings } from '../../../types/core';

describe('SharedCutCalculator - 詳細測試', () => {
  
  describe('基本計算測試', () => {
    test('應該正確實現sin公式', () => {
      // 測試已知角度的sin值
      const testCases = [
        { angle: 30, expectedSin: 0.5, thickness: 10, expectedSavings: 5 },
        { angle: 45, expectedSin: Math.sqrt(2)/2, thickness: 10, expectedSavings: Math.sqrt(2)/2 * 10 },
        { angle: 60, expectedSin: Math.sqrt(3)/2, thickness: 10, expectedSavings: Math.sqrt(3)/2 * 10 },
        { angle: 90, expectedSin: 1, thickness: 10, expectedSavings: 10 }
      ];

      for (const testCase of testCases) {
        const result = calculateSharedCutSavings(testCase.angle, testCase.thickness, testCase.thickness);
        expect(result).toBeCloseTo(testCase.expectedSavings, 10);
      }
    });

    test('應該使用最小厚度進行計算', () => {
      const angle = 45;
      
      // 測試不同厚度組合
      expect(calculateSharedCutSavings(angle, 10, 20)).toBeCloseTo(calculateSharedCutSavings(angle, 10, 10), 10);
      expect(calculateSharedCutSavings(angle, 20, 10)).toBeCloseTo(calculateSharedCutSavings(angle, 10, 10), 10);
      expect(calculateSharedCutSavings(angle, 5, 15)).toBeCloseTo(calculateSharedCutSavings(angle, 5, 5), 10);
    });

    test('應該正確處理0度角', () => {
      const result = calculateSharedCutSavings(0, 10, 10);
      expect(result).toBe(0);
    });

    test('應該正確處理90度角（雖然實際不允許）', () => {
      const result = calculateSharedCutSavings(90, 10, 10);
      expect(result).toBeCloseTo(10, 10); // sin(90°) = 1
    });
  });

  describe('精確度測試', () => {
    test('應該有足夠的計算精確度', () => {
      // 測試小角度的精確計算
      const smallAngle = 1; // 1度
      const expectedSavings = Math.sin(1 * Math.PI / 180) * 10;
      const result = calculateSharedCutSavings(smallAngle, 10, 10);
      
      expect(result).toBeCloseTo(expectedSavings, 15); // 15位小數精確度
    });

    test('應該正確處理大角度', () => {
      // 測試接近90度的角度
      const largeAngle = 89.9;
      const expectedSavings = Math.sin(largeAngle * Math.PI / 180) * 10;
      const result = calculateSharedCutSavings(largeAngle, 10, 10);
      
      expect(result).toBeCloseTo(expectedSavings, 10);
    });

    test('應該處理非整數角度', () => {
      const angle = 45.5;
      const expectedSavings = Math.sin(angle * Math.PI / 180) * 10;
      const result = calculateSharedCutSavings(angle, 10, 10);
      
      expect(result).toBeCloseTo(expectedSavings, 10);
    });
  });

  describe('business-logic.md 範例驗證', () => {
    test('應該符合文件中的計算範例', () => {
      // 文件範例：兩個零件都有45°角，厚度為10mm
      // 節省量 = sin(45°) × 10 = 0.707 × 10 = 7.07mm
      const result = calculateSharedCutSavings(45, 10, 10);
      expect(result).toBeCloseTo(7.07, 2); // 精確到小數點後2位
    });

    test('應該驗證材料節省範圍', () => {
      // 文件提到：每個共刀連接可節省 5-15mm
      const testCases = [
        { angle: 30, thickness: 10 }, // 應該約5mm
        { angle: 60, thickness: 15 }, // 應該約13mm
        { angle: 45, thickness: 20 }  // 應該約14mm
      ];

      for (const testCase of testCases) {
        const result = calculateSharedCutSavings(testCase.angle, testCase.thickness, testCase.thickness);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(20); // 合理的上限
      }
    });
  });

  describe('邊界情況測試', () => {
    test('應該處理極小厚度', () => {
      const result = calculateSharedCutSavings(45, 0.1, 0.1);
      expect(result).toBeCloseTo(0.1 * Math.sin(45 * Math.PI / 180), 10);
    });

    test('應該處理極大厚度', () => {
      const result = calculateSharedCutSavings(45, 1000, 1000);
      expect(result).toBeCloseTo(1000 * Math.sin(45 * Math.PI / 180), 5);
    });

    test('應該處理厚度差異很大的情況', () => {
      const result = calculateSharedCutSavings(45, 1, 1000);
      const expected = 1 * Math.sin(45 * Math.PI / 180); // 使用最小厚度1
      expect(result).toBeCloseTo(expected, 10);
    });

    test('應該處理相同厚度', () => {
      const thickness = 15;
      const result = calculateSharedCutSavings(60, thickness, thickness);
      const expected = thickness * Math.sin(60 * Math.PI / 180);
      expect(result).toBeCloseTo(expected, 10);
    });
  });

  describe('常見角度的節省量測試', () => {
    test('應該正確計算常見工業角度的節省量', () => {
      const commonAngles = [15, 22.5, 30, 37.5, 45, 52.5, 60, 67.5, 75];
      const thickness = 10;

      for (const angle of commonAngles) {
        const result = calculateSharedCutSavings(angle, thickness, thickness);
        const expected = thickness * Math.sin(angle * Math.PI / 180);
        
        expect(result).toBeCloseTo(expected, 10);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(thickness);
      }
    });

    test('應該驗證節省量隨角度增加而增加', () => {
      const thickness = 10;
      const angles = [15, 30, 45, 60, 75];
      const savings = angles.map(angle => calculateSharedCutSavings(angle, thickness, thickness));

      // 節省量應該隨角度增加而增加（因為sin函數在0-90度區間遞增）
      for (let i = 1; i < savings.length; i++) {
        expect(savings[i]).toBeGreaterThan(savings[i-1]);
      }
    });
  });

  describe('數值穩定性測試', () => {
    test('應該在重複計算中保持數值穩定', () => {
      const angle = 45;
      const thickness1 = 10;
      const thickness2 = 15;

      // 多次計算應該得到相同結果
      const results = [];
      for (let i = 0; i < 1000; i++) {
        results.push(calculateSharedCutSavings(angle, thickness1, thickness2));
      }

      // 所有結果應該相同
      const firstResult = results[0];
      for (const result of results) {
        expect(result).toBe(firstResult);
      }
    });

    test('應該處理浮點數精度問題', () => {
      // 測試可能導致浮點數精度問題的計算
      const angle = 1/3; // 0.333...
      const thickness = 1/7; // 0.142857...
      
      const result = calculateSharedCutSavings(angle, thickness, thickness);
      expect(Number.isFinite(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('實際工程應用測試', () => {
    test('應該能處理實際工程中的角度和厚度組合', () => {
      // 模擬實際工程情況
      const realWorldCases = [
        { angle: 45, thickness1: 12, thickness2: 12, description: '標準45度切角，12mm厚板' },
        { angle: 30, thickness1: 8, thickness2: 10, description: '30度斜角，不同厚度' },
        { angle: 60, thickness1: 15, thickness2: 20, description: '60度角，厚板材' },
        { angle: 22.5, thickness1: 6, thickness2: 6, description: '22.5度精細角度' }
      ];

      for (const testCase of realWorldCases) {
        const result = calculateSharedCutSavings(testCase.angle, testCase.thickness1, testCase.thickness2);
        
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(Math.min(testCase.thickness1, testCase.thickness2));
        expect(Number.isFinite(result)).toBe(true);
      }
    });

    test('應該提供合理的節省量估算', () => {
      // 驗證節省量在合理範圍內
      const angle = 45;
      const thickness = 10;
      const result = calculateSharedCutSavings(angle, thickness, thickness);
      
      // 45度角，10mm厚度的節省量應該在 5-8mm 之間
      expect(result).toBeGreaterThan(5);
      expect(result).toBeLessThan(8);
    });
  });
});