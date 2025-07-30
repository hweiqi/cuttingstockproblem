import { describe, test, expect, beforeEach } from '@jest/globals';
import { OptimizedDynamicChainBuilder } from '../../../../core/v6/optimization/OptimizedDynamicChainBuilder';
import { PartWithQuantity } from '../../../../core/v6/models/Part';

describe('OptimizedDynamicChainBuilder - 優化版動態鏈構建測試', () => {
  let builder: OptimizedDynamicChainBuilder;

  beforeEach(() => {
    builder = new OptimizedDynamicChainBuilder();
  });

  const createPart = (
    id: string,
    length: number,
    topLeft = 90,
    topRight = 90,
    bottomLeft = 90,
    bottomRight = 90,
    thickness = 20
  ): PartWithQuantity => ({
    id,
    length,
    angles: { topLeft, topRight, bottomLeft, bottomRight },
    thickness,
    quantity: 1
  });

  describe('基本鏈構建優化', () => {
    test('應該快速構建相同零件的批次鏈', () => {
      const parts: PartWithQuantity[] = [
        { ...createPart('A', 1000, 45), quantity: 100 }
      ];

      const startTime = performance.now();
      const chains = builder.buildChains(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // 100ms內完成
      expect(chains.length).toBeGreaterThan(0);
      expect(chains[0].structure).toBe('batch');
    });

    test('應該使用增量式構建處理混合零件', () => {
      const parts: PartWithQuantity[] = [
        { ...createPart('A', 1000, 45), quantity: 20 },
        { ...createPart('B', 1200, 45), quantity: 20 },
        { ...createPart('C', 800, 30), quantity: 20 },
        { ...createPart('D', 900, 30), quantity: 20 }
      ];

      const result = builder.buildChainsWithReport(parts);

      expect(result.chains.length).toBeGreaterThan(0);
      expect(result.report.processingTime).toBeLessThan(200);
      expect(result.chains.some(c => c.structure === 'mixed')).toBe(true);
    });
  });

  describe('記憶體優化', () => {
    test('應該限制鏈的最大大小', () => {
      const parts: PartWithQuantity[] = [
        { ...createPart('A', 100, 45), quantity: 200 }
      ];

      const chains = builder.buildChains(parts);

      chains.forEach(chain => {
        expect(chain.parts.length).toBeLessThanOrEqual(50); // MAX_CHAIN_SIZE
      });
    });

    test('應該限制鏈的總長度', () => {
      const parts: PartWithQuantity[] = [
        { ...createPart('A', 2000, 45), quantity: 50 }
      ];

      const chains = builder.buildChains(parts);

      chains.forEach(chain => {
        expect(chain.totalLength).toBeLessThanOrEqual(15000); // MAX_CHAIN_LENGTH
      });
    });
  });

  describe('貪心算法優化', () => {
    test('應該優先選擇高收益的匹配', () => {
      const parts: PartWithQuantity[] = [
        { ...createPart('A', 1000, 15), quantity: 5 }, // 低角度，高收益
        { ...createPart('B', 1000, 45), quantity: 5 }, // 中角度，中收益
        { ...createPart('C', 1000, 75), quantity: 5 }, // 高角度，低收益
      ];

      const chains = builder.buildChains(parts);
      const firstChain = chains[0];

      // 應該優先匹配低角度的零件（高收益）
      const hasLowAngleParts = firstChain.parts.some(p => p.partId === 'A');
      expect(hasLowAngleParts).toBe(true);
    });

    test('應該使用最小化浪費策略', () => {
      const parts: PartWithQuantity[] = [
        { ...createPart('A', 3000, 45), quantity: 2 },
        { ...createPart('B', 2000, 45), quantity: 3 },
        { ...createPart('C', 1000, 45), quantity: 5 }
      ];

      const chains = builder.buildChains(parts);

      // 驗證鏈的組合是否合理
      expect(chains.length).toBeGreaterThan(0);
      chains.forEach(chain => {
        expect(chain.totalLength).toBeLessThanOrEqual(15000);
      });
    });
  });

  describe('增量式構建', () => {
    test('應該支援分批添加零件', () => {
      const batch1: PartWithQuantity[] = [
        { ...createPart('A', 1000, 45), quantity: 20 }
      ];
      
      const batch2: PartWithQuantity[] = [
        { ...createPart('B', 1200, 45), quantity: 20 }
      ];

      // 第一批
      const chains1 = builder.buildChains(batch1);
      
      // 第二批
      const allParts = [...batch1, ...batch2];
      const chains2 = builder.buildChains(allParts);

      expect(chains2.length).toBeGreaterThanOrEqual(chains1.length);
      expect(chains2.some(c => c.structure === 'mixed')).toBe(true);
    });

    test('應該支援進度回調', () => {
      const parts: PartWithQuantity[] = [
        { ...createPart('A', 1000, 45), quantity: 100 },
        { ...createPart('B', 1200, 30), quantity: 100 }
      ];

      let progressUpdates = 0;
      const onProgress = (progress: number) => {
        progressUpdates++;
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      };

      builder.buildChainsWithProgress(parts, onProgress);

      expect(progressUpdates).toBeGreaterThan(0);
    });
  });

  describe('效能基準測試', () => {
    test('應該在合理時間內處理1000個零件', () => {
      const parts: PartWithQuantity[] = [];
      for (let i = 0; i < 100; i++) {
        parts.push({
          ...createPart(`P${i}`, 1000 + (i % 500), 30 + (i % 45)),
          quantity: 10
        });
      }

      const startTime = performance.now();
      const result = builder.buildChainsWithReport(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000); // 2秒內完成
      expect(result.chains.length).toBeGreaterThan(0);
      expect(result.report.totalParts).toBe(1000);
    });

    test('應該在合理時間內處理10000個零件', () => {
      const parts: PartWithQuantity[] = [];
      for (let i = 0; i < 200; i++) {
        parts.push({
          ...createPart(`P${i}`, 1000 + (i % 500), 30 + (i % 45)),
          quantity: 50
        });
      }

      const startTime = performance.now();
      const result = builder.buildChainsWithReport(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10000); // 10秒內完成
      expect(result.chains.length).toBeGreaterThan(0);
      expect(result.report.totalParts).toBe(10000);
    });
  });

  describe('策略選擇優化', () => {
    test('應該根據零件多樣性選擇最佳策略', () => {
      // 少量不同類型的零件 - 應該優先混合共刀
      const diverseParts: PartWithQuantity[] = [
        { ...createPart('A', 1000, 45), quantity: 10 },
        { ...createPart('B', 1200, 45), quantity: 10 },
        { ...createPart('C', 800, 45), quantity: 10 }
      ];

      const result1 = builder.buildChainsWithReport(diverseParts);
      expect(result1.report.chainDistribution.mixed).toBeGreaterThan(0);

      // 大量相同零件 - 應該優先批次共刀
      const uniformParts: PartWithQuantity[] = [
        { ...createPart('A', 1000, 45), quantity: 100 }
      ];

      const result2 = builder.buildChainsWithReport(uniformParts);
      expect(result2.report.chainDistribution.batch).toBeGreaterThan(0);
    });
  });

  describe('錯誤處理', () => {
    test('應該處理空零件列表', () => {
      const chains = builder.buildChains([]);
      expect(chains).toEqual([]);
    });

    test('應該處理沒有斜切角度的零件', () => {
      const parts: PartWithQuantity[] = [
        { ...createPart('A', 1000), quantity: 10 }
      ];

      const chains = builder.buildChains(parts);
      expect(chains).toEqual([]);
    });
  });
});