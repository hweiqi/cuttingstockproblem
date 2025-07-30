import { MaterialService } from '../../services/MaterialService';
import { PartService } from '../../services/PartService';
import { V6CuttingService } from '../../services/V6CuttingService';
import { Material, Part } from '../../types';

export async function testLargeDataset(partCount: number = 50000): Promise<void> {
  console.log(`開始測試 ${partCount} 個零件的排版效能...`);
  
  // 初始化服務
  const materialService = new MaterialService();
  const partService = new PartService();
  const v6CuttingService = new V6CuttingService();
  
  // 設定切割損耗
  v6CuttingService.updateConstraints(3, 10);
  
  // 創建母材（無限供應）
  const materials: Material[] = [
    materialService.addMaterial(6000),
    materialService.addMaterial(8000),
    materialService.addMaterial(10000),
    materialService.addMaterial(12000)
  ];
  
  console.log(`母材種類: ${materials.length} 種（無數量限制）`);
  materials.forEach(m => console.log(`  - 長度: ${m.length}mm`));
  
  // 批量創建零件
  console.log(`開始創建 ${partCount} 個零件...`);
  const startCreateTime = Date.now();
  const parts: Part[] = [];
  
  // 創建不同類型的零件
  const partConfigs = [
    { length: 500, angleProb: 0.3 },
    { length: 800, angleProb: 0.4 },
    { length: 1000, angleProb: 0.5 },
    { length: 1200, angleProb: 0.3 },
    { length: 1500, angleProb: 0.2 },
    { length: 2000, angleProb: 0.2 },
    { length: 2500, angleProb: 0.1 },
    { length: 3000, angleProb: 0.1 }
  ];
  
  for (let i = 0; i < partCount; i++) {
    const config = partConfigs[i % partConfigs.length];
    const hasAngles = Math.random() < config.angleProb;
    
    let angles = undefined;
    if (hasAngles) {
      // 根據業務規則生成有效的角度組合（0度表示無角度）
      const anglePatterns = [
        { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }, // 左上角有斜切
        { topLeft: 0, topRight: 45, bottomLeft: 0, bottomRight: 0 }, // 右上角有斜切
        { topLeft: 0, topRight: 0, bottomLeft: 45, bottomRight: 0 }, // 左下角有斜切
        { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 45 }, // 右下角有斜切
        { topLeft: 45, topRight: 45, bottomLeft: 0, bottomRight: 0 }, // 上方兩角有斜切
        { topLeft: 0, topRight: 0, bottomLeft: 45, bottomRight: 45 }, // 下方兩角有斜切
        { topLeft: 30, topRight: 0, bottomLeft: 0, bottomRight: 0 }, // 不同角度
        { topLeft: 0, topRight: 60, bottomLeft: 0, bottomRight: 0 }  // 不同角度
      ];
      angles = anglePatterns[Math.floor(Math.random() * anglePatterns.length)];
    }
    
    const part = partService.addPart(
      config.length + Math.floor(Math.random() * 200) - 100, // 加入一些長度變化
      1,
      angles
    );
    parts.push(part);
    
    // 每1000個零件顯示一次進度
    if ((i + 1) % 1000 === 0) {
      console.log(`  已創建 ${i + 1} / ${partCount} 個零件`);
    }
  }
  
  const createTime = Date.now() - startCreateTime;
  console.log(`零件創建完成，耗時: ${createTime}ms`);
  
  // 統計零件資訊
  const partsWithAngles = parts.filter(p => p.angles && Object.values(p.angles).some(a => a !== 90));
  console.log(`\n零件統計:`);
  console.log(`  總零件數: ${parts.length}`);
  console.log(`  有角度的零件: ${partsWithAngles.length} (${(partsWithAngles.length / parts.length * 100).toFixed(1)}%)`);
  
  // 執行優化
  console.log(`\n開始執行排版優化...`);
  console.log(`  材料數: ${materials.length}`);
  console.log(`  零件數: ${parts.length}`);
  const startOptimizeTime = Date.now();
  
  try {
    const cutPlans = v6CuttingService.optimizeCutting(materials, parts);
    const optimizeTime = Date.now() - startOptimizeTime;
    console.log(`  返回的切割計劃數: ${cutPlans.length}`);
    
    // 計算結果統計
    const totalParts = parts.length;
    const placedParts = cutPlans.reduce((sum, plan) => sum + (plan.cuts?.length || 0), 0);
    const totalWaste = cutPlans.reduce((sum, plan) => {
      const waste = plan.waste ?? plan.wasteLength ?? 0;
      return sum + (isFinite(waste) ? waste : 0);
    }, 0);
    const totalMaterialUsed = cutPlans.reduce((sum, plan) => sum + plan.materialLength, 0);
    const averageUtilization = totalMaterialUsed > 0 
      ? (totalMaterialUsed - totalWaste) / totalMaterialUsed 
      : 0;
    
    // 統計共刀
    const sharedCuts = cutPlans.reduce((sum, plan) => 
      sum + (plan.cuts?.filter(cut => cut.isSharedCut).length || 0), 0
    );
    
    // 輸出結果
    console.log(`\n排版優化完成！`);
    console.log(`\n結果統計:`);
    console.log(`  排版耗時: ${optimizeTime}ms (${(optimizeTime / 1000).toFixed(2)}秒)`);
    console.log(`  使用母材數量: ${cutPlans.length}`);
    console.log(`  已排版零件: ${placedParts} / ${totalParts} (${(placedParts / totalParts * 100).toFixed(1)}%)`);
    console.log(`  總體使用效率: ${(averageUtilization * 100).toFixed(2)}%`);
    console.log(`  總餘料長度: ${totalWaste.toFixed(2)}mm`);
    console.log(`  共刀切割數: ${sharedCuts}`);
    console.log(`  平均每秒處理零件數: ${(totalParts / (optimizeTime / 1000)).toFixed(0)} 個/秒`);
    
    // 檢查虛擬材料
    const virtualPlans = cutPlans.filter(plan => plan.isVirtual);
    if (virtualPlans.length > 0) {
      console.log(`\n注意: 系統創建了 ${virtualPlans.length} 個虛擬材料以確保所有零件都被排版`);
    }
    
    // 生成優化報告
    const report = v6CuttingService.getOptimizationReport(materials, parts);
    console.log(`\n${report}`);
    
  } catch (error) {
    console.error(`\n排版失敗:`, error);
    throw error;
  }
}

// 如果直接執行此檔案
if (require.main === module) {
  testLargeDataset(50000)
    .then(() => {
      console.log('\n測試完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('測試失敗:', error);
      process.exit(1);
    });
}

// Jest 測試
describe('Large Dataset Performance Test', () => {
  it('should handle 50000 parts efficiently', async () => {
    await testLargeDataset(50000);
  }, 600000); // 10分鐘超時
});