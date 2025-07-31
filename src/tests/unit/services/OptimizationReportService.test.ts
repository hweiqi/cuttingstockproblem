import { describe, test, expect, beforeEach } from '@jest/globals';
import { OptimizationReportService } from '../../../services/OptimizationReportService';
import { V6SystemResult } from '../../../core/v6/system/V6System';

describe('OptimizationReportService', () => {
  let service: OptimizationReportService;

  beforeEach(() => {
    service = new OptimizationReportService();
  });

  describe('generateReport', () => {
    test('應該生成包含所有必要資訊的統一報告', () => {
      const mockResult: V6SystemResult = {
        placedParts: [
          { partId: 'P1', position: 10, length: 2000, materialId: 'M1', materialInstanceId: 0 },
          { partId: 'P2', position: 2015, length: 1500, materialId: 'M1', materialInstanceId: 0 }
        ],
        unplacedParts: [],
        usedMaterials: [
          { material: { id: 'M1', length: 6000 }, instanceId: 0, utilization: 0.6 }
        ],
        warnings: [],
        totalSavings: 24.84,
        report: {
          totalParts: 2,
          totalMaterials: 1,
          materialUtilization: 0.6,
          processingTime: 100
        },
        optimization: {
          chainsBuilt: 1,
          totalChainSavings: 24.84,
          anglesToleranceUsed: 5,
          mixedChainsCreated: 1
        },
        performance: {
          matchingTime: 10,
          chainBuildingTime: 20,
          placementTime: 30,
          totalTime: 60
        }
      };

      const report = service.generateReport(mockResult);

      // 驗證報告包含所有必要部分
      expect(report).toContain('=== V6 切割優化系統報告 ===');
      expect(report).toContain('輸入摘要:');
      expect(report).toContain('總零件數: 2');
      
      // 優化摘要現在包含效能指標
      expect(report).toContain('優化摘要:');
      expect(report).toContain('共刀鏈數: 1');
      expect(report).toContain('混合鏈數: 1');
      expect(report).toContain('總節省: 24.84mm');
      expect(report).toContain('匹配時間: 10.00ms');
      expect(report).toContain('鏈構建時間: 20.00ms');
      expect(report).toContain('排版時間: 30.00ms');
      expect(report).toContain('總處理時間: 60.00ms');
      
      expect(report).toContain('排版結果:');
      expect(report).toContain('已排版零件: 2');
      expect(report).toContain('未排版零件: 0');
      expect(report).toContain('材料利用率: 60.00%');
      
      // 不再有獨立的性能指標部分
      expect(report).not.toContain('性能指標:');
    });

    test('應該處理有未排版零件的情況', () => {
      const mockResult: V6SystemResult = {
        placedParts: [],
        unplacedParts: [
          { partId: 'P1', instanceId: 0, reason: '零件長度超出最大材料長度' },
          { partId: 'P2', instanceId: 0, reason: '零件長度超出最大材料長度' },
          { partId: 'P3', instanceId: 0, reason: '材料數量不足' }
        ],
        usedMaterials: [],
        warnings: [],
        totalSavings: 0,
        report: {
          totalParts: 3,
          totalMaterials: 1,
          materialUtilization: 0,
          processingTime: 50
        },
        optimization: {
          chainsBuilt: 0,
          totalChainSavings: 0,
          anglesToleranceUsed: 5,
          mixedChainsCreated: 0
        },
        performance: {
          matchingTime: 5,
          chainBuildingTime: 10,
          placementTime: 15,
          totalTime: 30
        }
      };

      const report = service.generateReport(mockResult);

      expect(report).toContain('未排版零件分析:');
      expect(report).toContain('零件長度超出最大材料長度');
      expect(report).toContain('數量: 2 個零件');
      expect(report).toContain('材料數量不足');
      expect(report).toContain('數量: 1 個零件');
      expect(report).toContain('建議解決方案:');
    });

    test('應該處理有警告的情況', () => {
      const mockResult: V6SystemResult = {
        placedParts: [],
        unplacedParts: [],
        usedMaterials: [],
        warnings: ['材料利用率偏低', '建議使用更長的材料'],
        totalSavings: 0,
        report: {
          totalParts: 0,
          totalMaterials: 0,
          materialUtilization: 0,
          processingTime: 0
        },
        optimization: {
          chainsBuilt: 0,
          totalChainSavings: 0,
          anglesToleranceUsed: 5,
          mixedChainsCreated: 0
        },
        performance: {
          matchingTime: 0,
          chainBuildingTime: 0,
          placementTime: 0,
          totalTime: 0
        }
      };

      const report = service.generateReport(mockResult);

      expect(report).toContain('警告:');
      expect(report).toContain('材料利用率偏低');
      expect(report).toContain('建議使用更長的材料');
    });
  });

  describe('formatForWorker', () => {
    test('應該正確格式化 Worker 結果', () => {
      const workerResult = {
        report: {
          totalParts: 100,
          totalMaterials: 10,
          materialUtilization: 0.85,
          processingTime: 1500
        },
        optimization: {
          chainsBuilt: 20,
          mixedChainsCreated: 5,
          totalChainSavings: 150.5,
          angleTolerance: 5
        },
        placedParts: new Array(95),
        unplacedParts: new Array(5),
        usedMaterials: new Array(8),
        performance: {
          matchingTime: 100,
          chainBuildingTime: 200,
          placementTime: 300,
          totalTime: 600
        },
        warnings: []
      };

      const report = service.formatForWorker(workerResult);

      expect(report).toContain('總零件數: 100');
      expect(report).toContain('總材料數: 10');
      expect(report).toContain('共刀鏈數: 20');
      expect(report).toContain('混合鏈數: 5');
      expect(report).toContain('已排版零件: 95');
      expect(report).toContain('未排版零件: 5');
      expect(report).toContain('材料利用率: 85.00%');
      expect(report).toContain('使用材料數: 8');
    });
  });
});