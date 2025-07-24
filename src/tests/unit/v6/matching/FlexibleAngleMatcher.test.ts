import { describe, it, expect, beforeEach } from '@jest/globals';
import { FlexibleAngleMatcher } from '../../../../core/v6/matching/FlexibleAngleMatcher';
import { Part, PartAngles } from '../../../../core/v6/models/Part';
import { AngleMatch, AnglePosition } from '../../../../core/v6/models/SharedCut';

describe('FlexibleAngleMatcher - 靈活角度匹配測試', () => {
  let matcher: FlexibleAngleMatcher;

  beforeEach(() => {
    matcher = new FlexibleAngleMatcher();
  });

  describe('基本角度匹配', () => {
    it('應該匹配完全相同的角度', () => {
      const part1: Part = {
        id: 'A',
        length: 1000,
        angles: {
          topLeft: 33,
          topRight: 33,
          bottomLeft: 0,
          bottomRight: 0
        },
        thickness: 20
      };

      const part2: Part = {
        id: 'B',
        length: 1000,
        angles: {
          topLeft: 33,
          topRight: 33,
          bottomLeft: 0,
          bottomRight: 0
        },
        thickness: 20
      };

      const matches = matcher.findMatches(part1, part2);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].angle).toBe(33);
      expect(matches[0].isExactMatch).toBe(true);
    });

    it('應該匹配容差範圍內的角度（32度和35度）', () => {
      const part1: Part = {
        id: 'A',
        length: 1000,
        angles: {
          topLeft: 32,
          topRight: 0,
          bottomLeft: 0,
          bottomRight: 0
        },
        thickness: 20
      };

      const part2: Part = {
        id: 'B',
        length: 1000,
        angles: {
          topLeft: 35,
          topRight: 0,
          bottomLeft: 0,
          bottomRight: 0
        },
        thickness: 20
      };

      const matches = matcher.findMatches(part1, part2);
      
      expect(matches.length).toBeGreaterThan(0);
      const match = matches[0];
      expect(match.isExactMatch).toBe(false);
      expect(match.angleDifference).toBe(3);
      expect(match.averageAngle).toBe(33.5);
    });
  });

  describe('交叉位置匹配', () => {
    it('應該匹配A的左上角和B的右上角', () => {
      const part1: Part = {
        id: 'A',
        length: 1000,
        angles: {
          topLeft: 33,
          topRight: 33,
          bottomLeft: 0,
          bottomRight: 0
        },
        thickness: 20
      };

      const part2: Part = {
        id: 'B',
        length: 1000,
        angles: {
          topLeft: 0,
          topRight: 33,
          bottomLeft: 33,
          bottomRight: 0
        },
        thickness: 20
      };

      const matches = matcher.findMatches(part1, part2);
      
      // 應該找到多個匹配
      expect(matches.length).toBeGreaterThan(0);
      
      // 驗證是否有左上對右上的匹配
      const crossMatch = matches.find(m => 
        m.part1Position === 'topLeft' && m.part2Position === 'topRight'
      );
      expect(crossMatch).toBeDefined();
      expect(crossMatch!.angle).toBe(33);
    });

    it('應該找到所有可能的角度匹配組合', () => {
      const part1: Part = {
        id: 'A',
        length: 1000,
        angles: {
          topLeft: 30,
          topRight: 45,
          bottomLeft: 30,
          bottomRight: 45
        },
        thickness: 20
      };

      const part2: Part = {
        id: 'B',
        length: 1000,
        angles: {
          topLeft: 45,
          topRight: 30,
          bottomLeft: 45,
          bottomRight: 30
        },
        thickness: 20
      };

      const matches = matcher.findMatches(part1, part2);
      
      // 應該找到多個匹配
      expect(matches.length).toBeGreaterThan(4);
      
      // 驗證30度角的匹配
      const matches30 = matches.filter(m => m.angle === 30);
      expect(matches30.length).toBeGreaterThan(0);
      
      // 驗證45度角的匹配
      const matches45 = matches.filter(m => m.angle === 45);
      expect(matches45.length).toBeGreaterThan(0);
    });
  });

  describe('複雜匹配場景', () => {
    it('應該處理多個零件的最優匹配', () => {
      const parts: Part[] = [
        {
          id: 'A',
          length: 1000,
          angles: { topLeft: 33, topRight: 33, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        },
        {
          id: 'B',
          length: 1000,
          angles: { topLeft: 0, topRight: 33, bottomLeft: 33, bottomRight: 0 },
          thickness: 20
        },
        {
          id: 'C',
          length: 1000,
          angles: { topLeft: 35, topRight: 0, bottomLeft: 0, bottomRight: 35 },
          thickness: 20
        }
      ];

      const allMatches = matcher.findBestMatchCombination(parts);
      
      expect(allMatches.length).toBeGreaterThan(0);
      
      // 驗證A和B可以匹配
      const abMatch = allMatches.find(m => 
        (m.part1Id === 'A' && m.part2Id === 'B') ||
        (m.part1Id === 'B' && m.part2Id === 'A')
      );
      expect(abMatch).toBeDefined();
      
      // 驗證A和C可以匹配（角度容差）
      const acMatch = allMatches.find(m => 
        (m.part1Id === 'A' && m.part2Id === 'C') ||
        (m.part1Id === 'C' && m.part2Id === 'A')
      );
      expect(acMatch).toBeDefined();
    });

    it('應該正確計算共刀節省量', () => {
      const part1: Part = {
        id: 'A',
        length: 1000,
        angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        thickness: 20
      };

      const part2: Part = {
        id: 'B',
        length: 1000,
        angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        thickness: 20
      };

      const matches = matcher.findMatches(part1, part2);
      
      expect(matches.length).toBeGreaterThan(0);
      const match = matches[0];
      
      // 45度角的節省量應該合理
      expect(match.savings).toBeGreaterThan(20); // 至少節省20mm
      expect(match.savings).toBeLessThan(50); // 不超過50mm
    });
  });

  describe('邊界條件測試', () => {
    it('應該處理沒有斜切角度的零件', () => {
      const part1: Part = {
        id: 'A',
        length: 1000,
        angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        thickness: 20
      };

      const part2: Part = {
        id: 'B',
        length: 1000,
        angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        thickness: 20
      };

      const matches = matcher.findMatches(part1, part2);
      expect(matches.length).toBe(0);
    });

    it('應該處理極端角度差異', () => {
      const part1: Part = {
        id: 'A',
        length: 1000,
        angles: { topLeft: 15, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        thickness: 20
      };

      const part2: Part = {
        id: 'B',
        length: 1000,
        angles: { topLeft: 75, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        thickness: 20
      };

      const matches = matcher.findMatches(part1, part2);
      // 角度差異太大，不應該匹配
      expect(matches.length).toBe(0);
    });

    it('應該設置合理的角度容差', () => {
      const tolerance = matcher.getAngleTolerance();
      expect(tolerance).toBeGreaterThan(0);
      expect(tolerance).toBeLessThanOrEqual(5); // 最大5度容差
    });
  });
});