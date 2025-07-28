/**
 * 排版優化演算法測試
 */

import { CuttingOptimizer } from '../../../services/CuttingOptimizer';
import { Material, Part, PartAngles, CuttingResult } from '../../../types/core';

describe('CuttingOptimizer', () => {
  let optimizer: CuttingOptimizer;

  beforeEach(() => {
    optimizer = new CuttingOptimizer();
  });

  // 建立測試用材料的輔助函數
  const createMaterial = (id: string, length: number): Material => ({
    id,
    length
  });

  // 建立測試用零件的輔助函數
  const createPart = (id: string, length: number, quantity: number, angles?: PartAngles, thickness: number = 10): Part => ({
    id,
    length,
    quantity,
    angles: angles || { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
    thickness
  });

  describe('optimize', () => {
    test('應該能處理簡單的排版問題', () => {
      const materials = [createMaterial('m1', 6000)];
      const parts = [
        createPart('p1', 2000, 2), // 2支2000mm
        createPart('p2', 1500, 1)  // 1支1500mm
      ];

      const result = optimizer.optimize(materials, parts);
      
      expect(result.allPartsPlaced).toBe(true);
      expect(result.unplacedParts).toHaveLength(0);
      expect(result.materialUsagePlans.length).toBeGreaterThan(0);
      expect(result.totalMaterialsUsed).toBeGreaterThan(0);
    });

    test('應該確保所有零件都被排入', () => {
      const materials = [createMaterial('m1', 3000)];
      const parts = [
        createPart('p1', 1000, 3), // 3支1000mm
        createPart('p2', 800, 2)   // 2支800mm
      ];

      const result = optimizer.optimize(materials, parts);
      
      expect(result.allPartsPlaced).toBe(true);
      expect(result.unplacedParts).toHaveLength(0);
      
      // 計算放置的零件總數
      let totalPlacedParts = 0;
      result.materialUsagePlans.forEach(plan => {
        totalPlacedParts += plan.placedParts.length;
      });
      expect(totalPlacedParts).toBe(5); // 3+2=5支零件
    });

    test('應該最小化母材使用量', () => {
      const materials = [
        createMaterial('m1', 6000),
        createMaterial('m2', 4000)
      ];
      const parts = [
        createPart('p1', 3500, 1),
        createPart('p2', 2000, 1)
      ];

      const result = optimizer.optimize(materials, parts);
      
      expect(result.allPartsPlaced).toBe(true);
      // 應該使用盡可能少的母材
      expect(result.totalMaterialsUsed).toBeLessThanOrEqual(2);
    });

    test('應該處理共刀零件', () => {
      const materials = [createMaterial('m1', 4000)];
      const parts = [
        createPart('p1', 1500, 1, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1500, 1, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 })
      ];

      const result = optimizer.optimize(materials, parts);
      
      expect(result.allPartsPlaced).toBe(true);
      expect(result.sharedCutChains.length).toBeGreaterThan(0);
      expect(result.totalSavingsFromSharedCuts).toBeGreaterThan(0);
    });

    test('應該正確計算利用率', () => {
      const materials = [createMaterial('m1', 6000)];
      const parts = [
        createPart('p1', 2000, 2), // 使用4000mm
        createPart('p2', 1500, 1)  // 使用1500mm，總共5500mm
      ];

      const result = optimizer.optimize(materials, parts);
      
      expect(result.allPartsPlaced).toBe(true);
      expect(result.overallUtilization).toBeGreaterThan(0.8); // 至少80%利用率
    });

    test('應該處理無法放入的情況', () => {
      const materials = [createMaterial('m1', 1000)]; // 短母材
      const parts = [createPart('p1', 2000, 1)]; // 長零件

      const result = optimizer.optimize(materials, parts);
      
      // 當沒有合適的母材時，系統應該自動創建適合的母材實例
      // 根據需求，母材沒有數量限制
      expect(result.allPartsPlaced).toBe(true);
    });

    test('應該考慮前端切割損耗', () => {
      const materials = [createMaterial('m1', 1020)]; // 1020mm母材
      const parts = [createPart('p1', 1000, 1)]; // 1000mm零件

      const result = optimizer.optimize(materials, parts);
      
      expect(result.allPartsPlaced).toBe(true);
      
      // 檢查是否考慮了前端切割損耗(10mm)
      const plan = result.materialUsagePlans[0];
      expect(plan.placedParts[0].position).toBeGreaterThanOrEqual(10);
    });

    test('應該考慮零件間切割損耗', () => {
      const materials = [createMaterial('m1', 2026)]; // 足夠的空間：1000+3+1000+10+3=2016
      const parts = [createPart('p1', 1000, 2)]; // 2支1000mm零件

      const result = optimizer.optimize(materials, parts);
      
      expect(result.allPartsPlaced).toBe(true);
      
      const plan = result.materialUsagePlans[0];
      if (plan.placedParts.length >= 2) {
        const firstPart = plan.placedParts[0];
        const secondPart = plan.placedParts[1];
        
        // 第二個零件應該在第一個零件結束位置+切割損耗之後
        const expectedSecondPosition = firstPart.position + firstPart.length + 3;
        expect(secondPart.position).toBeGreaterThanOrEqual(expectedSecondPosition);
      }
    });

    test('應該優先使用短母材', () => {
      const materials = [
        createMaterial('m1', 6000),
        createMaterial('m2', 2000)
      ];
      const parts = [createPart('p1', 1500, 1)]; // 可以放在2000mm母材中

      const result = optimizer.optimize(materials, parts);
      
      expect(result.allPartsPlaced).toBe(true);
      
      // 應該使用較短的母材（2000mm而不是6000mm）
      const usedMaterial = result.materialUsagePlans[0];
      expect(usedMaterial.materialLength).toBe(2000);
    });

    test('應該處理大量零件', () => {
      const materials = [
        createMaterial('m1', 6000),
        createMaterial('m2', 4000),
        createMaterial('m3', 3000)
      ];
      
      const parts = [];
      for (let i = 1; i <= 20; i++) {
        parts.push(createPart(`p${i}`, 500 + i * 50, 2)); // 不同長度的零件，每種2支
      }

      const result = optimizer.optimize(materials, parts);
      
      expect(result.allPartsPlaced).toBe(true);
      expect(result.unplacedParts).toHaveLength(0);
      
      // 驗證總零件數量
      let totalPlaced = 0;
      result.materialUsagePlans.forEach(plan => {
        totalPlaced += plan.placedParts.length;
      });
      expect(totalPlaced).toBe(40); // 20種零件 × 2支 = 40支
    });
  });

  describe('處理設定', () => {
    test('應該能更新切割損耗設定', () => {
      optimizer.updateSettings({
        frontCuttingLoss: 15,
        cuttingLoss: 5,
        angleTolerance: 15,
        maxChainLength: 30
      });
      
      const settings = optimizer.getSettings();
      expect(settings.frontCuttingLoss).toBe(15);
      expect(settings.cuttingLoss).toBe(5);
      expect(settings.angleTolerance).toBe(15);
      expect(settings.maxChainLength).toBe(30);
    });

    test('更新設定後應該影響排版結果', () => {
      const materials = [createMaterial('m1', 1030)];
      const parts = [createPart('p1', 1000, 1)];

      // 使用預設設定(前端損耗10mm)
      let result = optimizer.optimize(materials, parts);
      expect(result.allPartsPlaced).toBe(true);

      // 更新前端損耗到25mm
      optimizer.updateSettings({ frontCuttingLoss: 25 });
      result = optimizer.optimize(materials, parts);
      
      // 1030mm母材放不下 1000mm零件+25mm前端損耗
      // 但系統應該自動創建適合的母材
      expect(result.allPartsPlaced).toBe(true);
    });
  });

  describe('統計資訊', () => {
    test('應該提供正確的統計資訊', () => {
      const materials = [createMaterial('m1', 6000)];
      const parts = [
        createPart('p1', 2000, 2),
        createPart('p2', 1500, 1)
      ];

      const result = optimizer.optimize(materials, parts);
      
      expect(result.summary.totalParts).toBe(3); // 2+1=3支零件
      expect(result.summary.totalMaterials).toBe(result.totalMaterialsUsed);
      expect(result.summary.materialUtilization).toMatch(/^\d+\.\d+%$/); // 百分比格式
    });

    test('應該正確計算浪費長度', () => {
      const materials = [createMaterial('m1', 6000)];
      const parts = [createPart('p1', 2000, 2)]; // 使用4000mm + 損耗

      const result = optimizer.optimize(materials, parts);
      
      expect(result.totalWasteLength).toBeGreaterThan(0);
      
      // 驗證浪費計算
      const plan = result.materialUsagePlans[0];
      expect(plan.wasteLength).toBe(result.totalWasteLength);
      expect(plan.usedLength + plan.wasteLength).toBe(plan.materialLength);
    });
  });

  describe('共刀鏈整合', () => {
    test('應該整合共刀鏈到排版中', () => {
      const materials = [createMaterial('m1', 4000)];
      const parts = [
        createPart('p1', 1500, 1, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1500, 1, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p3', 1500, 1, { topLeft: 30, topRight: 0, bottomLeft: 0, bottomRight: 0 })
      ];

      const result = optimizer.optimize(materials, parts);
      
      expect(result.allPartsPlaced).toBe(true);
      expect(result.sharedCutChains.length).toBeGreaterThan(0);
      
      // 檢查共刀鏈中的零件是否在同一母材中
      for (const chain of result.sharedCutChains) {
        const chainPartIds = new Set(chain.partIds);
        
        // 找到包含鏈中零件的母材
        const relevantPlans = result.materialUsagePlans.filter(plan => 
          plan.placedParts.some(part => chainPartIds.has(part.partId))
        );
        
        // 共刀鏈中的零件應該在同一母材中
        expect(relevantPlans.length).toBe(1);
      }
    });

    test('應該正確顯示共刀資訊', () => {
      const materials = [createMaterial('m1', 4000)];
      const parts = [
        createPart('p1', 1500, 1, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }),
        createPart('p2', 1500, 1, { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 })
      ];

      const result = optimizer.optimize(materials, parts);
      
      expect(result.sharedCutChains.length).toBe(1);
      
      const sharedCutParts = result.materialUsagePlans[0].placedParts.filter(part => part.isInSharedCutChain);
      expect(sharedCutParts.length).toBe(2);
      
      // 檢查共刀資訊
      for (const part of sharedCutParts) {
        expect(part.sharedCutInfo).toBeDefined();
        expect(part.sharedCutInfo!.chainId).toBeDefined();
      }
    });
  });

  describe('邊界情況', () => {
    test('應該處理空零件列表', () => {
      const materials = [createMaterial('m1', 6000)];
      const parts: Part[] = [];

      const result = optimizer.optimize(materials, parts);
      
      expect(result.allPartsPlaced).toBe(true);
      expect(result.materialUsagePlans).toHaveLength(0);
      expect(result.totalMaterialsUsed).toBe(0);
    });

    test('應該處理空母材列表', () => {
      const materials: Material[] = [];
      const parts = [createPart('p1', 1000, 1)];

      const result = optimizer.optimize(materials, parts);
      
      // 沒有母材但系統應該自動創建適合的母材
      expect(result.allPartsPlaced).toBe(true);
    });

    test('應該處理極大零件', () => {
      const materials = [createMaterial('m1', 6000)];
      const parts = [createPart('p1', 10000, 1)]; // 超大零件

      const result = optimizer.optimize(materials, parts);
      
      // 系統應該自動創建適合的母材
      expect(result.allPartsPlaced).toBe(true);
    });
  });
});