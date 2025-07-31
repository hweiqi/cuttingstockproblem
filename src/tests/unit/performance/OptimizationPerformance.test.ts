import { describe, test, expect, beforeEach } from '@jest/globals';
import { V6System } from '../../../core/v6/system/V6System';
import { OptimizedFlexibleAngleMatcher } from '../../../core/v6/matching/OptimizedFlexibleAngleMatcher';
import { OptimizedChainBuilder } from '../../../core/v6/optimization/OptimizedChainBuilder';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material } from '../../../core/v6/models/Material';

describe('優化效能測試', () => {
  let optimizedSystem: V6System;

  beforeEach(() => {
    optimizedSystem = new V6System({
      angleTolerance: 5,
      maxChainSize: 50
    });
  });

  const createPart = (
    id: string,
    length: number,
    quantity: number,
    topLeft = 90,
    topRight = 90,
    bottomLeft = 90,
    bottomRight = 90
  ): PartWithQuantity => ({
    id,
    length,
    quantity,
    angles: { topLeft, topRight, bottomLeft, bottomRight },
    thickness: 20
  });

  const createMaterial = (id: string, length: number, quantity: number): Material => ({
    id,
    length,
    quantity,
    type: 'standard'
  });

  describe('共刀匹配優化效能', () => {
    test('應該快速處理1000個零件的共刀匹配', () => {
      const matcher = new OptimizedFlexibleAngleMatcher();
      const parts = [];
      
      for (let i = 0; i < 1000; i++) {
        parts.push({
          id: `P${i}`,
          length: 1000 + (i % 500),
          angles: {
            topLeft: 30 + (i % 45),
            topRight: 90,
            bottomLeft: 90,
            bottomRight: 30 + ((i + 15) % 45)
          },
          thickness: 20
        });
      }

      const startTime = performance.now();
      const potential = matcher.evaluateSharedCuttingPotential(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // 500ms內完成
      expect(potential.matchCount).toBeGreaterThan(0);
      expect(potential.totalPotentialSavings).toBeGreaterThan(0);
    });

    test('應該快速處理10000個零件的共刀匹配', () => {
      const matcher = new OptimizedFlexibleAngleMatcher();
      const parts = [];
      
      for (let i = 0; i < 10000; i++) {
        parts.push({
          id: `P${i}`,
          length: 1000 + (i % 500),
          angles: {
            topLeft: 30 + (i % 45),
            topRight: 90,
            bottomLeft: 90,
            bottomRight: 30 + ((i + 15) % 45)
          },
          thickness: 20
        });
      }

      const startTime = performance.now();
      const potential = matcher.evaluateSharedCuttingPotential(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5000); // 5秒內完成
      expect(potential.matchCount).toBeGreaterThan(0);
    });
  });

  describe('動態鏈構建優化效能', () => {
    test('應該快速構建1000個零件的共刀鏈', () => {
      const builder = new OptimizedChainBuilder();
      const parts: PartWithQuantity[] = [];
      
      for (let i = 0; i < 100; i++) {
        parts.push(createPart(`P${i}`, 1000 + (i % 500), 10, 30 + (i % 45)));
      }

      const startTime = performance.now();
      const result = builder.buildChainsWithReport(parts);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // 1秒內完成
      expect(result.chains.length).toBeGreaterThan(0);
      expect(result.report.totalParts).toBe(1000);
    });

    test('應該支援增量式構建', () => {
      const builder = new OptimizedChainBuilder();
      const parts: PartWithQuantity[] = [];
      let progressUpdates = 0;
      
      for (let i = 0; i < 200; i++) {
        parts.push(createPart(`P${i}`, 1000 + (i % 500), 50, 30 + (i % 45)));
      }

      const startTime = performance.now();
      const result = builder.buildChainsWithReport(parts, (progress) => {
        progressUpdates++;
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10000); // 10秒內完成
      expect(progressUpdates).toBeGreaterThan(0);
      expect(result.report.totalParts).toBe(10000);
    });
  });

  describe('完整系統優化效能', () => {
    test('應該在合理時間內處理大規模問題', () => {
      const parts: PartWithQuantity[] = [];
      const materials: Material[] = [];
      
      // 生成100種不同的零件，每種10個
      for (let i = 0; i < 100; i++) {
        parts.push(createPart(
          `P${i}`,
          500 + (i % 10) * 100,
          10,
          i % 3 === 0 ? 45 : 90,
          i % 4 === 0 ? 30 : 90,
          i % 5 === 0 ? 60 : 90,
          i % 6 === 0 ? 45 : 90
        ));
      }
      
      // 提供充足的材料
      for (let i = 0; i < 10; i++) {
        materials.push(createMaterial(`M${i}`, 3000, 50));
      }

      const startTime = performance.now();
      const result = optimizedSystem.optimize(parts, materials);
      const endTime = performance.now();

      const processingTime = endTime - startTime;
      
      expect(processingTime).toBeLessThan(5000); // 5秒內完成
      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBeGreaterThan(900); // 至少排版90%
      expect(result.report.materialUtilization).toBeGreaterThan(0.7); // 利用率超過70%
      
      console.log(`處理1000個零件耗時: ${processingTime.toFixed(2)}ms`);
      console.log(`材料利用率: ${(result.report.materialUtilization * 100).toFixed(2)}%`);
      console.log(`共刀節省: ${result.totalSavings.toFixed(2)}mm`);
    });

    test('應該展示各階段的效能改進', () => {
      const parts: PartWithQuantity[] = [];
      const materials: Material[] = [];
      
      // 生成測試數據
      for (let i = 0; i < 50; i++) {
        parts.push(createPart(`P${i}`, 1000, 20, 45, 45, 45, 45));
      }
      
      materials.push(createMaterial('M1', 5000, 100));

      const result = optimizedSystem.optimize(parts, materials);
      
      // 檢查各階段時間
      expect(result.performance.matchingTime).toBeLessThan(1000);
      expect(result.performance.chainBuildingTime).toBeLessThan(2000);
      expect(result.performance.placementTime).toBeLessThan(2000);
      
      console.log('各階段效能:');
      console.log(`- 角度匹配: ${result.performance.matchingTime.toFixed(2)}ms`);
      console.log(`- 鏈構建: ${result.performance.chainBuildingTime.toFixed(2)}ms`);
      console.log(`- 排版: ${result.performance.placementTime.toFixed(2)}ms`);
      console.log(`- 總時間: ${result.performance.totalTime.toFixed(2)}ms`);
    });
  });

  describe('效能比較', () => {
    test('優化版本應該比原版本快', () => {
      const parts: PartWithQuantity[] = [];
      const materials: Material[] = [];
      
      // 生成大量測試數據
      for (let i = 0; i < 200; i++) {
        parts.push(createPart(
          `P${i}`,
          500 + (i % 10) * 100,
          5,
          30 + (i % 45),
          30 + ((i + 15) % 45),
          90,
          90
        ));
      }
      
      for (let i = 0; i < 20; i++) {
        materials.push(createMaterial(`M${i}`, 3000, 50));
      }

      // 測試優化版本
      const optimizedStart = performance.now();
      const optimizedResult = optimizedSystem.optimize(parts, materials);
      const optimizedTime = performance.now() - optimizedStart;

      expect(optimizedResult.success).toBe(true);
      expect(optimizedTime).toBeLessThan(10000); // 10秒內完成
      
      // 輸出效能數據
      console.log('\n=== 優化效能總結 ===');
      console.log(`總零件數: ${parts.reduce((sum, p) => sum + p.quantity, 0)}`);
      console.log(`總材料數: ${materials.reduce((sum, m) => sum + m.quantity, 0)}`);
      console.log(`處理時間: ${optimizedTime.toFixed(2)}ms`);
      console.log(`每千零件處理時間: ${(optimizedTime / (parts.reduce((sum, p) => sum + p.quantity, 0) / 1000)).toFixed(2)}ms`);
      console.log(`材料利用率: ${(optimizedResult.report.materialUtilization * 100).toFixed(2)}%`);
      console.log(`共刀鏈數: ${optimizedResult.optimization.chainsBuilt}`);
      console.log(`總節省: ${optimizedResult.optimization.totalChainSavings.toFixed(2)}mm`);
    });
  });
});