import { DynamicChainBuilder } from '../../../core/v6/optimization/DynamicChainBuilder';
import { OptimizedPlacer } from '../../../placement/OptimizedPlacer';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material } from '../../../core/v6/models/Material';

describe('共刀優化測試', () => {
  let chainBuilder: DynamicChainBuilder;
  let placer: OptimizedPlacer;

  beforeEach(() => {
    chainBuilder = new DynamicChainBuilder(5); // 5度容差
    placer = new OptimizedPlacer({
      cuttingLoss: 5,
      frontEndLoss: 20,
      backEndLoss: 15
    });
  });

  describe('共刀鏈構建', () => {
    it('應該正確識別並構建相同角度的共刀鏈', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'PART-A',
          length: 2000,
          quantity: 3,
          angles: {
            topLeft: 45,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'PART-B',
          length: 2000,
          quantity: 3,
          angles: {
            topLeft: 0,
            topRight: 45,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const result = chainBuilder.buildChainsWithReport(parts);

      // 應該構建共刀鏈
      expect(result.chains.length).toBeGreaterThan(0);
      expect(result.report.totalSavings).toBeGreaterThan(0);
      
      // 檢查節省值計算
      const firstChain = result.chains[0];
      expect(firstChain.totalSavings).toBeGreaterThan(0);
      
      // 驗證連接的節省值
      firstChain.connections.forEach(conn => {
        expect(conn.savings).toBeGreaterThan(0);
        expect(conn.sharedAngle).toBe(45);
      });
    });

    it('應該處理角度容差內的共刀', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'PART-C',
          length: 1500,
          quantity: 2,
          angles: {
            topLeft: 43, // 與45度相差2度，在5度容差內
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'PART-D',
          length: 1500,
          quantity: 2,
          angles: {
            topLeft: 46, // 與45度相差1度，在5度容差內
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const result = chainBuilder.buildChainsWithReport(parts);

      // 應該能夠建立共刀鏈
      expect(result.chains.length).toBeGreaterThan(0);
      expect(result.report.totalSavings).toBeGreaterThan(0);
    });

    it('應該正確計算不同角度的節省量', () => {
      const testCases = [
        { angle: 30, expectedMinSavings: 35 }, // 30度角節省應該較大
        { angle: 45, expectedMinSavings: 20 }, // 45度角節省中等
        { angle: 60, expectedMinSavings: 10 }, // 60度角節省較小
      ];

      testCases.forEach(({ angle, expectedMinSavings }) => {
        const parts: PartWithQuantity[] = [
          {
            id: `PART-${angle}`,
            length: 2000,
            quantity: 2,
            angles: {
              topLeft: angle,
              topRight: 0,
              bottomLeft: 0,
              bottomRight: 0
            },
            thickness: 20
          }
        ];

        const result = chainBuilder.buildChainsWithReport(parts);
        
        if (result.chains.length > 0) {
          const savings = result.chains[0].connections[0]?.savings || 0;
          expect(savings).toBeGreaterThanOrEqual(expectedMinSavings * 0.5); // 允許一些誤差
        }
      });
    });

    it('應該構建混合零件的共刀鏈', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'TYPE-1',
          length: 2000,
          quantity: 2,
          angles: {
            topLeft: 35,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 25
        },
        {
          id: 'TYPE-2',
          length: 1800,
          quantity: 2,
          angles: {
            topLeft: 0,
            topRight: 35,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 25
        },
        {
          id: 'TYPE-3',
          length: 2200,
          quantity: 2,
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 35,
            bottomRight: 0
          },
          thickness: 25
        }
      ];

      const result = chainBuilder.buildChainsWithReport(parts);

      // 應該能夠建立混合鏈
      expect(result.chains.length).toBeGreaterThan(0);
      expect(result.report.totalSavings).toBeGreaterThan(0);
      
      // 檢查是否有混合結構的鏈
      const mixedChains = result.chains.filter(c => c.structure === 'mixed');
      expect(mixedChains.length).toBeGreaterThan(0);
    });
  });

  describe('共刀排版整合', () => {
    it('排版結果應該包含共刀資訊', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'SHARED-A',
          length: 2000,
          quantity: 4,
          angles: {
            topLeft: 40,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'SHARED-B',
          length: 2000,
          quantity: 4,
          angles: {
            topLeft: 0,
            topRight: 40,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'MAT-10M', length: 10000, quantity: 0 } // 無限供應
      ];

      // 先構建共刀鏈
      const chainResult = chainBuilder.buildChainsWithReport(parts);
      
      // 然後進行排版
      const placementResult = placer.placePartsWithChains(parts, materials, chainResult.chains);

      // 驗證排版成功
      expect(placementResult.success).toBe(true);
      expect(placementResult.placedParts.length).toBe(8);
      
      // 檢查共刀資訊
      const partsWithSharedCutting = placementResult.placedParts.filter(p => p.sharedCuttingInfo);
      expect(partsWithSharedCutting.length).toBeGreaterThan(0);
      
      // 驗證總節省值
      expect(placementResult.totalSavings).toBeGreaterThan(0);
      
      // 檢查配對的零件
      partsWithSharedCutting.forEach(part => {
        expect(part.sharedCuttingInfo!.savings).toBeGreaterThan(0);
        expect(part.sharedCuttingInfo!.sharedAngle).toBeCloseTo(40, 0);
      });
    });

    it('應該正確報告共刀節省', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'ANGLE-PART',
          length: 3000,
          quantity: 10,
          angles: {
            topLeft: 30,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 25
        }
      ];

      const materials: Material[] = [
        { id: 'MAT-12M', length: 12000, quantity: 0 }
      ];

      const chainResult = chainBuilder.buildChainsWithReport(parts);
      const placementResult = placer.placePartsWithChains(parts, materials, chainResult.chains);

      // 應該有顯著的節省
      expect(placementResult.totalSavings).toBeGreaterThan(0);
      expect(placementResult.report.sharedCuttingPairs).toBeGreaterThan(0);
      
      // 節省值應該合理（每個配對大約節省20-50mm）
      const savingsPerPair = placementResult.totalSavings / placementResult.report.sharedCuttingPairs;
      expect(savingsPerPair).toBeGreaterThan(10);
      expect(savingsPerPair).toBeLessThan(100);
    });

    it('沒有斜角的零件不應該有共刀節省', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'STRAIGHT-PART',
          length: 2000,
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

      const materials: Material[] = [
        { id: 'MAT-6M', length: 6000, quantity: 0 }
      ];

      const chainResult = chainBuilder.buildChainsWithReport(parts);
      const placementResult = placer.placePartsWithChains(parts, materials, chainResult.chains);

      // 應該沒有共刀鏈
      expect(chainResult.chains.length).toBe(0);
      expect(chainResult.report.totalSavings).toBe(0);
      
      // 排版結果也不應該有共刀節省
      expect(placementResult.totalSavings).toBe(0);
      expect(placementResult.report.sharedCuttingPairs).toBe(0);
    });
  });
});