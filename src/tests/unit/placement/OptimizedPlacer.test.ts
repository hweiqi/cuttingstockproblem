import { OptimizedPlacer } from '../../../placement/OptimizedPlacer';
import { PartWithQuantity } from '../../../core/v6/models/Part';
import { Material } from '../../../core/v6/models/Material';

describe('OptimizedPlacer - 優化排版邏輯測試', () => {
  let placer: OptimizedPlacer;
  
  beforeEach(() => {
    placer = new OptimizedPlacer({
      cuttingLoss: 5,
      frontEndLoss: 20,
      backEndLoss: 15,
      minPartSpacing: 0
    });
  });

  describe('基本功能測試', () => {
    it('應該正確初始化', () => {
      expect(placer).toBeDefined();
      expect(placer).toBeInstanceOf(OptimizedPlacer);
    });

    it('應該處理空零件列表', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 1 }
      ];
      const parts: PartWithQuantity[] = [];
      
      const result = placer.placeParts(parts, materials);
      
      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(0);
      expect(result.unplacedParts).toHaveLength(0);
    });

    it('應該處理空材料列表', () => {
      const materials: Material[] = [];
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 1000, quantity: 1 }
      ];
      
      const result = placer.placeParts(parts, materials);
      
      expect(result.success).toBe(true);
      expect(result.virtualMaterialsCreated).toBeGreaterThan(0);
      expect(result.placedParts).toHaveLength(1);
    });
  });

  describe('材料使用優化測試', () => {
    it('應該在一個材料上放置多個零件，而不是每個材料只放一個', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 5 }
      ];
      
      // 10個1000mm的零件，理論上可以在2個6000mm材料上排完
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 1000, quantity: 10 }
      ];
      
      const result = placer.placeParts(parts, materials);
      
      // 計算實際使用的材料數量
      const usedMaterialIds = new Set(
        result.placedParts.map(p => `${p.materialId}_${p.materialInstanceId}`)
      );
      
      // 應該使用2-3個材料，而不是10個
      expect(usedMaterialIds.size).toBeLessThanOrEqual(3);
      expect(usedMaterialIds.size).toBeGreaterThan(1);
      
      // 檢查每個材料上的零件數量
      const partsPerMaterial = new Map<string, number>();
      result.placedParts.forEach(part => {
        const key = `${part.materialId}_${part.materialInstanceId}`;
        partsPerMaterial.set(key, (partsPerMaterial.get(key) || 0) + 1);
      });
      
      // 至少有一個材料放置了多個零件
      const maxPartsOnMaterial = Math.max(...Array.from(partsPerMaterial.values()));
      expect(maxPartsOnMaterial).toBeGreaterThan(1);
    });

    it('應該最大化材料利用率', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 2 }
      ];
      
      // 設計可以完美填充的零件組合
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 2000, quantity: 3 },
        { id: 'part-2', length: 1500, quantity: 2 },
        { id: 'part-3', length: 1000, quantity: 2 }
      ];
      
      const result = placer.placeParts(parts, materials);
      
      // 檢查材料利用率
      expect(result.report.materialUtilization).toBeGreaterThan(0.8);
      expect(result.virtualMaterialsCreated).toBe(0);
    });

    it('應該優先填滿現有材料再使用新材料', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 3 }
      ];
      
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 2900, quantity: 6 } // 每個材料可放2個
      ];
      
      const result = placer.placeParts(parts, materials);
      
      // 應該正好使用3個材料
      const usedMaterials = result.usedMaterials.filter(m => !m.material.isVirtual);
      expect(usedMaterials.length).toBe(3);
      
      // 每個材料的利用率應該很高
      usedMaterials.forEach(mat => {
        expect(mat.utilization).toBeGreaterThan(0.95);
      });
    });
  });

  describe('複雜場景測試', () => {
    it('應該處理混合尺寸的零件優化排版', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 12000, quantity: 3 }
      ];
      
      const parts: PartWithQuantity[] = [
        { id: 'large', length: 5000, quantity: 3 },
        { id: 'medium', length: 3000, quantity: 4 },
        { id: 'small', length: 1500, quantity: 6 }
      ];
      
      const result = placer.placeParts(parts, materials);
      
      // 檢查是否有效混合不同尺寸
      const materialContents = new Map<string, Set<string>>();
      result.placedParts.forEach(part => {
        const matKey = `${part.materialId}_${part.materialInstanceId}`;
        if (!materialContents.has(matKey)) {
          materialContents.set(matKey, new Set());
        }
        materialContents.get(matKey)!.add(part.partId);
      });
      
      // 至少有一個材料包含不同類型的零件
      let hasMixedMaterial = false;
      materialContents.forEach(partTypes => {
        if (partTypes.size > 1) {
          hasMixedMaterial = true;
        }
      });
      
      expect(hasMixedMaterial).toBe(true);
    });

    it('應該處理無法完美填充的情況', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 2 }
      ];
      
      // 故意設計無法完美填充的零件
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 2700, quantity: 4 } // 每個材料只能放2個，有浪費
      ];
      
      const result = placer.placeParts(parts, materials);
      
      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(4);
      
      // 檢查是否最小化了材料使用
      const usedMaterialCount = new Set(
        result.placedParts.map(p => `${p.materialId}_${p.materialInstanceId}`)
      ).size;
      expect(usedMaterialCount).toBe(2);
    });

    it('應該正確處理零件長度接近材料長度的情況', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 3 }
      ];
      
      // 5960 = 6000 - 20(前) - 15(後) - 5(切割)
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 5960, quantity: 3 }
      ];
      
      const result = placer.placeParts(parts, materials);
      
      // 每個材料只能放一個零件
      expect(result.placedParts).toHaveLength(3);
      expect(result.virtualMaterialsCreated).toBe(0);
      
      // 每個零件應該在不同的材料上
      const materialUsage = new Set(
        result.placedParts.map(p => `${p.materialId}_${p.materialInstanceId}`)
      );
      expect(materialUsage.size).toBe(3);
    });
  });

  describe('共刀鏈整合測試', () => {
    it('應該保持共刀鏈在同一材料上', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 9000, quantity: 2 }
      ];
      
      const parts: PartWithQuantity[] = [
        { 
          id: 'part-1', 
          length: 2000, 
          quantity: 2,
          angles: { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 }
        },
        { 
          id: 'part-2', 
          length: 2000, 
          quantity: 2,
          angles: { topLeft: 0, topRight: 45, bottomLeft: 0, bottomRight: 0 }
        }
      ];
      
      const chains = [{
        id: 'chain-1',
        parts: [
          { partId: 'part-1', instanceId: 0 },
          { partId: 'part-2', instanceId: 0 }
        ],
        connections: [{
          type: 'AngleMatch' as const,
          part1Index: 0,
          part2Index: 1,
          sharedAngle: 45,
          savings: 50
        }],
        totalSavings: 50
      }];
      
      const result = placer.placePartsWithChains(parts, materials, chains);
      
      // 共刀鏈的零件應該在同一材料上
      const chainParts = result.placedParts.filter(p => 
        (p.partId === 'part-1' && p.partInstanceId === 0) ||
        (p.partId === 'part-2' && p.partInstanceId === 0)
      );
      
      expect(chainParts[0].materialId).toBe(chainParts[1].materialId);
      expect(chainParts[0].materialInstanceId).toBe(chainParts[1].materialInstanceId);
    });
  });

  describe('邊界條件測試', () => {
    it('應該處理超長零件', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 1 }
      ];
      
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 20000, quantity: 1 } // 超過所有標準長度
      ];
      
      const result = placer.placeParts(parts, materials);
      
      expect(result.virtualMaterialsCreated).toBeGreaterThan(0);
      expect(result.placedParts).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('應該處理大量小零件', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 2 }
      ];
      
      const parts: PartWithQuantity[] = [
        { id: 'small', length: 100, quantity: 100 }
      ];
      
      const result = placer.placeParts(parts, materials);
      
      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(100);
      
      // 檢查是否有效利用材料
      const usedMaterials = new Set(
        result.placedParts.map(p => `${p.materialId}_${p.materialInstanceId}`)
      );
      expect(usedMaterials.size).toBeLessThan(10); // 不應該用太多材料
    });

    it('應該處理零件總長度遠超材料總長度的情況', () => {
      const materials: Material[] = [
        { id: 'mat-1', length: 6000, quantity: 1 }
      ];
      
      const parts: PartWithQuantity[] = [
        { id: 'part-1', length: 2000, quantity: 10 } // 總長20000，遠超6000
      ];
      
      const result = placer.placeParts(parts, materials);
      
      expect(result.virtualMaterialsCreated).toBeGreaterThan(0);
      expect(result.placedParts).toHaveLength(10);
      expect(result.success).toBe(true);
    });
  });

  describe('性能測試', () => {
    it('應該在合理時間內處理大規模數據', () => {
      const materials: Material[] = [];
      for (let i = 0; i < 20; i++) {
        materials.push({ id: `mat-${i}`, length: 12000, quantity: 5 });
      }
      
      const parts: PartWithQuantity[] = [];
      for (let i = 0; i < 50; i++) {
        parts.push({
          id: `part-${i}`,
          length: 1000 + (i * 100),
          quantity: 3
        });
      }
      
      const startTime = performance.now();
      const result = placer.placeParts(parts, materials);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      expect(result.placedParts).toHaveLength(150); // 50 * 3
      expect(endTime - startTime).toBeLessThan(1000); // 應該在1秒內完成
    });
  });
});