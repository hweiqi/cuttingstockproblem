import { describe, test, expect, beforeEach } from '@jest/globals';
import { OptimizedFlexibleAngleMatcher } from '../../../../core/v6/matching/OptimizedFlexibleAngleMatcher';
import { Part, AnglePositionType } from '../../../../core/v6/models/Part';
import { AngleMatch } from '../../../../core/v6/models/SharedCut';

describe('OptimizedFlexibleAngleMatcher', () => {
  let matcher: OptimizedFlexibleAngleMatcher;
  const DEFAULT_TOLERANCE = 5;

  beforeEach(() => {
    matcher = new OptimizedFlexibleAngleMatcher(DEFAULT_TOLERANCE);
  });

  const createPart = (id: string, angles: Partial<Record<AnglePositionType, number>>): Part => ({
    id,
    length: 1000,
    thickness: 20,
    angles: {
      topLeft: angles.topLeft || 90,
      topRight: angles.topRight || 90,
      bottomLeft: angles.bottomLeft || 90,
      bottomRight: angles.bottomRight || 90
    }
  });

  describe('constructor', () => {
    test('應該設置預設角度容差', () => {
      const defaultMatcher = new OptimizedFlexibleAngleMatcher();
      expect(defaultMatcher.getAngleTolerance()).toBe(DEFAULT_TOLERANCE);
    });

    test('應該設置自定義角度容差', () => {
      const customMatcher = new OptimizedFlexibleAngleMatcher(10);
      expect(customMatcher.getAngleTolerance()).toBe(10);
    });
  });

  describe('findMatches', () => {
    test('應該找到完全相同角度的匹配', () => {
      const part1 = createPart('P1', { topLeft: 45 });
      const part2 = createPart('P2', { topLeft: 45 });

      const matches = matcher.findMatches(part1, part2);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        part1Id: 'P1',
        part2Id: 'P2',
        part1Position: 'topLeft',
        part2Position: 'topLeft',
        angle: 45,
        isExactMatch: true,
        angleDifference: undefined
      });
    });

    test('應該找到容差範圍內的匹配', () => {
      const part1 = createPart('P1', { topLeft: 45 });
      const part2 = createPart('P2', { topLeft: 48 });

      const matches = matcher.findMatches(part1, part2);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        isExactMatch: false,
        angle: 46.5,
        angleDifference: 3
      });
    });

    test('不應該匹配超出容差範圍的角度', () => {
      const part1 = createPart('P1', { topLeft: 45 });
      const part2 = createPart('P2', { topLeft: 51 });

      const matches = matcher.findMatches(part1, part2);

      expect(matches).toHaveLength(0);
    });

    test('應該按分數排序匹配結果', () => {
      const part1 = createPart('P1', { topLeft: 45, topRight: 30 });
      const part2 = createPart('P2', { topLeft: 46, bottomRight: 30 });

      const matches = matcher.findMatches(part1, part2);

      expect(matches.length).toBeGreaterThan(1);
      expect(matches[0].score).toBeGreaterThan(matches[1].score);
    });
  });

  describe('findBestMatchCombination', () => {
    test('應該找到最佳匹配組合', () => {
      const parts = [
        createPart('P1', { topLeft: 45 }),
        createPart('P2', { topLeft: 45 }),
        createPart('P3', { topRight: 30 }),
        createPart('P4', { topRight: 30 })
      ];

      const matches = matcher.findBestMatchCombination(parts);

      expect(matches.length).toBeGreaterThan(0);
      const pairIds = new Set(matches.map(m => `${m.part1Id}-${m.part2Id}`));
      expect(pairIds.size).toBe(matches.length);
    });

    test('應該高效處理大量零件', () => {
      const parts = [];
      for (let i = 0; i < 100; i++) {
        const angle = 30 + (i % 30);
        parts.push(createPart(`P${i}`, { topLeft: angle }));
      }

      const startTime = performance.now();
      const matches = matcher.findBestMatchCombination(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('canShareCut', () => {
    test('應該判斷可以共刀的角度', () => {
      expect(matcher.canShareCut(45, 45)).toBe(true);
      expect(matcher.canShareCut(45, 48)).toBe(true);
    });

    test('應該判斷不能共刀的角度', () => {
      expect(matcher.canShareCut(45, 51)).toBe(false);
      expect(matcher.canShareCut(90, 45)).toBe(false);
    });
  });

  describe('findBestMatchForPart', () => {
    test('應該找到零件的最佳匹配', () => {
      const part = createPart('P1', { topLeft: 45 });
      const candidates = [
        createPart('P2', { topLeft: 46 }),
        createPart('P3', { topLeft: 50 }),
        createPart('P4', { topLeft: 30 })
      ];

      const match = matcher.findBestMatchForPart(part, candidates);

      expect(match).not.toBeNull();
      expect(match?.part2Id).toBe('P2');
    });

    test('應該過濾掉自己', () => {
      const part = createPart('P1', { topLeft: 45 });
      const candidates = [part];

      const match = matcher.findBestMatchForPart(part, candidates);

      expect(match).toBeNull();
    });
  });

  describe('evaluateSharedCuttingPotential', () => {
    test('應該評估共刀潛力', () => {
      const parts = [
        createPart('P1', { topLeft: 45 }),
        createPart('P2', { topLeft: 45 }),
        createPart('P3', { topRight: 30 }),
        createPart('P4', { topRight: 30 })
      ];

      const potential = matcher.evaluateSharedCuttingPotential(parts);

      expect(potential.matchCount).toBeGreaterThan(0);
      expect(potential.totalPotentialSavings).toBeGreaterThan(0);
      expect(potential.averageSavingsPerMatch).toBeGreaterThan(0);
    });

    test('應該高效處理大量零件的潛力評估', () => {
      const parts = [];
      for (let i = 0; i < 1000; i++) {
        const angle = 30 + (i % 30);
        parts.push(createPart(`P${i}`, { topLeft: angle }));
      }

      const startTime = performance.now();
      const potential = matcher.evaluateSharedCuttingPotential(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000);
      expect(potential.matchCount).toBeGreaterThan(0);
    });
  });

  describe('哈希表分組優化', () => {
    test('應該使用哈希表快速分組相同角度的零件', () => {
      const parts = [];
      for (let i = 0; i < 100; i++) {
        parts.push(createPart(`P${i}`, { topLeft: i % 5 === 0 ? 45 : 30 }));
      }

      const startTime = performance.now();
      matcher.findBestMatchCombination(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('早期終止策略', () => {
    test('應該在找到足夠好的匹配時提前終止', () => {
      const parts = [];
      for (let i = 0; i < 1000; i++) {
        parts.push(createPart(`P${i}`, { 
          topLeft: 45,
          topRight: 30 
        }));
      }

      const startTime = performance.now();
      const matches = matcher.findBestMatchCombination(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('效能基準測試', () => {
    test('應該能夠在合理時間內處理10000個零件', () => {
      const parts = [];
      for (let i = 0; i < 10000; i++) {
        const baseAngle = (i % 6) * 15;
        parts.push(createPart(`P${i}`, { 
          topLeft: baseAngle + 30,
          topRight: baseAngle + 45 
        }));
      }

      const startTime = performance.now();
      const potential = matcher.evaluateSharedCuttingPotential(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10000);
      expect(potential.matchCount).toBeGreaterThan(0);
      expect(potential.totalPotentialSavings).toBeGreaterThan(0);
    });

    test('findBestMatchCombination應該能夠在合理時間內處理10000個零件', () => {
      const parts = [];
      for (let i = 0; i < 10000; i++) {
        const baseAngle = (i % 6) * 15;
        parts.push(createPart(`P${i}`, { 
          topLeft: baseAngle + 30,
          topRight: baseAngle + 45 
        }));
      }

      const startTime = performance.now();
      const matches = matcher.findBestMatchCombination(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10000);
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});