/**
 * 共刀匹配系統測試
 */

import { SharedCutMatcher } from '../../../services/SharedCutMatcher';
import { Part, PartAngles } from '../../../types/core';

describe('SharedCutMatcher', () => {
  let matcher: SharedCutMatcher;

  beforeEach(() => {
    matcher = new SharedCutMatcher(10); // 預設容差±10°
  });

  // 建立測試用零件的輔助函數
  const createPart = (id: string, length: number, angles: PartAngles, thickness: number = 10): Part => ({
    id,
    length,
    quantity: 1,
    angles,
    thickness
  });

  describe('constructor', () => {
    test('應該使用預設容差', () => {
      const defaultMatcher = new SharedCutMatcher();
      expect(defaultMatcher.getAngleTolerance()).toBe(10);
    });

    test('應該能設定自訂容差', () => {
      const customMatcher = new SharedCutMatcher(15);
      expect(customMatcher.getAngleTolerance()).toBe(15);
    });
  });

  describe('canPartsShareCut', () => {
    test('應該能匹配相同角度的零件', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 45,    // 相同角度
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const canMatch = matcher.canPartsShareCut(part1, part2);
      expect(canMatch).toBe(true);
    });

    test('應該能匹配容差範圍內的角度', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 50,    // 差5度，在容差10度內
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const canMatch = matcher.canPartsShareCut(part1, part2);
      expect(canMatch).toBe(true);
    });

    test('應該支援跨位置匹配', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 0,
        topRight: 45,   // topLeft與topRight匹配
        bottomLeft: 0,
        bottomRight: 0
      });

      const canMatch = matcher.canPartsShareCut(part1, part2);
      expect(canMatch).toBe(true);
    });

    test('應該拒絕超出容差範圍的角度', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 60,    // 差15度，超出容差10度
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const canMatch = matcher.canPartsShareCut(part1, part2);
      expect(canMatch).toBe(false);
    });

    test('應該拒絕0度角的匹配', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 0,     // 0度不能共刀
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const canMatch = matcher.canPartsShareCut(part1, part2);
      expect(canMatch).toBe(false);
    });

    test('應該拒絕兩個零件都只有0度角', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const canMatch = matcher.canPartsShareCut(part1, part2);
      expect(canMatch).toBe(false);
    });
  });

  describe('findMatchingAngles', () => {
    test('應該找到所有匹配的角度組合', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 45,
        topRight: 30,
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 45,    // 與part1.topLeft匹配
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 30  // 與part1.topRight匹配
      });

      const matches = matcher.findMatchingAngles(part1, part2);
      expect(matches).toHaveLength(2);
      
      // 檢查匹配結果
      expect(matches.some(m => 
        m.part1Position === 'topLeft' && 
        m.part2Position === 'topLeft' && 
        m.sharedAngle === 45
      )).toBe(true);

      expect(matches.some(m => 
        m.part1Position === 'topRight' && 
        m.part2Position === 'bottomRight' && 
        m.sharedAngle === 30
      )).toBe(true);
    });

    test('應該返回空陣列當沒有匹配時', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const matches = matcher.findMatchingAngles(part1, part2);
      expect(matches).toHaveLength(0);
    });

    test('應該正確處理容差邊界情況', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 55,    // 剛好在容差邊界（差10度）
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const matches = matcher.findMatchingAngles(part1, part2);
      expect(matches).toHaveLength(1);
      expect(matches[0].sharedAngle).toBe(45); // 使用較小的角度作為共享角度
    });
  });

  describe('getBestMatch', () => {
    test('應該選擇節省量最大的匹配', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 30,    // sin(30°) = 0.5
        topRight: 60,   // sin(60°) ≈ 0.866
        bottomLeft: 0,
        bottomRight: 0
      }, 10);

      const part2 = createPart('p2', 1500, {
        topLeft: 30,
        topRight: 60,
        bottomLeft: 0,
        bottomRight: 0
      }, 10);

      const bestMatch = matcher.getBestMatch(part1, part2);
      expect(bestMatch).toBeDefined();
      expect(bestMatch!.sharedAngle).toBe(60); // 60度的節省量更大
    });

    test('當沒有匹配時應該返回undefined', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const bestMatch = matcher.getBestMatch(part1, part2);
      expect(bestMatch).toBeUndefined();
    });
  });

  describe('findAllPossibleMatches', () => {
    test('應該找到所有可能的零件匹配組合', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1200, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p3', 1500, { topLeft: 30, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p4', 800, { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 })  // 無角度
      ];

      const matches = matcher.findAllPossibleMatches(parts);
      
      // 應該找到 p1-p2 的匹配，但不包括 p4（無角度）
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => 
        (m.part1Id === 'p1' && m.part2Id === 'p2') || 
        (m.part1Id === 'p2' && m.part2Id === 'p1')
      )).toBe(true);
      
      // 不應該包含p4的匹配
      expect(matches.some(m => m.part1Id === 'p4' || m.part2Id === 'p4')).toBe(false);
    });

    test('當沒有匹配時應該返回空陣列', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1200, { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 })
      ];

      const matches = matcher.findAllPossibleMatches(parts);
      expect(matches).toHaveLength(0);
    });
  });

  describe('updateAngleTolerance', () => {
    test('應該能更新容差設定', () => {
      expect(matcher.getAngleTolerance()).toBe(10);
      
      matcher.updateAngleTolerance(15);
      expect(matcher.getAngleTolerance()).toBe(15);
    });

    test('更新容差後應該影響匹配結果', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 60,    // 差15度
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });

      // 原本容差10度，不能匹配
      expect(matcher.canPartsShareCut(part1, part2)).toBe(false);
      
      // 更新容差到20度，可以匹配
      matcher.updateAngleTolerance(20);
      expect(matcher.canPartsShareCut(part1, part2)).toBe(true);
    });
  });

  describe('複雜場景測試', () => {
    test('應該能處理多角度零件的複雜匹配', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 45,
        topRight: 30,
        bottomLeft: 0,
        bottomRight: 60
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 60,    // 與part1.bottomRight匹配
        topRight: 0,
        bottomLeft: 45, // 與part1.topLeft匹配
        bottomRight: 0
      });

      const matches = matcher.findMatchingAngles(part1, part2);
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    test('應該能處理邊界角度值', () => {
      const part1 = createPart('p1', 1200, {
        topLeft: 0.1,   // 接近0度但不是0度
        topRight: 89.9, // 接近90度但不是90度
        bottomLeft: 0,
        bottomRight: 0
      });

      const part2 = createPart('p2', 1500, {
        topLeft: 5,     // 在容差範圍內
        topRight: 85,   // 在容差範圍內
        bottomLeft: 0,
        bottomRight: 0
      });

      const canMatch = matcher.canPartsShareCut(part1, part2);
      expect(canMatch).toBe(true);
    });

    test('應該能處理大量零件的匹配', () => {
      const parts: Part[] = [];
      
      // 建立50個零件，每個都有45度角
      for (let i = 1; i <= 50; i++) {
        parts.push(createPart(`p${i}`, i * 100, {
          topLeft: 45,
          topRight: 0,
          bottomLeft: 0,
          bottomRight: 0
        }));
      }

      const matches = matcher.findAllPossibleMatches(parts);
      
      // 50個零件應該有 C(50,2) = 1225 個可能的匹配組合
      expect(matches.length).toBe(1225);
    });
  });
});