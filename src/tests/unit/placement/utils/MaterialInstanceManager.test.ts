import { MaterialInstanceManager } from '../../../../placement/utils/MaterialInstanceManager';
import { Material } from '../../../../core/v6/models/Material';
import { PackingItem } from '../../../../placement/interfaces/IPackingStrategy';

describe('MaterialInstanceManager', () => {
  let manager: MaterialInstanceManager;

  beforeEach(() => {
    manager = new MaterialInstanceManager();
  });

  describe('initializeInstances', () => {
    it('應該為無限供應材料創建單個初始實例', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 0 }
      ];

      const instances = manager.initializeInstances(materials);

      expect(instances).toHaveLength(1);
      expect(instances[0].material.id).toBe('M1_0');
      expect(instances[0].material.isUnlimited).toBe(true);
      expect(instances[0].usedLength).toBe(0);
    });

    it('應該為有限供應材料創建指定數量的實例', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 3 }
      ];

      const instances = manager.initializeInstances(materials);

      expect(instances).toHaveLength(3);
      expect(instances[0].material.id).toBe('M1_0');
      expect(instances[1].material.id).toBe('M1_1');
      expect(instances[2].material.id).toBe('M1_2');
      expect(instances[0].material.isUnlimited).toBe(false);
    });

    it('應該按長度降序排序材料', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 1 },
        { id: 'M2', length: 12000, quantity: 1 },
        { id: 'M3', length: 9000, quantity: 1 }
      ];

      const instances = manager.initializeInstances(materials);

      expect(instances[0].material.length).toBe(12000);
      expect(instances[1].material.length).toBe(9000);
      expect(instances[2].material.length).toBe(6000);
    });

    it('應該處理空材料列表', () => {
      const materials: Material[] = [];

      const instances = manager.initializeInstances(materials);

      expect(instances).toHaveLength(0);
    });
  });

  describe('addNewInstances', () => {
    it('應該為無限供應材料添加新實例', () => {
      const existingInstances = [
        { material: { id: 'M1_0', originalId: 'M1', length: 6000, quantity: 0, isUnlimited: true }, instanceId: 0, usedLength: 0 }
      ];
      const originalMaterials: Material[] = [
        { id: 'M1', length: 6000, quantity: 0 }
      ];
      const item: PackingItem = {
        instance: { part: { id: 'P1', length: 2000, angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 }, thickness: 20 }, instanceId: 0 },
        requiredLength: 2040,
        actualLength: 2000
      };

      const newInstances = manager.addNewInstances(existingInstances, originalMaterials, item);

      expect(newInstances.length).toBeGreaterThan(0);
      expect(newInstances[0].material.originalId).toBe('M1');
      expect(newInstances[0].material.isUnlimited).toBe(true);
    });

    it('不應該為有限供應材料添加新實例', () => {
      const existingInstances = [
        { material: { id: 'M1_0', originalId: 'M1', length: 6000, isUnlimited: false }, instanceId: 0, usedLength: 0 }
      ];
      const originalMaterials: Material[] = [
        { id: 'M1', length: 6000, quantity: 1 }
      ];
      const item: PackingItem = {
        instance: { part: { id: 'P1', length: 2000, angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 }, thickness: 20 }, instanceId: 0 },
        requiredLength: 2040,
        actualLength: 2000
      };

      const newInstances = manager.addNewInstances(existingInstances, originalMaterials, item);

      expect(newInstances).toHaveLength(0);
    });

    it('應該只選擇足夠長的材料', () => {
      const existingInstances: any[] = [];
      const originalMaterials: Material[] = [
        { id: 'M1', length: 3000, quantity: 0 },
        { id: 'M2', length: 6000, quantity: 0 }
      ];
      const item: PackingItem = {
        instance: { part: { id: 'P1', length: 4000, angles: {}, thickness: 20 }, instanceId: 0 },
        requiredLength: 4040,
        actualLength: 4000
      };

      const newInstances = manager.addNewInstances(existingInstances, originalMaterials, item);

      expect(newInstances.every(inst => inst.material.length >= 4040)).toBe(true);
      expect(newInstances.some(inst => inst.material.originalId === 'M2')).toBe(true);
      expect(newInstances.some(inst => inst.material.originalId === 'M1')).toBe(false);
    });

    it('應該創建多個實例批次', () => {
      const existingInstances: any[] = [];
      const originalMaterials: Material[] = [
        { id: 'M1', length: 6000, quantity: 0 }
      ];
      const item: PackingItem = {
        instance: { part: { id: 'P1', length: 2000, angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 }, thickness: 20 }, instanceId: 0 },
        requiredLength: 2040,
        actualLength: 2000
      };

      const newInstances = manager.addNewInstances(existingInstances, originalMaterials, item);

      expect(newInstances.length).toBeGreaterThanOrEqual(1);
      expect(newInstances.length).toBeLessThanOrEqual(10); // MAX_BATCH_COUNT
    });
  });

  describe('canAddNewInstance', () => {
    it('應該允許為無限供應且足夠長的材料添加實例', () => {
      const material: Material = { id: 'M1', length: 6000, quantity: 0 };
      
      const result = manager.canAddNewInstance(material, 5000);
      
      expect(result).toBe(true);
    });

    it('不應該允許為有限供應材料添加實例', () => {
      const material: Material = { id: 'M1', length: 6000, quantity: 5 };
      
      const result = manager.canAddNewInstance(material, 5000);
      
      expect(result).toBe(false);
    });

    it('不應該允許為太短的材料添加實例', () => {
      const material: Material = { id: 'M1', length: 6000, quantity: 0 };
      
      const result = manager.canAddNewInstance(material, 7000);
      
      expect(result).toBe(false);
    });
  });
});