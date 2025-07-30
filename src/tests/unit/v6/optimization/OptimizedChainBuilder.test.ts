import { OptimizedChainBuilder } from '../../../../core/v6/optimization/OptimizedChainBuilder';
import { PartWithQuantity } from '../../../../core/v6/models/Part';

describe('OptimizedChainBuilder', () => {
  let builder: OptimizedChainBuilder;

  beforeEach(() => {
    builder = new OptimizedChainBuilder();
  });

  describe('buildChains', () => {
    test('應該正確處理大量零件而不展開所有實例', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1000,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
          thickness: 20,
          quantity: 10000
        },
        {
          id: 'P2',
          length: 1500,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
          thickness: 20,
          quantity: 10000
        }
      ];

      const startTime = performance.now();
      const chains = builder.buildChains(parts);
      const endTime = performance.now();

      // 效能要求：應在100ms內完成
      expect(endTime - startTime).toBeLessThan(100);
      expect(chains.length).toBeGreaterThan(0);
    });

    test('應該限制單個鏈的最大零件數', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 100, // 短零件
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
          thickness: 20,
          quantity: 100
        }
      ];

      const chains = builder.buildChains(parts);
      
      chains.forEach(chain => {
        expect(chain.parts.length).toBeLessThanOrEqual(50); // MAX_CHAIN_SIZE
      });
    });

    test('應該限制鏈的總長度', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 5000, // 長零件
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
          thickness: 20,
          quantity: 10
        }
      ];

      const chains = builder.buildChains(parts);
      
      chains.forEach(chain => {
        expect(chain.totalLength).toBeLessThanOrEqual(15000); // MAX_CHAIN_LENGTH
      });
    });

    test('應該有效地批次處理相同零件', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1000,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
          thickness: 20,
          quantity: 50000
        }
      ];

      const startTime = performance.now();
      const result = builder.buildChainsWithReport(parts);
      const endTime = performance.now();

      // 效能要求：應在500ms內完成
      expect(endTime - startTime).toBeLessThan(500);
      expect(result.chains.length).toBeGreaterThan(0);
      expect(result.report.totalChains).toBeLessThan(1200); // 限制鏈的數量
    });

    test('應該處理混合零件但限制處理數量', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1000,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
          thickness: 20,
          quantity: 25000
        },
        {
          id: 'P2',
          length: 1500,
          angles: { topLeft: 30, topRight: 0, bottomLeft: 0, bottomRight: 30 },
          thickness: 20,
          quantity: 25000
        }
      ];

      const startTime = performance.now();
      const result = builder.buildChainsWithReport(parts);
      const endTime = performance.now();

      // 效能要求：應在1秒內完成
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result.chains.length).toBeGreaterThan(0);
    });

    test('應該跳過沒有斜切角度的零件', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1000,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20,
          quantity: 10000
        }
      ];

      const chains = builder.buildChains(parts);
      expect(chains.length).toBe(0);
    });

    test('應該正確計算節省量', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1000,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
          thickness: 20,
          quantity: 10
        }
      ];

      const result = builder.buildChainsWithReport(parts);
      
      expect(result.chains[0].totalSavings).toBeGreaterThan(0);
      expect(result.chains[0].totalSavings).toBeLessThan(100); // 10個零件9個連接的合理節省範圍
    });

    test('應該使用延遲展開策略', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1000,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
          thickness: 20,
          quantity: 100000 // 超大數量
        }
      ];

      const startTime = performance.now();
      const chains = builder.buildChains(parts);
      const endTime = performance.now();

      // 即使有100000個零件，也應該快速完成
      expect(endTime - startTime).toBeLessThan(1000);
      expect(chains.length).toBeGreaterThan(0);
    });

    test('應該限制總鏈數量', () => {
      const parts: PartWithQuantity[] = [];
      
      // 創建很多不同的零件類型
      for (let i = 0; i < 1000; i++) {
        parts.push({
          id: `P${i}`,
          length: 1000 + (i % 10) * 100,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
          thickness: 20,
          quantity: 100
        });
      }

      const result = builder.buildChainsWithReport(parts);
      
      // 應該限制鏈的總數量
      expect(result.chains.length).toBeLessThan(5000);
      expect(result.report.processingTime).toBeLessThan(5000);
    });
  });

  describe('效能邊界測試', () => {
    test('應該處理極端情況：單個零件大量數量', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'P1',
          length: 1000,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
          thickness: 20,
          quantity: 1000000 // 一百萬
        }
      ];

      const startTime = performance.now();
      const chains = builder.buildChains(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000);
      expect(chains.length).toBeGreaterThan(0);
    });

    test('應該處理極端情況：大量不同零件', () => {
      const parts: PartWithQuantity[] = [];
      
      // 創建10000種不同的零件
      for (let i = 0; i < 10000; i++) {
        parts.push({
          id: `P${i}`,
          length: 1000 + (i % 1000),
          angles: { topLeft: 30 + (i % 30), topRight: 0, bottomLeft: 0, bottomRight: 30 + (i % 30) },
          thickness: 20,
          quantity: 5
        });
      }

      const startTime = performance.now();
      const chains = builder.buildChains(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10000);
      expect(chains.length).toBeGreaterThan(0);
    });
  });
});