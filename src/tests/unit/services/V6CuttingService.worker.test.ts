import { V6CuttingService } from '../../../services/V6CuttingService';
import { Material, Part } from '../../../types';

describe('V6CuttingService Web Worker 結果轉換測試', () => {
  let service: V6CuttingService;

  beforeEach(() => {
    service = new V6CuttingService();
  });

  describe('convertWorkerResult', () => {
    it('應該正確轉換 Worker 結果為應用格式', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 0 }
      ];

      const parts: Part[] = [
        {
          id: 'P1',
          length: 2000,
          quantity: 2,
          thickness: 20
        }
      ];

      // 模擬 Worker 返回的結果
      const workerResult = {
        placedParts: [
          {
            partId: 'P1',
            partInstanceId: 0,
            materialId: 'M1',
            materialInstanceId: 0,
            position: 10,
            length: 2000
          },
          {
            partId: 'P1',
            partInstanceId: 1,
            materialId: 'M1',
            materialInstanceId: 0,
            position: 2013,
            length: 2000
          }
        ],
        unplacedParts: [],
        usedMaterials: [
          {
            material: { id: 'M1', length: 6000 },
            instanceId: 0,
            utilization: 0.67
          }
        ],
        totalSavings: 0,
        success: true,
        warnings: [],
        report: {
          totalParts: 2,
          totalMaterials: 1,
          materialUtilization: 0.67,
          wastePercentage: 0.33,
          sharedCuttingPairs: 0,
          processingTime: 10,
          strategy: 'V6'
        },
        optimization: {
          chainsBuilt: 0,
          totalChainSavings: 0,
          anglesToleranceUsed: 5,
          mixedChainsCreated: 0
        },
        performance: {
          matchingTime: 1,
          chainBuildingTime: 2,
          placementTime: 5,
          totalTime: 8
        }
      };

      const result = service.convertWorkerResult(workerResult, materials, parts, 3, 10);

      // 驗證 cutPlans
      expect(result.cutPlans).toBeDefined();
      expect(result.cutPlans.length).toBe(1);
      expect(result.cutPlans[0].parts.length).toBe(2);
      expect(result.cutPlans[0].materialLength).toBe(6000);

      // 驗證統計資料
      expect(result.totalMaterialsUsed).toBe(1);
      expect(result.unplacedParts).toEqual([]);
      expect(result.overallEfficiency).toBeCloseTo(67, 0);

      // 驗證報告
      expect(result.report).toContain('V6 切割優化系統報告');
      expect(result.report).toContain('總零件數: 2');
    });

    it('應該正確處理有未排版零件的 Worker 結果', () => {
      const materials: Material[] = [
        { id: 'M1', length: 1000, quantity: 1 }
      ];

      const parts: Part[] = [
        {
          id: 'P1',
          length: 500,
          quantity: 1,
          thickness: 20
        },
        {
          id: 'P2',
          length: 2000, // 超過材料長度
          quantity: 1,
          thickness: 20
        }
      ];

      // 模擬 Worker 返回的結果
      const workerResult = {
        placedParts: [
          {
            partId: 'P1',
            materialId: 'M1',
            materialInstanceId: 0,
            position: 10,
            length: 500
          }
        ],
        unplacedParts: [
          {
            partId: 'P2',
            instanceId: 0,
            reason: '零件長度超出材料'
          }
        ],
        usedMaterials: [
          {
            material: { id: 'M1', length: 1000 },
            instanceId: 0,
            utilization: 0.51
          }
        ],
        totalSavings: 0,
        success: false,
        warnings: ['有 1 個零件無法排版'],
        report: {
          totalParts: 2,
          totalMaterials: 1,
          materialUtilization: 0.51,
          wastePercentage: 0.49,
          sharedCuttingPairs: 0,
          processingTime: 10,
          strategy: 'V6'
        }
      };

      const result = service.convertWorkerResult(workerResult, materials, parts, 3, 10);

      // 驗證 cutPlans
      expect(result.cutPlans.length).toBe(1);
      expect(result.cutPlans[0].parts.length).toBe(1);

      // 驗證未排版零件
      expect(result.unplacedParts).toBeDefined();
      expect(result.unplacedParts.length).toBe(1);
      expect(result.unplacedParts[0].partId).toBe('P2');
    });

    it('應該正確處理完全無法排版的情況', () => {
      const materials: Material[] = [
        { id: 'M1', length: 1000, quantity: 1 }
      ];

      const parts: Part[] = [
        {
          id: 'P1',
          length: 2000, // 超過材料長度
          quantity: 1,
          thickness: 20
        }
      ];

      // 模擬 Worker 返回的結果
      const workerResult = {
        placedParts: [],
        unplacedParts: [
          {
            partId: 'P1',
            instanceId: 0,
            reason: '零件長度超出所有材料長度'
          }
        ],
        usedMaterials: [],
        totalSavings: 0,
        success: false,
        warnings: ['有 1 個零件無法排版'],
        report: {
          totalParts: 1,
          totalMaterials: 1,
          materialUtilization: 0,
          wastePercentage: 1,
          sharedCuttingPairs: 0,
          processingTime: 5,
          strategy: 'V6'
        }
      };

      const result = service.convertWorkerResult(workerResult, materials, parts, 3, 10);

      // 驗證 cutPlans 為空
      expect(result.cutPlans).toEqual([]);

      // 驗證未排版零件
      expect(result.unplacedParts.length).toBe(1);
      expect(result.unplacedParts[0].partId).toBe('P1');

      // 驗證效率為0
      expect(result.overallEfficiency).toBe(0);
      expect(result.materialUtilization).toBe(0);
    });

    it('應該正確處理共刀優化的 Worker 結果', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 0 }
      ];

      const parts: Part[] = [
        {
          id: 'P1',
          length: 2000,
          quantity: 1,
          angles: { topLeft: 45, topRight: 90, bottomLeft: 90, bottomRight: 45 },
          thickness: 20
        },
        {
          id: 'P2',
          length: 2000,
          quantity: 1,
          angles: { topLeft: 45, topRight: 90, bottomLeft: 90, bottomRight: 45 },
          thickness: 20
        }
      ];

      // 模擬 Worker 返回的結果
      const workerResult = {
        placedParts: [
          {
            partId: 'P1',
            materialId: 'M1',
            materialInstanceId: 0,
            position: 10,
            length: 2000,
            sharedCuttingInfo: {
              pairedWithPartId: 'P2',
              savings: 8.28
            }
          },
          {
            partId: 'P2',
            materialId: 'M1',
            materialInstanceId: 0,
            position: 2001.72,
            length: 2000,
            sharedCuttingInfo: {
              pairedWithPartId: 'P1',
              savings: 8.28
            }
          }
        ],
        unplacedParts: [],
        usedMaterials: [
          {
            material: { id: 'M1', length: 6000 },
            instanceId: 0,
            utilization: 0.67
          }
        ],
        totalSavings: 8.28,
        success: true,
        warnings: [],
        report: {
          totalParts: 2,
          totalMaterials: 1,
          materialUtilization: 0.67,
          wastePercentage: 0.33,
          sharedCuttingPairs: 1,
          processingTime: 15,
          strategy: 'V6'
        },
        optimization: {
          chainsBuilt: 1,
          totalChainSavings: 8.28,
          anglesToleranceUsed: 5,
          mixedChainsCreated: 0
        }
      };

      const result = service.convertWorkerResult(workerResult, materials, parts, 3, 10);

      // 驗證共刀信息
      expect(result.sharedCuttingInfo).toBeDefined();
      expect(result.sharedCuttingInfo.totalSharedCuts).toBe(2);
      expect(result.sharedCuttingInfo.totalSavings).toBeCloseTo(8.28, 2);

      // 驗證 cutPlans 中的共刀標記
      const sharedCuts = result.cutPlans[0].parts.filter(p => p.isSharedCut);
      expect(sharedCuts.length).toBe(2);
      expect(sharedCuts[0].angleSavings).toBeCloseTo(8.28, 2);
    });
  });
});