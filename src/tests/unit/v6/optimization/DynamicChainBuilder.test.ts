import { describe, it, expect, beforeEach } from '@jest/globals';
import { DynamicChainBuilder } from '../../../../core/v6/optimization/DynamicChainBuilder';
import { PartWithQuantity } from '../../../../core/v6/models/Part';
import { SharedCutChain } from '../../../../core/v6/models/Chain';

describe('DynamicChainBuilder - 動態共刀鏈構建測試', () => {
  let chainBuilder: DynamicChainBuilder;

  beforeEach(() => {
    chainBuilder = new DynamicChainBuilder(5); // 明確設定角度容差為 5°
  });

  describe('基本共刀鏈構建', () => {
    it('應該為相同零件構建共刀鏈', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 2222,
          quantity: 4,
          angles: {
            topLeft: 33,
            topRight: 33,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const chains = chainBuilder.buildChains(parts);
      
      expect(chains.length).toBeGreaterThan(0);
      const chain = chains[0];
      
      // 驗證鏈包含所有零件
      expect(chain.parts.length).toBe(4);
      expect(chain.parts.every(p => p.partId === 'A')).toBe(true);
      
      // 驗證節省量
      expect(chain.totalSavings).toBeGreaterThan(0);
      
      // 驗證連接
      expect(chain.connections.length).toBe(3); // 4個零件，3個連接
    });

    it('應該為不同但相容的零件構建共刀鏈', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 1000,
          quantity: 2,
          angles: {
            topLeft: 33,
            topRight: 33,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'B',
          length: 1000,
          quantity: 2,
          angles: {
            topLeft: 0,
            topRight: 33,
            bottomLeft: 33,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const chains = chainBuilder.buildChains(parts);
      
      console.log('構建的鏈數:', chains.length);
      chains.forEach((chain, i) => {
        console.log(`鏈${i}: 零件=${chain.parts.map(p => p.partId).join(',')}, 結構=${chain.structure}`);
      });
      
      expect(chains.length).toBeGreaterThan(0);
      
      // 應該找到包含A和B的鏈
      const mixedChain = chains.find(chain => {
        const partIds = new Set(chain.parts.map(p => p.partId));
        return partIds.has('A') && partIds.has('B');
      });
      
      expect(mixedChain).toBeDefined();
      if (mixedChain) {
        expect(mixedChain.structure).toBe('mixed'); // 混合結構
      }
    });

    it('應該處理角度容差內的零件共刀', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 1500,
          quantity: 2, // 至少需要2個才能構建鏈
          angles: {
            topLeft: 32,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'B',
          length: 1500,
          quantity: 2, // 至少需要2個才能構建鏈
          angles: {
            topLeft: 35,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const result = chainBuilder.buildChainsWithReport(parts);
      const chains = result.chains;
      
      // 系統應該構建共刀鏈
      expect(chains.length).toBeGreaterThan(0);
      
      // 驗證報告中顯示了角度匹配
      expect(result.report.totalChains).toBeGreaterThan(0);
      
      // 驗證所有零件都被考慮
      const totalPartInstances = parts.reduce((sum, p) => sum + p.quantity, 0);
      const chainPartCount = chains.reduce((sum, chain) => sum + chain.parts.length, 0);
      
      // 驗證至少有一些零件被納入鏈中
      expect(chainPartCount).toBeGreaterThan(0);
      expect(chainPartCount).toBeLessThanOrEqual(totalPartInstances);
    });
  });

  describe('複雜共刀鏈場景', () => {
    it('應該構建複雜的多零件共刀鏈', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 1000,
          quantity: 2,
          angles: {
            topLeft: 30,
            topRight: 45,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'B',
          length: 1000,
          quantity: 2,
          angles: {
            topLeft: 45,
            topRight: 30,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'C',
          length: 1000,
          quantity: 2,
          angles: {
            topLeft: 30,
            topRight: 0,
            bottomLeft: 45,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const chains = chainBuilder.buildChains(parts);
      
      expect(chains.length).toBeGreaterThan(0);
      
      // 應該能形成包含多種零件的鏈
      const complexChain = chains.find(chain => {
        const partIds = new Set(chain.parts.map(p => p.partId));
        return partIds.size > 2; // 包含3種不同零件
      });
      
      if (complexChain) {
        expect(complexChain.structure).toBe('complex');
        expect(complexChain.parts.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('應該優化共刀鏈的排列順序', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'SHORT',
          length: 500,
          quantity: 5,
          angles: {
            topLeft: 45,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 15
        },
        {
          id: 'LONG',
          length: 2000,
          quantity: 5,
          angles: {
            topLeft: 45,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 15
        }
      ];

      const chains = chainBuilder.buildChains(parts);
      
      expect(chains.length).toBeGreaterThan(0);
      
      // 驗證鏈的優化
      chains.forEach(chain => {
        expect(chain.isOptimized).toBe(true);
        // 驗證節省量計算正確
        const expectedSavings = chain.connections.reduce((sum, conn) => sum + conn.savings, 0);
        expect(Math.abs(chain.totalSavings - expectedSavings)).toBeLessThan(0.01);
      });
    });
  });

  describe('大量零件處理', () => {
    it('應該高效處理大量相同零件', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'MASS',
          length: 1000,
          quantity: 100,
          angles: {
            topLeft: 45,
            topRight: 45,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const startTime = performance.now();
      const chains = chainBuilder.buildChains(parts);
      const endTime = performance.now();
      
      expect(chains.length).toBeGreaterThan(0);
      
      // 驗證所有零件都被包含在鏈中
      const totalPartsInChains = chains.reduce((sum, chain) => sum + chain.parts.length, 0);
      expect(totalPartsInChains).toBe(100);
      
      // 性能測試：應該在合理時間內完成
      expect(endTime - startTime).toBeLessThan(1000); // 1秒內
    });

    it('應該智能分批處理超大量零件', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'HUGE',
          length: 500,
          quantity: 1000,
          angles: {
            topLeft: 30,
            topRight: 30,
            bottomLeft: 30,
            bottomRight: 30
          },
          thickness: 15
        }
      ];

      const chains = chainBuilder.buildChains(parts);
      
      expect(chains.length).toBeGreaterThan(1); // 應該分成多個鏈
      
      // 驗證每個鏈的大小合理
      chains.forEach(chain => {
        expect(chain.parts.length).toBeLessThanOrEqual(50); // 每個鏈最多50個零件
        expect(chain.parts.length).toBeGreaterThan(1); // 至少2個零件
      });
    });
  });

  describe('特殊情況處理', () => {
    it('應該處理沒有斜切角度的零件', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'STRAIGHT',
          length: 1000,
          quantity: 10,
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const chains = chainBuilder.buildChains(parts);
      
      expect(chains.length).toBe(0); // 不應該有共刀鏈
    });

    it('應該處理混合有無斜切角度的零件', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'ANGLED',
          length: 1000,
          quantity: 5,
          angles: {
            topLeft: 45,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'STRAIGHT',
          length: 1000,
          quantity: 5,
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const chains = chainBuilder.buildChains(parts);
      
      // 只有ANGLED零件應該形成共刀鏈
      expect(chains.length).toBeGreaterThan(0);
      
      const angledChain = chains.find(chain => 
        chain.parts.some(p => p.partId === 'ANGLED')
      );
      
      expect(angledChain).toBeDefined();
      expect(angledChain!.parts.every(p => p.partId === 'ANGLED')).toBe(true);
    });

    it('應該返回詳細的鏈構建報告', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 1000,
          quantity: 3,
          angles: {
            topLeft: 45,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const result = chainBuilder.buildChainsWithReport(parts);
      
      expect(result.chains).toBeDefined();
      expect(result.report).toBeDefined();
      
      // 驗證報告內容
      expect(result.report.totalParts).toBe(3);
      expect(result.report.totalChains).toBeGreaterThan(0);
      expect(result.report.totalSavings).toBeGreaterThan(0);
      expect(result.report.averageSavingsPerPart).toBeGreaterThan(0);
      expect(result.report.processingTime).toBeGreaterThan(0);
    });
  });
});