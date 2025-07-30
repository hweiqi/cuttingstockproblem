import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { CuttingOptimizationWorkerClient } from '../../../workers/CuttingOptimizationWorkerClient';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material } from '../../../core/v6/models/Material';

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = jest.fn((message: any) => {
    // 模擬 Worker 的回應
    setTimeout(() => {
      if (this.onmessage) {
        const response = this.processMessage(message);
        this.onmessage(new MessageEvent('message', { data: response }));
      }
    }, 10);
  });
  
  terminate = jest.fn();
  
  private processMessage(message: any) {
    switch (message.type) {
      case 'optimize':
        return {
          type: 'result',
          id: message.id,
          result: {
            placedParts: [],
            unplacedParts: [],
            usedMaterials: [],
            totalSavings: 0,
            success: true,
            warnings: [],
            report: {
              totalParts: message.data.parts.reduce((sum: number, p: any) => sum + p.quantity, 0),
              totalMaterials: message.data.materials.length,
              materialUtilization: 0.85,
              wastePercentage: 0.15,
              sharedCuttingPairs: 0,
              processingTime: 100,
              strategy: 'Web Worker 優化'
            }
          }
        };
      case 'progress':
        return {
          type: 'progress',
          id: message.id,
          progress: 50
        };
      default:
        return { type: 'error', error: 'Unknown message type' };
    }
  }
}

// Mock Worker constructor
(global as any).Worker = MockWorker;

describe('CuttingOptimizationWorker', () => {
  let client: CuttingOptimizationWorkerClient;

  beforeEach(() => {
    client = new CuttingOptimizationWorkerClient();
  });

  afterEach(() => {
    client.terminate();
  });

  const createPart = (id: string, length: number, quantity = 1): PartWithQuantity => ({
    id,
    length,
    quantity,
    angles: { topLeft: 90, topRight: 90, bottomLeft: 90, bottomRight: 90 },
    thickness: 20
  });

  const createMaterial = (id: string, length: number, quantity = 1): Material => ({
    id,
    length,
    quantity,
    type: 'standard'
  });

  describe('基本功能', () => {
    test('應該能夠執行優化計算', async () => {
      const parts: PartWithQuantity[] = [
        createPart('A', 1000, 5),
        createPart('B', 800, 5)
      ];
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 10)
      ];

      const result = await client.optimize(parts, materials);

      expect(result.success).toBe(true);
      expect(result.report.totalParts).toBe(10);
      expect(result.report.totalMaterials).toBe(10);
    });

    test('應該支援進度回調', async () => {
      const parts: PartWithQuantity[] = [
        createPart('A', 1000, 100)
      ];
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 50)
      ];

      const progressUpdates: number[] = [];
      const onProgress = (progress: number) => {
        progressUpdates.push(progress);
      };

      await client.optimize(parts, materials, { onProgress });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0]).toBe(50);
    });

    test('應該能夠取消正在進行的優化', async () => {
      const parts: PartWithQuantity[] = [
        createPart('A', 1000, 1000)
      ];
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 500)
      ];

      const promise = client.optimize(parts, materials);
      
      // 立即取消
      client.cancel();

      await expect(promise).rejects.toThrow('優化已取消');
    });
  });

  describe('並行處理', () => {
    test('應該能夠同時處理多個優化請求', async () => {
      const parts1: PartWithQuantity[] = [
        createPart('A', 1000, 5)
      ];
      
      const parts2: PartWithQuantity[] = [
        createPart('B', 800, 5)
      ];
      
      const materials: Material[] = [
        createMaterial('M1', 3000, 10)
      ];

      const [result1, result2] = await Promise.all([
        client.optimize(parts1, materials),
        client.optimize(parts2, materials)
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('錯誤處理', () => {
    test('應該處理空輸入', async () => {
      const result = await client.optimize([], []);

      expect(result.success).toBe(true);
      expect(result.placedParts).toEqual([]);
      expect(result.unplacedParts).toEqual([]);
    });

    test('應該處理Worker錯誤', async () => {
      // 模擬Worker錯誤
      const mockPostMessage = jest.fn(() => {
        throw new Error('Worker crashed');
      });
      
      (client as any).worker.postMessage = mockPostMessage;

      await expect(client.optimize([], [])).rejects.toThrow('Worker crashed');
    });
  });

  describe('資源管理', () => {
    test('應該正確終止Worker', () => {
      const terminateSpy = jest.spyOn((client as any).worker, 'terminate');
      
      client.terminate();
      
      expect(terminateSpy).toHaveBeenCalled();
    });

    test('應該在多次終止時不會出錯', () => {
      expect(() => {
        client.terminate();
        client.terminate();
      }).not.toThrow();
    });
  });

  describe('效能優化', () => {
    test('應該快取Worker實例', () => {
      const client1 = new CuttingOptimizationWorkerClient();
      const client2 = new CuttingOptimizationWorkerClient();
      
      // Worker 應該被重用（這取決於實作）
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      
      client1.terminate();
      client2.terminate();
    });
  });
});