import { OptimizedMaterialManager } from '../../../placement/OptimizedMaterialManager';
import { Material } from '../../../core/v6/models/Material';
import { PackingItem } from '../../../placement/interfaces/IPackingStrategy';

describe('OptimizedMaterialManager', () => {
  let manager: OptimizedMaterialManager;

  beforeEach(() => {
    manager = new OptimizedMaterialManager();
  });

  describe('材料實例創建', () => {
    test('應該積極創建材料實例以容納所有零件', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000 },
        { id: 'M2', length: 9000 },
        { id: 'M3', length: 12000 }
      ];

      const items: PackingItem[] = [];
      // 創建100個需要放置的項目
      for (let i = 0; i < 100; i++) {
        items.push({
          part: {
            id: `P${i}`,
            length: 1000,
            quantity: 1,
            angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
            thickness: 20
          },
          instanceId: 0,
          actualLength: 1010, // 包含切割損耗
          sharedCut: null
        });
      }

      const instances = manager.createMaterialInstances(materials, items);

      // 應該創建足夠的材料實例
      const totalCapacity = instances.reduce((sum, inst) => 
        sum + inst.material.length, 0
      );
      const totalRequired = items.reduce((sum, item) => 
        sum + item.actualLength, 0
      );

      expect(totalCapacity).toBeGreaterThanOrEqual(totalRequired);
      expect(instances.length).toBeGreaterThan(5); // 至少需要超過5個實例
    });

    test('應該優先使用較長的材料', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000 },
        { id: 'M2', length: 12000 },
        { id: 'M3', length: 9000 }
      ];

      const items: PackingItem[] = [
        {
          part: {
            id: 'P1',
            length: 10000,
            quantity: 1,
            angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
            thickness: 20
          },
          instanceId: 0,
          actualLength: 10010,
          sharedCut: null
        }
      ];

      const instances = manager.createMaterialInstances(materials, items);

      // 應該選擇M2（12000mm）來容納10010mm的零件
      expect(instances[0].material.id).toBe('M2');
    });

    test('應該批量創建材料實例', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000 }
      ];

      const items: PackingItem[] = [];
      // 創建50個項目，每個需要2000mm
      for (let i = 0; i < 50; i++) {
        items.push({
          part: {
            id: `P${i}`,
            length: 2000,
            quantity: 1,
            angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
            thickness: 20
          },
          instanceId: 0,
          actualLength: 2010,
          sharedCut: null
        });
      }

      const startTime = performance.now();
      const instances = manager.createMaterialInstances(materials, items);
      const endTime = performance.now();

      // 每個6000mm材料可以放2個2010mm的零件
      // 50個零件需要至少25個材料實例
      expect(instances.length).toBeGreaterThanOrEqual(25);
      
      // 效能要求：應在10ms內完成
      expect(endTime - startTime).toBeLessThan(10);
    });

    test('應該考慮材料數量限制', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 3 }, // 限制為3個
        { id: 'M2', length: 6000 } // 無限供應，相同長度以測試數量限制
      ];

      const items: PackingItem[] = [];
      // 創建需要超過3個M1材料的項目
      for (let i = 0; i < 20; i++) {
        items.push({
          part: {
            id: `P${i}`,
            length: 2000,
            quantity: 1,
            angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
            thickness: 20
          },
          instanceId: 0,
          actualLength: 2010,
          sharedCut: null
        });
      }

      const instances = manager.createMaterialInstances(materials, items);

      // 應該只創建3個M1實例
      const m1Count = instances.filter(inst => inst.material.id === 'M1').length;
      expect(m1Count).toBe(3);

      // 其餘應該使用M2
      const m2Count = instances.filter(inst => inst.material.id === 'M2').length;
      expect(m2Count).toBeGreaterThan(0);
    });

    test('應該預估需要的材料實例數量', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000 }
      ];

      const items: PackingItem[] = [];
      // 創建不同長度的項目
      const lengths = [1000, 1500, 2000, 2500, 3000];
      for (let i = 0; i < 100; i++) {
        const length = lengths[i % lengths.length];
        items.push({
          part: {
            id: `P${i}`,
            length,
            quantity: 1,
            angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
            thickness: 20
          },
          instanceId: 0,
          actualLength: length + 10,
          sharedCut: null
        });
      }

      const count = manager.estimateRequiredInstances(materials[0], items);
      
      // 應該有合理的估算
      expect(count).toBeGreaterThan(30);
      expect(count).toBeLessThan(60);
    });

    test('應該支援混合材料策略', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000, quantity: 2 },  // 限制數量，強制使用其他材料
        { id: 'M2', length: 9000, quantity: 2 },  // 限制數量
        { id: 'M3', length: 12000 }               // 無限供應
      ];

      const items: PackingItem[] = [];
      // 創建不同長度需求的項目
      const configs = [
        { count: 10, length: 5000 },  // 適合M1，但M1只有2個
        { count: 10, length: 7000 },  // 適合M2，但M2只有2個
        { count: 10, length: 10000 }, // 適合M3
      ];

      for (const config of configs) {
        for (let i = 0; i < config.count; i++) {
          items.push({
            part: {
              id: `P${config.length}_${i}`,
              length: config.length,
              quantity: 1,
              angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
              thickness: 20
            },
            instanceId: 0,
            actualLength: config.length + 10,
            sharedCut: null
          });
        }
      }

      const instances = manager.createMaterialInstances(materials, items);

      // 應該使用所有三種材料類型
      const usedMaterialTypes = new Set(instances.map(inst => inst.material.id));
      expect(usedMaterialTypes.size).toBe(3);
    });
  });

  describe('動態擴展', () => {
    test('應該支援動態添加材料實例', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000 }
      ];

      const unplacedItems: PackingItem[] = [
        {
          part: {
            id: 'P1',
            length: 2000,
            quantity: 1,
            angles: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
            thickness: 20
          },
          instanceId: 0,
          actualLength: 2010,
          sharedCut: null
        }
      ];

      const existingCount = 5;
      const newInstances = manager.createAdditionalInstances(
        materials,
        unplacedItems,
        existingCount
      );

      // 應該創建新實例
      expect(newInstances.length).toBeGreaterThan(0);
      // 實例ID應該從現有數量開始
      expect(newInstances[0].instanceId).toBe(existingCount);
    });
  });
});