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

    it('所有新增的材料都是無限供應', () => {
      const material = service.addMaterial(6000);
      
      expect(material.quantity).toBe(0); // 無限供應
      expect(material.length).toBe(6000);
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

    it('所有材料都是無限供應', () => {
      const material1 = service.addMaterial(6000);
      const material2 = service.addMaterial(9000);
      const material3 = service.addMaterial(12000);

      const allMaterials = service.getAllMaterials();
      
      expect(allMaterials).toHaveLength(3);
      expect(material1.quantity).toBe(0);
      expect(material2.quantity).toBe(0);
      expect(material3.quantity).toBe(0);
    });
  });

  describe('相容性測試', () => {
    it('addMaterial 方法應該正常運作', () => {
      const material = service.addMaterial(6000);
      
      // 應該維持無限供應行為
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

    it('移除材料功能應該正常運作', () => {
      const material = service.addMaterial(6000);
      const result = service.removeMaterial(material.id);
      
      expect(result).toBe(true);
      expect(service.getMaterial(material.id)).toBeUndefined();
    });

    it('清除所有材料功能應該正常運作', () => {
      service.addMaterial(6000);
      service.addMaterial(9000);
      
      expect(service.getAllMaterials()).toHaveLength(2);
      
      service.clearAllMaterials();
      
      expect(service.getAllMaterials()).toHaveLength(0);
    });
  });
});