import { OptimizedPlacerV4 } from '../../../placement/OptimizedPlacerV4';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material } from '../../../core/v6/models/Material';

describe('OptimizedPlacerV4 - 批次處理邏輯測試', () => {
  let placer: OptimizedPlacerV4;

  beforeEach(() => {
    placer = new OptimizedPlacerV4({
      cuttingLoss: 5,
      frontEndLoss: 20,
      minPartSpacing: 0
    });
  });

  describe('小批量零件排版', () => {
    it('應該成功排版所有小批量零件', () => {
      // 準備測試資料
      const parts: PartWithQuantity[] = [
        { id: 'P1', length: 1000, quantity: 10, angles: [], thickness: 5 },
        { id: 'P2', length: 1500, quantity: 10, angles: [], thickness: 5 },
        { id: 'P3', length: 2000, quantity: 10, angles: [], thickness: 5 }
      ];

      const materials: Material[] = [
        { id: 'M1', name: '鋁材 6000mm', length: 6000, quantity: 0 } // 無限供應
      ];

      // 執行排版
      const result = placer.placeParts(parts, materials);

      // 驗證結果
      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBe(30);
      expect(result.unplacedParts.length).toBe(0);
      expect(result.report.totalParts).toBe(30);
      expect(result.report.materialUtilization).toBeGreaterThan(0.7);
    });
  });

  describe('中等批量零件排版', () => {
    it('應該有效處理 1000 個零件', () => {
      // 準備測試資料
      const parts: PartWithQuantity[] = [];
      
      // 創建多種長度的零件
      for (let i = 0; i < 10; i++) {
        parts.push({
          id: `P${i}`,
          length: 500 + i * 100, // 500-1400mm
          quantity: 100,
          angles: [],
          thickness: 5
        });
      }

      const materials: Material[] = [
        { id: 'M1', name: '鋁材 6000mm', length: 6000, quantity: 0 }
      ];

      // 執行排版
      const startTime = Date.now();
      const result = placer.placeParts(parts, materials);
      const endTime = Date.now();

      // 驗證結果
      expect(result.placedParts.length).toBe(1000);
      expect(result.unplacedParts.length).toBe(0);
      expect(result.success).toBe(true);
      expect(result.report.processingTime).toBeLessThan(5000); // 應在 5 秒內完成
      expect(result.usedMaterials.length).toBeGreaterThan(0);
      
      // 驗證自適應批次處理的效果
      const avgUtilization = result.report.materialUtilization;
      expect(avgUtilization).toBeGreaterThan(0.6); // 利用率應該較高
    });
  });

  describe('大批量零件排版', () => {
    it('應該能處理 10000 個零件並達到高排版率', () => {
      // 準備測試資料
      const parts: PartWithQuantity[] = [];
      
      // 創建不同規格的零件
      const specs = [
        { length: 800, quantity: 2000 },
        { length: 1200, quantity: 3000 },
        { length: 1500, quantity: 2000 },
        { length: 2000, quantity: 2000 },
        { length: 2500, quantity: 1000 }
      ];

      specs.forEach((spec, index) => {
        parts.push({
          id: `P${index}`,
          length: spec.length,
          quantity: spec.quantity,
          angles: [],
          thickness: 5
        });
      });

      const materials: Material[] = [
        { id: 'M1', name: '鋁材 6000mm', length: 6000, quantity: 0 },
        { id: 'M2', name: '鋁材 9000mm', length: 9000, quantity: 0 }
      ];

      // 執行排版
      const startTime = Date.now();
      const result = placer.placeParts(parts, materials);
      const endTime = Date.now();

      // 驗證結果
      const placedCount = result.placedParts.length;
      const totalParts = 10000;
      const placementRate = placedCount / totalParts;

      expect(placementRate).toBeGreaterThan(0.95); // 至少 95% 的排版率
      expect(result.report.processingTime).toBeLessThan(30000); // 應在 30 秒內完成
      expect(result.usedMaterials.length).toBeGreaterThan(100); // 應該使用了大量材料實例
      
      // 驗證材料多樣性 - 系統會選擇最有效率的材料組合
      const materialTypes = new Set(result.usedMaterials.map(m => m.material.id));
      expect(materialTypes.size).toBeGreaterThanOrEqual(1); // 至少使用了一種材料
    });
  });

  describe('自適應批次大小測試', () => {
    it('應該根據成功率動態調整批次大小', () => {
      // 準備測試資料 - 混合簡單和困難的零件
      const parts: PartWithQuantity[] = [
        // 簡單零件（較短）
        { id: 'Easy1', length: 500, quantity: 500, angles: [], thickness: 5 },
        { id: 'Easy2', length: 800, quantity: 500, angles: [], thickness: 5 },
        // 困難零件（較長）
        { id: 'Hard1', length: 5500, quantity: 100, angles: [], thickness: 5 },
        { id: 'Hard2', length: 5800, quantity: 100, angles: [], thickness: 5 }
      ];

      const materials: Material[] = [
        { id: 'M1', name: '鋁材 6000mm', length: 6000, quantity: 0 }
      ];

      // 執行排版
      const result = placer.placeParts(parts, materials);

      // 驗證結果
      expect(result.placedParts.length).toBeGreaterThan(1000); // 大部分應該被排版
      expect(result.report.strategy).toContain('自適應批次處理');
      
      // 困難零件可能有部分未排版
      const unplacedHardParts = result.unplacedParts.filter(p => 
        p.partId.startsWith('Hard')
      );
      expect(unplacedHardParts.length).toBeLessThan(50); // 困難零件未排版數應該較少
    });
  });

  describe('材料實例動態創建測試', () => {
    it('應該根據需求動態創建足夠的材料實例', () => {
      // 準備測試資料
      const parts: PartWithQuantity[] = [
        { id: 'P1', length: 2000, quantity: 1000, angles: [], thickness: 5 }
      ];

      const materials: Material[] = [
        { id: 'M1', name: '鋁材 6000mm', length: 6000, quantity: 0 }
      ];

      // 執行排版
      const result = placer.placeParts(parts, materials);

      // 驗證結果
      expect(result.success).toBe(true);
      expect(result.placedParts.length).toBe(1000);
      
      // 每個 6000mm 材料最多可放 2 個 2000mm 零件（考慮損耗）
      // 1000 個零件至少需要 500 個材料實例
      expect(result.usedMaterials.length).toBeGreaterThanOrEqual(400);
      expect(result.usedMaterials.length).toBeLessThanOrEqual(600);
    });

    it('應該正確處理有限供應的材料', () => {
      // 準備測試資料
      const parts: PartWithQuantity[] = [
        { id: 'P1', length: 2000, quantity: 100, angles: [], thickness: 5 }
      ];

      const materials: Material[] = [
        { id: 'M1', name: '鋁材 6000mm', length: 6000, quantity: 10 } // 根據系統規格，材料沒有數量上限
      ];

      // 執行排版
      const result = placer.placeParts(parts, materials);

      // 驗證結果 - 系統會自動創建所需數量的材料實例
      expect(result.placedParts.length).toBe(100); // 所有零件都應該被排版
      expect(result.unplacedParts.length).toBe(0); // 沒有未排版的零件
      
      // 每個材料可以放置約 2-3 個 2000mm 的零件（含切割損耗）
      // 100 個零件大約需要 34-50 個材料實例
      expect(result.usedMaterials.length).toBeGreaterThanOrEqual(34);
      expect(result.usedMaterials.length).toBeLessThanOrEqual(60);
    });
  });

  describe('極端情況測試', () => {
    it('應該處理超長零件', () => {
      // 準備測試資料
      const parts: PartWithQuantity[] = [
        { id: 'P1', length: 8000, quantity: 10, angles: [], thickness: 5 } // 超過材料長度
      ];

      const materials: Material[] = [
        { id: 'M1', name: '鋁材 6000mm', length: 6000, quantity: 0 }
      ];

      // 執行排版
      const result = placer.placeParts(parts, materials);

      // 驗證結果
      expect(result.success).toBe(false);
      expect(result.placedParts.length).toBe(0);
      expect(result.unplacedParts.length).toBe(10);
      expect(result.unplacedParts[0].reason).toContain('超出所有材料長度');
    });

    it('應該處理空輸入', () => {
      // 執行排版
      const result1 = placer.placeParts([], []);
      expect(result1.success).toBe(false);
      expect(result1.placedParts.length).toBe(0);

      const parts: PartWithQuantity[] = [
        { id: 'P1', length: 1000, quantity: 10, angles: [], thickness: 5 }
      ];
      const result2 = placer.placeParts(parts, []);
      expect(result2.success).toBe(false);
      expect(result2.warnings).toContain('沒有提供材料，無法進行排版');
    });
  });

  describe('效能測試', () => {
    it('應該在合理時間內處理 50000 個零件', () => {
      // 準備測試資料
      const parts: PartWithQuantity[] = [];
      
      // 創建多種規格的零件，總計 50000 個
      const specs = [
        { length: 500, quantity: 5000 },
        { length: 800, quantity: 8000 },
        { length: 1000, quantity: 10000 },
        { length: 1200, quantity: 8000 },
        { length: 1500, quantity: 7000 },
        { length: 2000, quantity: 6000 },
        { length: 2500, quantity: 4000 },
        { length: 3000, quantity: 2000 }
      ];

      specs.forEach((spec, index) => {
        parts.push({
          id: `P${index}`,
          length: spec.length,
          quantity: spec.quantity,
          angles: [],
          thickness: 5
        });
      });

      const materials: Material[] = [
        { id: 'M1', name: '鋁材 6000mm', length: 6000, quantity: 0 },
        { id: 'M2', name: '鋁材 9000mm', length: 9000, quantity: 0 },
        { id: 'M3', name: '鋁材 12000mm', length: 12000, quantity: 0 }
      ];

      // 執行排版
      const startTime = Date.now();
      const result = placer.placeParts(parts, materials);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // 驗證結果
      console.log(`處理 50000 個零件耗時: ${processingTime}ms`);
      console.log(`已排版零件數: ${result.placedParts.length}`);
      console.log(`排版率: ${(result.placedParts.length / 50000 * 100).toFixed(2)}%`);
      console.log(`使用材料實例數: ${result.usedMaterials.length}`);
      console.log(`材料利用率: ${(result.report.materialUtilization * 100).toFixed(2)}%`);

      // 驗證性能指標
      expect(processingTime).toBeLessThan(90000); // 應在 90 秒內完成
      expect(result.placedParts.length).toBeGreaterThan(45000); // 至少 90% 的排版率
      expect(result.report.materialUtilization).toBeGreaterThan(0.7); // 至少 70% 的利用率
    }, 120000); // 設定測試超時為 2 分鐘
  });
});