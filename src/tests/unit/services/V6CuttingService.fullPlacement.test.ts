import { V6CuttingService } from '../../../services/V6CuttingService';
import { Material, Part } from '../../../types';

describe('V6CuttingService 完整排版測試', () => {
  let service: V6CuttingService;

  beforeEach(() => {
    service = new V6CuttingService();
  });

  describe('所有零件必須完成排版', () => {
    it('應該確保所有零件都出現在 cutPlans 中', () => {
      // 用戶報告的具體場景
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 0 },   // 無限供應
        { id: 'M2', length: 12000, quantity: 0 }  // 無限供應
      ];

      const parts: Part[] = [
        {
          id: 'P1',
          length: 4784,
          quantity: 85,  // 85個零件
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        },
        {
          id: 'P2',
          length: 3000,
          quantity: 50,  // 50個零件
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const cutPlans = service.optimizeCutting(materials, parts);

      // 計算總排版零件數
      const totalPlacedParts = cutPlans.reduce((sum, plan) => {
        return sum + (plan.cuts?.length || 0);
      }, 0);

      // 應該有135個零件（85 + 50）
      expect(totalPlacedParts).toBe(135);

      // 驗證所有P1零件都被排版
      const p1Count = cutPlans.reduce((sum, plan) => {
        return sum + (plan.cuts?.filter(cut => cut.partId === 'P1').length || 0);
      }, 0);
      expect(p1Count).toBe(85);

      // 驗證所有P2零件都被排版
      const p2Count = cutPlans.reduce((sum, plan) => {
        return sum + (plan.cuts?.filter(cut => cut.partId === 'P2').length || 0);
      }, 0);
      expect(p2Count).toBe(50);

      // 輸出詳細信息
      console.log(`總計畫數：${cutPlans.length}`);
      console.log(`總零件數：${totalPlacedParts}`);
      console.log(`P1零件數：${p1Count}`);
      console.log(`P2零件數：${p2Count}`);
    });

    it('材料數量非0時應該限制使用', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 5 },  // 限制5個
        { id: 'M2', length: 12000, quantity: 0 }  // 無限供應
      ];

      const parts: Part[] = [
        {
          id: 'P1',
          length: 5500,  // 每個6000mm材料只能放1個
          quantity: 10,
          angles: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0
          },
          thickness: 20
        }
      ];

      const cutPlans = service.optimizeCutting(materials, parts);

      // 統計使用的材料
      const m1Usage = cutPlans.filter(plan => plan.materialId === 'M1').length;
      const m2Usage = cutPlans.filter(plan => plan.materialId === 'M2').length;

      console.log(`M1使用：${m1Usage}個，M2使用：${m2Usage}個`);

      // M1最多使用5個
      expect(m1Usage).toBeLessThanOrEqual(5);
      // 所有零件都應該被排版
      const totalPlacedParts = cutPlans.reduce((sum, plan) => 
        sum + (plan.cuts?.length || 0), 0
      );
      expect(totalPlacedParts).toBe(10);
    });

    it('混合有限和無限材料時的優化策略', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 3 },   // 有限材料
        { id: 'M2', length: 9000, quantity: 2 },   // 有限材料
        { id: 'M3', length: 12000, quantity: 0 }   // 無限材料
      ];

      const parts: Part[] = [
        {
          id: 'SMALL',
          length: 1000,
          quantity: 20,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        },
        {
          id: 'MEDIUM',
          length: 3000,
          quantity: 15,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        },
        {
          id: 'LARGE',
          length: 5000,
          quantity: 10,
          angles: { topLeft: 0, topRight: 30, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const cutPlans = service.optimizeCutting(materials, parts);

      // 統計各材料使用情況
      const materialUsage = new Map<string, number>();
      cutPlans.forEach(plan => {
        const id = plan.materialId;
        materialUsage.set(id, (materialUsage.get(id) || 0) + 1);
      });

      console.log('材料使用情況：');
      materialUsage.forEach((count, id) => {
        console.log(`  ${id}: ${count}個`);
      });

      // 驗證有限材料不超過限制
      expect(materialUsage.get('M1') || 0).toBeLessThanOrEqual(3);
      expect(materialUsage.get('M2') || 0).toBeLessThanOrEqual(2);

      // 驗證所有零件都被排版
      const totalPlacedParts = cutPlans.reduce((sum, plan) => 
        sum + (plan.cuts?.length || 0), 0
      );
      expect(totalPlacedParts).toBe(45); // 20 + 15 + 10
    });

    it('應該生成正確的優化報告', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 0 }
      ];

      const parts: Part[] = [
        {
          id: 'P1',
          length: 2000,
          quantity: 30,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
          thickness: 20
        }
      ];

      const cutPlans = service.optimizeCutting(materials, parts);
      const report = service.getOptimizationReport(materials, parts);

      console.log('\n優化報告：');
      console.log(report);

      // 驗證報告包含關鍵信息
      expect(report).toContain('已排版零件: 30');
      expect(report).toContain('未排版零件: 0');
      expect(report).toContain('材料利用率:');
    });
  });

  describe('詳細排版方案完整性', () => {
    it('cutPlans 應該包含所有排版的零件信息', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 0 }
      ];

      const parts: Part[] = [
        {
          id: 'P1',
          length: 1500,
          quantity: 20,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const cutPlans = service.optimizeCutting(materials, parts);

      // 驗證每個計畫都有正確的結構
      cutPlans.forEach((plan, index) => {
        expect(plan.materialId).toBeDefined();
        expect(plan.materialLength).toBeDefined();
        expect(plan.cuts).toBeDefined();
        expect(plan.cuts!.length).toBeGreaterThan(0);

        console.log(`計畫 ${index + 1}: 材料${plan.materialId}, 長度${plan.materialLength}mm, 包含${plan.cuts!.length}個零件`);
        
        // 驗證每個切割都有必要的信息
        plan.cuts!.forEach(cut => {
          expect(cut.partId).toBeDefined();
          expect(cut.position).toBeDefined();
          expect(cut.length).toBeDefined();
        });
      });

      // 統計總零件數
      const totalParts = cutPlans.reduce((sum, plan) => 
        sum + (plan.cuts?.length || 0), 0
      );
      expect(totalParts).toBe(20);
    });

    it('當使用多種材料長度時，應該都出現在 cutPlans 中', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 0 },
        { id: 'M2', length: 9000, quantity: 0 },
        { id: 'M3', length: 12000, quantity: 0 }
      ];

      const parts: Part[] = [
        {
          id: 'P1',
          length: 5500,  // 適合6000mm材料
          quantity: 5,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        },
        {
          id: 'P2',
          length: 8500,  // 適合9000mm材料
          quantity: 5,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        },
        {
          id: 'P3',
          length: 11500, // 適合12000mm材料
          quantity: 5,
          angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
          thickness: 20
        }
      ];

      const cutPlans = service.optimizeCutting(materials, parts);

      // 統計使用的材料長度種類
      const usedLengths = new Set<number>();
      cutPlans.forEach(plan => {
        usedLengths.add(plan.materialLength);
      });

      console.log('使用的材料長度：', Array.from(usedLengths));
      
      // 應該使用多種長度的材料
      expect(usedLengths.size).toBeGreaterThan(1);
      
      // 所有零件都應該被排版
      const totalParts = cutPlans.reduce((sum, plan) => 
        sum + (plan.cuts?.length || 0), 0
      );
      expect(totalParts).toBe(15);
    });
  });
});