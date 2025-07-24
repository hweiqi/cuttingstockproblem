import { describe, it, expect, beforeEach } from '@jest/globals';
import { GuaranteedPlacer } from '../../../../core/v6/placement/GuaranteedPlacer';
import { PartWithQuantity } from '../../../../core/v6/models/Part';
import { Material } from '../../../../core/v6/models/Material';
import { SharedCutChain } from '../../../../core/v6/models/Chain';

describe('GuaranteedPlacer - 完整排版保證測試', () => {
  let placer: GuaranteedPlacer;

  beforeEach(() => {
    placer = new GuaranteedPlacer();
  });

  describe('基本排版功能', () => {
    it('應該將所有零件排版（充足材料）', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 1000,
          quantity: 5,
          angles: {
            topLeft: 45,
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

      const result = placer.placeParts(parts, materials);

      expect(result.placedParts.length).toBe(5);
      expect(result.unplacedParts.length).toBe(0);
      expect(result.success).toBe(true);
      expect(result.virtualMaterialsCreated).toBe(0);
    });

    it('應該使用虛擬材料確保所有零件排版（材料不足）', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 2000,
          quantity: 10,
          angles: {
            topLeft: 45,
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
          length: 3000,
          quantity: 2  // 只能放3個零件
        }
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.placedParts.length).toBe(10);
      expect(result.unplacedParts.length).toBe(0);
      expect(result.success).toBe(true);
      expect(result.virtualMaterialsCreated).toBeGreaterThan(0);
      
      // 驗證虛擬材料被使用
      const virtualParts = result.placedParts.filter(p => 
        p.materialId.startsWith('VIRTUAL_')
      );
      expect(virtualParts.length).toBeGreaterThan(0);
    });
  });

  describe('共刀鏈排版', () => {
    it('應該優先按照共刀鏈排版', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 1000,
          quantity: 2,
          angles: {
            topLeft: 45,
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
            topLeft: 45,
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
          length: 4000,
          quantity: 1
        }
      ];

      const chains: SharedCutChain[] = [
        {
          id: 'chain1',
          parts: [
            { partId: 'A', instanceId: 0, position: 0 },
            { partId: 'B', instanceId: 0, position: 1 }
          ],
          connections: [{
            fromPart: {
              partId: 'A',
              instanceId: 0,
              anglePosition: 'topLeft'
            },
            toPart: {
              partId: 'B',
              instanceId: 0,
              anglePosition: 'topLeft'
            },
            sharedAngle: 45,
            savings: 30
          }],
          totalLength: 1970,
          totalSavings: 30,
          structure: 'mixed',
          isOptimized: true
        }
      ];

      const result = placer.placePartsWithChains(parts, materials, chains);

      expect(result.placedParts.length).toBe(4);
      
      // 驗證共刀對
      const sharedPairs = result.placedParts.filter(p => p.sharedCuttingInfo);
      expect(sharedPairs.length).toBeGreaterThan(0);
      
      // 驗證共刀節省
      expect(result.totalSavings).toBeGreaterThan(0);
    });

    it('應該處理複雜的共刀鏈排版', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 1000,
          quantity: 3,
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
          length: 800,
          quantity: 3,
          angles: {
            topLeft: 45,
            topRight: 30,
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

      const chains: SharedCutChain[] = [
        {
          id: 'chain1',
          parts: [
            { partId: 'A', instanceId: 0, position: 0 },
            { partId: 'B', instanceId: 0, position: 1 },
            { partId: 'A', instanceId: 1, position: 2 }
          ],
          connections: [
            {
              fromPart: { partId: 'A', instanceId: 0, anglePosition: 'topRight' },
              toPart: { partId: 'B', instanceId: 0, anglePosition: 'topLeft' },
              sharedAngle: 45,
              savings: 30
            },
            {
              fromPart: { partId: 'B', instanceId: 0, anglePosition: 'topRight' },
              toPart: { partId: 'A', instanceId: 1, anglePosition: 'topLeft' },
              sharedAngle: 30,
              savings: 25
            }
          ],
          totalLength: 2745,
          totalSavings: 55,
          structure: 'complex',
          isOptimized: true
        }
      ];

      const result = placer.placePartsWithChains(parts, materials, chains);

      expect(result.placedParts.length).toBe(6);
      expect(result.unplacedParts.length).toBe(0);
    });
  });

  describe('極端情況處理', () => {
    it('應該處理超長零件（需要特殊材料）', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'LONG',
          length: 10000,
          quantity: 1,
          angles: {
            topLeft: 45,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 30
        }
      ];

      const materials: Material[] = [
        {
          id: 'MAT1',
          length: 6000,
          quantity: 10
        }
      ];

      const result = placer.placeParts(parts, materials);

      // 必須排版
      expect(result.placedParts.length).toBe(1);
      expect(result.unplacedParts.length).toBe(0);
      
      // 應該創建合適的虛擬材料
      const placedPart = result.placedParts[0];
      expect(placedPart.materialId).toContain('VIRTUAL');
    });

    it('應該處理大量小零件', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'TINY',
          length: 100,
          quantity: 1000,
          angles: {
            topLeft: 45,
            topRight: 45,
            bottomLeft: 45,
            bottomRight: 45
          },
          thickness: 10
        }
      ];

      const materials: Material[] = [
        {
          id: 'MAT1',
          length: 6000,
          quantity: 20
        }
      ];

      const startTime = performance.now();
      const result = placer.placeParts(parts, materials);
      const endTime = performance.now();

      // 必須排版所有零件
      expect(result.placedParts.length).toBe(1000);
      expect(result.unplacedParts.length).toBe(0);
      
      // 性能要求
      expect(endTime - startTime).toBeLessThan(5000); // 5秒內完成
    });

    it('應該處理無材料的情況', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 1000,
          quantity: 5,
          angles: {
            topLeft: 45,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const materials: Material[] = []; // 無材料

      const result = placer.placeParts(parts, materials);

      // 仍然必須排版所有零件
      expect(result.placedParts.length).toBe(5);
      expect(result.unplacedParts.length).toBe(0);
      expect(result.virtualMaterialsCreated).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('優化和報告', () => {
    it('應該提供詳細的排版報告', () => {
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

      const materials: Material[] = [
        {
          id: 'MAT1',
          length: 3500,
          quantity: 1
        }
      ];

      const result = placer.placeParts(parts, materials);

      expect(result.report).toBeDefined();
      expect(result.report.totalParts).toBe(3);
      expect(result.report.totalMaterials).toBe(1);
      expect(result.report.materialUtilization).toBeGreaterThan(0);
      expect(result.report.materialUtilization).toBeLessThanOrEqual(1);
      expect(result.report.processingTime).toBeGreaterThan(0);
    });

    it('應該計算正確的材料利用率', () => {
      const parts: PartWithQuantity[] = [
        {
          id: 'A',
          length: 1000,
          quantity: 2,
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
        {
          id: 'MAT1',
          length: 3000,
          quantity: 1
        }
      ];

      const result = placer.placeParts(parts, materials);

      // 計算實際使用長度：前端損耗 + 零件1 + 後端損耗 + 前端損耗 + 零件2 + 後端損耗
      // = 20 + 1000 + 15 + 20 + 1000 + 15 = 2070
      const actualUsedLength = 2070;
      const expectedUtilization = actualUsedLength / 3000;
      expect(result.report.materialUtilization).toBeCloseTo(expectedUtilization, 2);
    });
  });
});