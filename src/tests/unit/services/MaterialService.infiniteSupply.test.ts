import { MaterialService } from '../../../services/MaterialService';

describe('MaterialService 無限供應測試', () => {
  let service: MaterialService;

  beforeEach(() => {
    service = new MaterialService();
  });

  describe('預設材料行為', () => {
    it('新增材料時應該預設為無限供應', () => {
      const material = service.addMaterial(6000);
      
      expect(material.quantity).toBe(0); // 0 表示無限供應
      expect(material.length).toBe(6000);
      expect(material.id).toBeDefined();
    });

    it('可以設定特定數量的材料', () => {
      const material = service.addMaterialWithQuantity(6000, 5);
      
      expect(material.quantity).toBe(5);
      expect(material.length).toBe(6000);
      expect(material.id).toBeDefined();
    });

    it('設定數量為0時應該是無限供應', () => {
      const material = service.addMaterialWithQuantity(6000, 0);
      
      expect(material.quantity).toBe(0); // 無限供應
      expect(material.length).toBe(6000);
    });

    it('設定負數量時應該拋出錯誤', () => {
      expect(() => {
        service.addMaterialWithQuantity(6000, -1);
      }).toThrow('材料數量不能為負數');
    });
  });

  describe('材料列表行為', () => {
    it('多種無限供應材料應該都可以新增', () => {
      const material1 = service.addMaterial(6000);
      const material2 = service.addMaterial(9000);
      const material3 = service.addMaterial(12000);

      const allMaterials = service.getAllMaterials();
      
      expect(allMaterials).toHaveLength(3);
      expect(allMaterials.every(m => m.quantity === 0)).toBe(true);
      
      // 確認長度不重複
      const lengths = allMaterials.map(m => m.length);
      expect(new Set(lengths).size).toBe(3);
    });

    it('有限和無限材料可以混合使用', () => {
      const infinite1 = service.addMaterial(6000); // 無限
      const finite1 = service.addMaterialWithQuantity(9000, 5); // 有限
      const infinite2 = service.addMaterial(12000); // 無限

      const allMaterials = service.getAllMaterials();
      
      expect(allMaterials).toHaveLength(3);
      expect(infinite1.quantity).toBe(0);
      expect(finite1.quantity).toBe(5);
      expect(infinite2.quantity).toBe(0);
    });
  });

  describe('更新材料行為', () => {
    it('可以更新材料的數量設定', () => {
      const material = service.addMaterialWithQuantity(6000, 5);
      const updated = service.updateMaterialQuantity(material.id, 0); // 改為無限供應

      expect(updated?.quantity).toBe(0);
      expect(updated?.length).toBe(6000);
    });

    it('更新不存在的材料應該返回undefined', () => {
      const result = service.updateMaterialQuantity('non-existent', 10);
      expect(result).toBeUndefined();
    });
  });

  describe('相容性測試', () => {
    it('舊的 addMaterial 方法應該保持相容', () => {
      const material = service.addMaterial(6000);
      
      // 應該與新版本行為一致
      expect(material.quantity).toBe(0);
      expect(material.length).toBe(6000);
      expect(material.id).toBeDefined();
    });

    it('獲取材料的方法應該正常運作', () => {
      const material = service.addMaterial(6000);
      const retrieved = service.getMaterial(material.id);
      
      expect(retrieved).toEqual(material);
      expect(retrieved?.quantity).toBe(0);
    });
  });
});