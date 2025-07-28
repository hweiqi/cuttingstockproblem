/**
 * 共刀鏈建立系統測試
 */

import { SharedCutChainBuilder } from '../../../services/SharedCutChainBuilder';
import { Part, PartAngles, SharedCutChain } from '../../../types/core';

describe('SharedCutChainBuilder', () => {
  let chainBuilder: SharedCutChainBuilder;

  beforeEach(() => {
    chainBuilder = new SharedCutChainBuilder(10, 50); // 容差10度，最大鏈長50
  });

  // 建立測試用零件的輔助函數
  const createPart = (id: string, length: number, angles: PartAngles, thickness: number = 10, quantity: number = 1): Part => ({
    id,
    length,
    quantity,
    angles,
    thickness
  });

  describe('constructor', () => {
    test('應該使用預設參數', () => {
      const defaultBuilder = new SharedCutChainBuilder();
      expect(defaultBuilder.getMaxChainLength()).toBe(50);
      expect(defaultBuilder.getAngleTolerance()).toBe(10);
    });

    test('應該能設定自訂參數', () => {
      const customBuilder = new SharedCutChainBuilder(15, 30);
      expect(customBuilder.getAngleTolerance()).toBe(15);
      expect(customBuilder.getMaxChainLength()).toBe(30);
    });
  });

  describe('buildChains', () => {
    test('應該能建立簡單的兩零件鏈', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1200, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 })
      ];

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains).toHaveLength(1);
      expect(result.chains[0].partIds).toHaveLength(2);
      expect(result.chains[0].partIds).toContain('p1');
      expect(result.chains[0].partIds).toContain('p2');
      expect(result.chains[0].connections).toHaveLength(1);
      expect(result.remainingParts).toHaveLength(0);
    });

    test('應該能建立三零件鏈', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1200, { topLeft: 45, topRight: 30, bottomLeft: 0, bottomRight: 0 }),
        createPart('p3', 1500, { topLeft: 30, topRight: 0, bottomLeft: 0, bottomRight: 0 })
      ];

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains).toHaveLength(1);
      expect(result.chains[0].partIds).toHaveLength(3);
      expect(result.chains[0].connections).toHaveLength(2);
      expect(result.remainingParts).toHaveLength(0);
    });

    test('應該處理沒有匹配的零件', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1200, { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 }) // 無角度
      ];

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains).toHaveLength(0);
      expect(result.remainingParts).toHaveLength(2);
    });

    test('應該處理只有部分匹配的情況', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1200, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p3', 1500, { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 })  // 無角度
      ];

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains).toHaveLength(1);
      expect(result.chains[0].partIds).toHaveLength(2);
      expect(result.remainingParts).toHaveLength(1);
      expect(result.remainingParts[0].id).toBe('p3');
    });
  });

  describe('混合鏈優先策略', () => {
    test('應該優先建立混合零件鏈', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }), // 同類型
        createPart('p3', 1200, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 })  // 不同類型
      ];

      const result = chainBuilder.buildChains(parts);
      
      // 應該建立包含不同長度零件的混合鏈
      expect(result.chains).toHaveLength(1);
      expect(result.chains[0].isMixedChain).toBe(true);
    });

    test('應該正確識別同質鏈', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 })
      ];

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains).toHaveLength(1);
      expect(result.chains[0].isMixedChain).toBe(false);
    });
  });

  describe('節省量優先策略', () => {
    test('應該優先選擇節省量大的連接', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 30, topRight: 60, bottomLeft: 0, bottomRight: 0 }, 10), // 30度和60度
        createPart('p2', 1200, { topLeft: 30, topRight: 60, bottomLeft: 0, bottomRight: 0 }, 10)  // 可匹配30度或60度
      ];

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains).toHaveLength(1);
      const connection = result.chains[0].connections[0];
      
      // 應該選擇60度角（更大的節省量）
      expect(connection.sharedAngle).toBe(60);
    });

    test('應該按節省量排序多個鏈', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 30, topRight: 0, bottomLeft: 0, bottomRight: 0 }, 10), // 低節省量
        createPart('p2', 1200, { topLeft: 30, topRight: 0, bottomLeft: 0, bottomRight: 0 }, 10),
        createPart('p3', 1500, { topLeft: 60, topRight: 0, bottomLeft: 0, bottomRight: 0 }, 10), // 高節省量
        createPart('p4', 1800, { topLeft: 60, topRight: 0, bottomLeft: 0, bottomRight: 0 }, 10)
      ];

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains).toHaveLength(2);
      // 第一個鏈應該有更高的節省量
      expect(result.chains[0].totalSavings).toBeGreaterThan(result.chains[1].totalSavings);
    });
  });

  describe('最大鏈長度限制', () => {
    test('應該遵守最大鏈長度限制', () => {
      const shortChainBuilder = new SharedCutChainBuilder(10, 3); // 最大長度3
      
      const parts = [];
      for (let i = 1; i <= 10; i++) {
        parts.push(createPart(`p${i}`, 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }));
      }

      const result = shortChainBuilder.buildChains(parts);
      
      // 每個鏈的長度都不應該超過3
      for (const chain of result.chains) {
        expect(chain.partIds.length).toBeLessThanOrEqual(3);
      }
    });

    test('應該能建立多個短鏈而不是一個長鏈', () => {
      const shortChainBuilder = new SharedCutChainBuilder(10, 2); // 最大長度2
      
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p3', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p4', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 })
      ];

      const result = shortChainBuilder.buildChains(parts);
      
      expect(result.chains).toHaveLength(2);
      expect(result.chains[0].partIds).toHaveLength(2);
      expect(result.chains[1].partIds).toHaveLength(2);
    });
  });

  describe('鏈的屬性計算', () => {
    test('應該正確計算鏈的總長度', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1200, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 })
      ];

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains[0].totalLength).toBe(2200); // 1000 + 1200
    });

    test('應該正確計算鏈的總節省量', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }, 10),
        createPart('p2', 1200, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }, 10)
      ];

      const result = chainBuilder.buildChains(parts);
      
      // 45度角，10mm厚度的節省量
      const expectedSavings = Math.sin(45 * Math.PI / 180) * 10;
      expect(result.chains[0].totalSavings).toBeCloseTo(expectedSavings, 5);
    });

    test('應該正確計算總節省量（多個連接）', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }, 10),
        createPart('p2', 1200, { topLeft: 45, topRight: 30, bottomLeft: 0, bottomRight: 0 }, 10),
        createPart('p3', 1500, { topLeft: 30, topRight: 0, bottomLeft: 0, bottomRight: 0 }, 10)
      ];

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains[0].connections).toHaveLength(2);
      expect(result.chains[0].totalSavings).toBeGreaterThan(0);
    });
  });

  describe('複雜場景測試', () => {
    test('應該能處理複雜的多角度零件', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 30, bottomLeft: 0, bottomRight: 60 }),
        createPart('p2', 1200, { topLeft: 60, topRight: 0, bottomLeft: 45, bottomRight: 0 }),
        createPart('p3', 1500, { topLeft: 0, topRight: 45, bottomLeft: 30, bottomRight: 0 })
      ];

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains).toHaveLength(1);
      expect(result.chains[0].partIds).toHaveLength(3);
      expect(result.chains[0].connections).toHaveLength(2);
    });

    test('應該能處理大量零件', () => {
      const parts = [];
      for (let i = 1; i <= 20; i++) {
        parts.push(createPart(`p${i}`, i * 100, { 
          topLeft: 45, 
          topRight: 0, 
          bottomLeft: 0, 
          bottomRight: 0 
        }));
      }

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains).toHaveLength(1);
      expect(result.chains[0].partIds).toHaveLength(20);
      expect(result.chains[0].connections).toHaveLength(19);
      expect(result.chains[0].isMixedChain).toBe(true); // 不同長度的零件
    });

    test('應該能處理多個獨立的鏈', () => {
      const parts = [
        // 第一個鏈：45度角
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1200, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        // 第二個鏈：30度角
        createPart('p3', 1500, { topLeft: 30, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p4', 1800, { topLeft: 30, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        // 無法匹配的零件
        createPart('p5', 2000, { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 })
      ];

      const result = chainBuilder.buildChains(parts);
      
      expect(result.chains).toHaveLength(2);
      expect(result.remainingParts).toHaveLength(1);
      expect(result.remainingParts[0].id).toBe('p5');
    });
  });

  describe('數量處理', () => {
    test('應該考慮零件數量', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }, 10, 3), // 3個實例
        createPart('p2', 1200, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }, 10, 2)  // 2個實例
      ];

      const result = chainBuilder.buildChains(parts);
      
      // 應該建立可能的鏈，考慮數量限制
      expect(result.chains.length).toBeGreaterThan(0);
    });
  });

  describe('更新設定', () => {
    test('應該能更新角度容差', () => {
      chainBuilder.updateAngleTolerance(20);
      expect(chainBuilder.getAngleTolerance()).toBe(20);
    });

    test('應該能更新最大鏈長度', () => {
      chainBuilder.updateMaxChainLength(30);
      expect(chainBuilder.getMaxChainLength()).toBe(30);
    });

    test('更新設定後應該影響鏈建立結果', () => {
      const parts = [
        createPart('p1', 1000, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1200, { topLeft: 60, topRight: 0, bottomLeft: 0, bottomRight: 0 }) // 差15度
      ];

      // 原本容差10度，不能匹配
      let result = chainBuilder.buildChains(parts);
      expect(result.chains).toHaveLength(0);

      // 更新容差到20度，可以匹配
      chainBuilder.updateAngleTolerance(20);
      result = chainBuilder.buildChains(parts);
      expect(result.chains).toHaveLength(1);
    });
  });
});