import { describe, it, expect, beforeEach } from '@jest/globals';
import { V6System } from '../../../core/v6/system/V6System';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material } from '../../../core/v6/models/Material';

describe('V6系統綜合測試', () => {
  let system: V6System;

  beforeEach(() => {
    system = new V6System({
      angleTolerance: 5,
      prioritizeMixedChains: true
    });
  });

  describe('缺陷修復驗證', () => {
    it('缺陷1修復：不同位置的相同角度可以共刀', () => {
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

      const materials: Material[] = [
        {
          id: 'MAT1',
          length: 4000,
          quantity: 1
        }
      ];

      const result = system.optimize(parts, materials);

      console.log('\n缺陷1修復測試:');
      console.log(`共刀鏈數: ${result.optimization.chainsBuilt}`);
      console.log(`混合鏈數: ${result.optimization.mixedChainsCreated}`);
      console.log(`總節省: ${result.optimization.totalChainSavings.toFixed(2)}mm`);

      // 驗證A和B可以共刀
      expect(result.optimization.chainsBuilt).toBeGreaterThan(0);
      expect(result.optimization.mixedChainsCreated).toBeGreaterThan(0);
      expect(result.optimization.totalChainSavings).toBeGreaterThan(0);
    });

    it('缺陷2修復：角度容差內的零件可以共刀', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 1500,
          quantity: 3,
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
          quantity: 3,
          angles: {
            topLeft: 35,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        {
          id: 'MAT1',
          length: 6000,
          quantity: 2
        }
      ];

      const result = system.optimize(parts, materials);

      console.log('\n缺陷2修復測試:');
      console.log(`共刀鏈數: ${result.optimization.chainsBuilt}`);
      console.log(`總節省: ${result.optimization.totalChainSavings.toFixed(2)}mm`);

      // 驗證32度和35度可以共刀
      expect(result.optimization.chainsBuilt).toBeGreaterThan(0);
      expect(result.optimization.totalChainSavings).toBeGreaterThan(0);
      
      // 驗證有共刀配對
      const sharedCuttingPairs = result.placedParts.filter(p => p.sharedCuttingInfo);
      console.log(`共刀配對數: ${sharedCuttingPairs.length}`);
      // 至少應該有一些零件參與共刀
      expect(result.optimization.totalChainSavings).toBeGreaterThan(0);
    });

    it('缺陷3修復：所有零件必須被排版', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'LARGE',
          length: 4000,
          quantity: 5,
          angles: {
            topLeft: 45,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 25
        },
        {
          id: 'MEDIUM',
          length: 2000,
          quantity: 10,
          angles: {
            topLeft: 30,
            topRight: 30,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'SMALL',
          length: 500,
          quantity: 20,
          angles: {
            topLeft: 45,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 15
        }
      ];

      const materials: Material[] = [
        {
          id: 'MAT1',
          length: 6000,
          quantity: 5  // 材料不足
        }
      ];

      const result = system.optimize(parts, materials);

      console.log('\n缺陷3修復測試:');
      console.log(`總零件數: ${parts.reduce((sum, p) => sum + p.quantity, 0)}`);
      console.log(`已排版零件: ${result.placedParts.length}`);
      console.log(`未排版零件: ${result.unplacedParts.length}`);
      console.log(`虛擬材料: ${result.virtualMaterialsCreated}`);

      // 驗證所有零件都被排版
      const totalParts = parts.reduce((sum, p) => sum + p.quantity, 0);
      expect(result.placedParts.length).toBe(totalParts);
      expect(result.unplacedParts.length).toBe(0);
      expect(result.success).toBe(true);
    });
  });

  describe('實際生產場景測試', () => {
    it('家具生產優化', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'CABINET_DOOR',
          length: 2000,
          quantity: 12,
          angles: {
            topLeft: 38,
            topRight: 38,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 18
        },
        {
          id: 'DRAWER_FRONT',
          length: 600,
          quantity: 24,
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 38,
            bottomRight: 38
          },
          thickness: 18
        },
        {
          id: 'SIDE_PANEL',
          length: 1800,
          quantity: 16,
          angles: {
            topLeft: 35, // 接近38度，可以共刀
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 35
          },
          thickness: 18
        }
      ];

      const materials: Material[] = [
        {
          id: 'BOARD_6M',
          length: 6000,
          quantity: 20
        },
        {
          id: 'BOARD_3M',
          length: 3000,
          quantity: 10
        }
      ];

      const result = system.optimize(parts, materials);

      console.log('\n家具生產場景:');
      console.log(system.generateOptimizationReport(result));

      // 驗證優化效果
      expect(result.placedParts.length).toBe(52); // 12+24+16
      expect(result.optimization.chainsBuilt).toBeGreaterThan(0);
      expect(result.optimization.mixedChainsCreated).toBeGreaterThan(0);
      expect(result.report.materialUtilization).toBeGreaterThan(0.7);
    });

    it('複雜角度組合優化', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'TYPE_A',
          length: 1200,
          quantity: 8,
          angles: {
            topLeft: 30,
            topRight: 45,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'TYPE_B',
          length: 1200,
          quantity: 8,
          angles: {
            topLeft: 45,
            topRight: 30,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'TYPE_C',
          length: 1200,
          quantity: 8,
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 30,
            bottomRight: 45
          },
          thickness: 20
        },
        {
          id: 'TYPE_D',
          length: 1200,
          quantity: 8,
          angles: {
            topLeft: 33, // 接近30度
            topRight: 42, // 接近45度
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        {
          id: 'MATERIAL',
          length: 6000,
          quantity: 10
        }
      ];

      const result = system.optimize(parts, materials);

      console.log('\n複雜角度組合:');
      console.log(`共刀鏈數: ${result.optimization.chainsBuilt}`);
      console.log(`混合鏈數: ${result.optimization.mixedChainsCreated}`);
      console.log(`總節省: ${result.optimization.totalChainSavings.toFixed(2)}mm`);

      // 驗證複雜組合的優化
      expect(result.optimization.chainsBuilt).toBeGreaterThan(0);
      expect(result.optimization.mixedChainsCreated).toBeGreaterThan(0);
      expect(result.optimization.totalChainSavings).toBeGreaterThan(500);
    });
  });

  describe('性能測試', () => {
    it('大規模零件處理', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'MASS_PRODUCTION',
          length: 800,
          quantity: 500,
          angles: {
            topLeft: 45,
            topRight: 45,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 15
        }
      ];

      const materials: Material[] = [
        {
          id: 'BULK_MATERIAL',
          length: 6000,
          quantity: 100
        }
      ];

      const startTime = performance.now();
      const result = system.optimize(parts, materials);
      const endTime = performance.now();

      console.log('\n大規模處理性能:');
      console.log(`總時間: ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`每個零件平均時間: ${((endTime - startTime) / 500).toFixed(2)}ms`);

      // 性能要求
      expect(endTime - startTime).toBeLessThan(10000); // 10秒內
      expect(result.placedParts.length).toBe(500);
    });
  });

  describe('配置測試', () => {
    it('動態更新配置', () => {
      // 初始配置
      let config = system.getConfig();
      expect(config.angleTolerance).toBe(5);

      // 更嚴格的角度容差
      system.updateConfig({ angleTolerance: 2 });

      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 1000,
          quantity: 2,
          angles: {
            topLeft: 30,
            topRight: 0,
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
            topLeft: 35, // 5度差異
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const materials: Material[] = [
        { id: 'MAT', length: 4000, quantity: 1 }
      ];

      const result = system.optimize(parts, materials);

      // 2度容差下，30和35度不應該共刀
      const mixedChains = result.optimization.mixedChainsCreated;
      expect(mixedChains).toBe(0);
    });
  });
});