import { V6CuttingService } from '../../services/V6CuttingService';
import { Material, Part } from '../../types';

describe('優化功能和進度測試', () => {
  describe('同步優化測試', () => {
    it('V6CuttingService 應該正確返回優化結果', () => {
      const service = new V6CuttingService();
      
      const materials: Material[] = [
        { id: 'M1', length: 6000 },
        { id: 'M2', length: 9000 },
        { id: 'M3', length: 12000 }
      ];
      
      const parts: Part[] = [
        { id: 'P1', length: 2000, quantity: 3 },
        { id: 'P2', length: 3000, quantity: 2 },
        { id: 'P3', length: 1500, quantity: 4 }
      ];
      
      const result = service.optimize(materials, parts, 3, 10);
      
      // 檢查基本結果
      expect(result).toBeDefined();
      expect(result.cutPlans).toBeDefined();
      expect(result.cutPlans.length).toBeGreaterThan(0);
      expect(result.totalMaterialsUsed).toBeGreaterThan(0);
      expect(result.overallEfficiency).toBeGreaterThan(0);
      expect(result.unplacedParts).toBeDefined();
      
      // 檢查共刀資訊
      expect(result.sharedCuttingInfo).toBeDefined();
      
      // 檢查報告
      expect(result.report).toBeDefined();
      
      console.log('同步優化結果：');
      console.log(`  - 切割方案數：${result.cutPlans.length}`);
      console.log(`  - 使用材料數：${result.totalMaterialsUsed}`);
      console.log(`  - 整體效率：${result.overallEfficiency?.toFixed(2)}%`);
      console.log(`  - 共刀切割數：${result.sharedCuttingInfo?.totalSharedCuts || 0}`);
      console.log(`  - 總節省：${result.sharedCuttingInfo?.totalSavings?.toFixed(2) || 0}mm`);
      
      // 檢查切割方案細節
      result.cutPlans.forEach((plan, index) => {
        expect(plan.materialId).toBeDefined();
        expect(plan.materialLength).toBeGreaterThan(0);
        expect(plan.parts).toBeDefined();
        expect(plan.cuts).toBeDefined();
        expect(plan.waste).toBeGreaterThanOrEqual(0);
        expect(plan.efficiency).toBeGreaterThanOrEqual(0);
        expect(plan.efficiency).toBeLessThanOrEqual(100);
        
        // 檢查零件詳情
        plan.parts.forEach(part => {
          expect(part.partId).toBeDefined();
          expect(part.length).toBeGreaterThan(0);
          expect(part.position).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });
  
  
  describe('結果顯示測試', () => {
    it('優化結果應該包含所有必要的顯示資訊', () => {
      const service = new V6CuttingService();
      
      const materials: Material[] = [
        { id: 'M1', length: 6000 },
        { id: 'M2', length: 9000 }
      ];
      
      const parts: Part[] = [
        { 
          id: 'P1', 
          length: 2000, 
          quantity: 2,
          angles: { topLeft: 45, topRight: 45, bottomLeft: 0, bottomRight: 0 }
        },
        { 
          id: 'P2', 
          length: 2500, 
          quantity: 2,
          angles: { topLeft: 45, topRight: 45, bottomLeft: 0, bottomRight: 0 }
        }
      ];
      
      const result = service.optimize(materials, parts, 3, 10);
      
      // 檢查結果結構
      expect(result.cutPlans).toBeDefined();
      expect(result.totalMaterialsUsed).toBeDefined();
      expect(result.totalWaste).toBeDefined();
      expect(result.overallEfficiency).toBeDefined();
      expect(result.materialUtilization).toBeDefined();
      expect(result.report).toBeDefined();
      expect(result.sharedCuttingInfo).toBeDefined();
      
      // 檢查每個切割方案的詳細資訊
      result.cutPlans.forEach((plan, index) => {
        console.log(`\n切割方案 ${index + 1}：`);
        console.log(`  - 材料ID：${plan.materialId}`);
        console.log(`  - 材料長度：${plan.materialLength}mm`);
        console.log(`  - 零件數：${plan.parts.length}`);
        console.log(`  - 餘料：${plan.waste?.toFixed(2)}mm`);
        console.log(`  - 效率：${plan.efficiency?.toFixed(2)}%`);
        
        // 檢查是否有共刀資訊
        const sharedCuts = plan.parts.filter(p => p.isSharedCut);
        if (sharedCuts.length > 0) {
          console.log(`  - 共刀切割數：${sharedCuts.length}`);
          const totalSavings = sharedCuts.reduce((sum, cut) => sum + (cut.angleSavings || 0), 0);
          console.log(`  - 本材料共刀節省：${totalSavings.toFixed(2)}mm`);
        }
      });
      
      // 檢查總體統計
      console.log('\n總體統計：');
      console.log(`  - 總材料使用：${result.totalMaterialsUsed}`);
      console.log(`  - 總餘料：${result.totalWaste?.toFixed(2)}mm`);
      console.log(`  - 整體效率：${result.overallEfficiency?.toFixed(2)}%`);
      console.log(`  - 材料利用率：${(result.materialUtilization * 100).toFixed(2)}%`);
      
      if (result.sharedCuttingInfo) {
        console.log(`  - 總共刀切割：${result.sharedCuttingInfo.totalSharedCuts}`);
        console.log(`  - 總節省材料：${result.sharedCuttingInfo.totalSavings?.toFixed(2)}mm`);
      }
      
      // 檢查報告內容
      if (result.report) {
        console.log('\nV6優化報告：');
        console.log(result.report);
        expect(result.report.length).toBeGreaterThan(0);
      }
    });
  });
});