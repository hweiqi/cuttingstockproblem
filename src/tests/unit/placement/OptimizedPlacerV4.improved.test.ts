import { OptimizedPlacerV4 } from '../../../placement/OptimizedPlacerV4';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material } from '../../../core/v6/models/Material';

describe('OptimizedPlacerV4 - 改進後的測試', () => {
  let placer: OptimizedPlacerV4;

  beforeEach(() => {
    placer = new OptimizedPlacerV4({
      cuttingLoss: 3,
      frontEndLoss: 10
    });
  });

  describe('大批量零件排版測試', () => {
    it('應該能有效處理1000個零件', () => {
      // 準備測試數據
      const parts: PartWithQuantity[] = [];
      for (let i = 0; i < 200; i++) {
        parts.push({
          id: `P${i}`,
          length: 1000 + (i % 5) * 500, // 1000-3000mm
          quantity: 5, // 總共1000個實例
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        });
      }

      const materials: Material[] = [
        { id: 'M1', length: 6000 },
        { id: 'M2', length: 9000 },
        { id: 'M3', length: 12000 }
      ];

      // 執行排版
      const result = placer.placePartsWithChains(parts, materials, []);

      // 驗證結果
      const totalPartInstances = parts.reduce((sum, p) => sum + p.quantity, 0);
      const placementRate = result.placedParts.length / totalPartInstances;

      expect(placementRate).toBeGreaterThan(0.9); // 至少90%排版率
      expect(result.unplacedParts.length).toBeLessThan(totalPartInstances * 0.1);
      expect(result.usedMaterials.length).toBeGreaterThan(0);
    });

    it('應該為大批量零件創建足夠的材料實例', () => {
      // 準備10000個零件實例
      const parts: PartWithQuantity[] = [];
      for (let i = 0; i < 100; i++) {
        parts.push({
          id: `P${i}`,
          length: 2000,
          quantity: 100, // 總共10000個實例
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        });
      }

      const materials: Material[] = [
        { id: 'M1', length: 12000 } // 每個材料可以放5個零件
      ];

      // 執行排版
      const result = placer.placePartsWithChains(parts, materials, []);

      // 理論上需要至少2000個材料實例（10000/5）
      expect(result.usedMaterials.length).toBeGreaterThanOrEqual(1800); // 允許10%的餘量
      
      const placementRate = result.placedParts.length / 10000;
      expect(placementRate).toBeGreaterThan(0.9);
    });

    it('應該正確處理批次處理邏輯', () => {
      // 測試自適應批次大小
      const parts: PartWithQuantity[] = [];
      
      // 添加容易排版的零件（應該增加批次大小）
      for (let i = 0; i < 50; i++) {
        parts.push({
          id: `Easy${i}`,
          length: 1000,
          quantity: 10,
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        });
      }

      // 添加難以排版的零件（應該減小批次大小）
      for (let i = 0; i < 10; i++) {
        parts.push({
          id: `Hard${i}`,
          length: 5999, // 幾乎佔滿6000mm的材料
          quantity: 5,
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        });
      }

      const materials: Material[] = [
        { id: 'M1', length: 6000 },
        { id: 'M2', length: 12000 }
      ];

      // 執行排版
      const startTime = Date.now();
      const result = placer.placePartsWithChains(parts, materials, []);
      const executionTime = Date.now() - startTime;

      // 驗證結果
      const totalPartInstances = parts.reduce((sum, p) => sum + p.quantity, 0);
      const placementRate = result.placedParts.length / totalPartInstances;

      expect(placementRate).toBeGreaterThan(0.85); // 至少85%排版率
      expect(executionTime).toBeLessThan(5000); // 應該在5秒內完成
      
      // 檢查是否使用了兩種材料
      const usedMaterialTypes = new Set(result.usedMaterials.map(m => m.material.id));
      expect(usedMaterialTypes.size).toBe(2); // 應該使用了兩種材料
    });
  });

  describe('材料實例管理測試', () => {
    it('應該根據成功率動態調整材料實例創建策略', () => {
      // 創建一批難以排版的零件
      const parts: PartWithQuantity[] = [];
      for (let i = 0; i < 100; i++) {
        parts.push({
          id: `P${i}`,
          length: 4500 + (i % 10) * 100, // 4500-5400mm，對6000mm材料來說利用率低
          quantity: 5,
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        });
      }

      const materials: Material[] = [
        { id: 'M1', length: 6000 } // 每個材料只能放1個零件，利用率低
      ];

      // 執行排版
      const result = placer.placePartsWithChains(parts, materials, []);

      // 應該創建足夠多的材料實例
      expect(result.usedMaterials.length).toBeGreaterThan(400); // 需要至少400個材料實例
      
      const totalPartInstances = 500;
      const placementRate = result.placedParts.length / totalPartInstances;
      expect(placementRate).toBeGreaterThan(0.8); // 即使利用率低也應該達到80%以上
    });
  });
});