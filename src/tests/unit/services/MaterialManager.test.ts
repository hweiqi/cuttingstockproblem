/**
 * 母材管理系統測試
 */

import { MaterialManager } from '../../../services/MaterialManager';
import { Material } from '../../../types/core';

describe('MaterialManager', () => {
  let materialManager: MaterialManager;

  beforeEach(() => {
    materialManager = new MaterialManager();
  });

  describe('addMaterial', () => {
    test('應該能新增母材', () => {
      const material = materialManager.addMaterial(6000);
      
      expect(material.id).toBeDefined();
      expect(material.length).toBe(6000);
      expect(materialManager.getAllMaterials()).toHaveLength(1);
    });

    test('應該為每個母材生成唯一ID', () => {
      const material1 = materialManager.addMaterial(6000);
      const material2 = materialManager.addMaterial(4000);
      
      expect(material1.id).not.toBe(material2.id);
    });

    test('應該拒絕重複的長度', () => {
      materialManager.addMaterial(6000);
      
      expect(() => {
        materialManager.addMaterial(6000);
      }).toThrow('母材長度不可重複');
    });

    test('應該拒絕無效的長度', () => {
      expect(() => {
        materialManager.addMaterial(0);
      }).toThrow('母材長度必須大於0');

      expect(() => {
        materialManager.addMaterial(-100);
      }).toThrow('母材長度必須大於0');
    });

    test('應該拒絕非數字的長度', () => {
      expect(() => {
        materialManager.addMaterial(NaN);
      }).toThrow('母材長度必須為有效數字');

      expect(() => {
        materialManager.addMaterial(Infinity);
      }).toThrow('母材長度必須為有效數字');
    });
  });

  describe('removeMaterial', () => {
    test('應該能移除母材', () => {
      const material = materialManager.addMaterial(6000);
      expect(materialManager.getAllMaterials()).toHaveLength(1);
      
      const removed = materialManager.removeMaterial(material.id);
      expect(removed).toBe(true);
      expect(materialManager.getAllMaterials()).toHaveLength(0);
    });

    test('移除不存在的母材應該返回false', () => {
      const removed = materialManager.removeMaterial('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('getMaterialById', () => {
    test('應該能根據ID獲取母材', () => {
      const material = materialManager.addMaterial(6000);
      
      const found = materialManager.getMaterialById(material.id);
      expect(found).toEqual(material);
    });

    test('獲取不存在的母材應該返回undefined', () => {
      const found = materialManager.getMaterialById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('hasMaterialWithLength', () => {
    test('應該能檢查是否存在指定長度的母材', () => {
      materialManager.addMaterial(6000);
      
      expect(materialManager.hasMaterialWithLength(6000)).toBe(true);
      expect(materialManager.hasMaterialWithLength(4000)).toBe(false);
    });
  });

  describe('getAllMaterials', () => {
    test('應該返回所有母材', () => {
      expect(materialManager.getAllMaterials()).toHaveLength(0);
      
      materialManager.addMaterial(6000);
      materialManager.addMaterial(4000);
      materialManager.addMaterial(3000);
      
      const materials = materialManager.getAllMaterials();
      expect(materials).toHaveLength(3);
      expect(materials.map(m => m.length).sort()).toEqual([3000, 4000, 6000]);
    });

    test('返回的母材列表應該是副本', () => {
      materialManager.addMaterial(6000);
      const materials1 = materialManager.getAllMaterials();
      const materials2 = materialManager.getAllMaterials();
      
      expect(materials1).not.toBe(materials2);  // 不是同一個對象
      expect(materials1).toEqual(materials2);   // 但內容相同
    });
  });

  describe('clearAll', () => {
    test('應該能清空所有母材', () => {
      materialManager.addMaterial(6000);
      materialManager.addMaterial(4000);
      expect(materialManager.getAllMaterials()).toHaveLength(2);
      
      materialManager.clearAll();
      expect(materialManager.getAllMaterials()).toHaveLength(0);
    });
  });

  describe('getCount', () => {
    test('應該返回正確的母材數量', () => {
      expect(materialManager.getCount()).toBe(0);
      
      materialManager.addMaterial(6000);
      expect(materialManager.getCount()).toBe(1);
      
      materialManager.addMaterial(4000);
      expect(materialManager.getCount()).toBe(2);
      
      materialManager.removeMaterial(materialManager.getAllMaterials()[0].id);
      expect(materialManager.getCount()).toBe(1);
    });
  });

  describe('updateMaterial', () => {
    test('應該能更新母材長度', () => {
      const material = materialManager.addMaterial(6000);
      
      const updated = materialManager.updateMaterial(material.id, 5000);
      expect(updated).toBe(true);
      
      const found = materialManager.getMaterialById(material.id);
      expect(found?.length).toBe(5000);
    });

    test('更新時應該檢查長度重複', () => {
      const material1 = materialManager.addMaterial(6000);
      materialManager.addMaterial(4000);
      
      expect(() => {
        materialManager.updateMaterial(material1.id, 4000);
      }).toThrow('母材長度不可重複');
    });

    test('更新不存在的母材應該返回false', () => {
      const updated = materialManager.updateMaterial('non-existent-id', 5000);
      expect(updated).toBe(false);
    });

    test('更新時應該驗證新長度', () => {
      const material = materialManager.addMaterial(6000);
      
      expect(() => {
        materialManager.updateMaterial(material.id, 0);
      }).toThrow('母材長度必須大於0');

      expect(() => {
        materialManager.updateMaterial(material.id, NaN);
      }).toThrow('母材長度必須為有效數字');
    });
  });

  describe('複雜場景測試', () => {
    test('應該能處理多種長度的母材', () => {
      const lengths = [6000, 4000, 3000, 2400, 1800];
      const materials: Material[] = [];
      
      // 添加所有長度
      for (const length of lengths) {
        materials.push(materialManager.addMaterial(length));
      }
      
      expect(materialManager.getCount()).toBe(5);
      
      // 驗證所有長度都存在
      for (const length of lengths) {
        expect(materialManager.hasMaterialWithLength(length)).toBe(true);
      }
      
      // 移除一些材料
      materialManager.removeMaterial(materials[1].id);  // 移除4000
      materialManager.removeMaterial(materials[3].id);  // 移除2400
      
      expect(materialManager.getCount()).toBe(3);
      expect(materialManager.hasMaterialWithLength(4000)).toBe(false);
      expect(materialManager.hasMaterialWithLength(2400)).toBe(false);
      expect(materialManager.hasMaterialWithLength(6000)).toBe(true);
    });

    test('應該能處理大量母材', () => {
      const materials: Material[] = [];
      
      // 添加100種不同長度的母材
      for (let i = 1; i <= 100; i++) {
        materials.push(materialManager.addMaterial(i * 100));
      }
      
      expect(materialManager.getCount()).toBe(100);
      
      // 驗證所有材料都存在
      for (let i = 1; i <= 100; i++) {
        expect(materialManager.hasMaterialWithLength(i * 100)).toBe(true);
      }
    });
  });
});