/**
 * 零件管理系統測試
 */

import { PartManager } from '../../../services/PartManager';
import { Part, PartAngles } from '../../../types/core';

describe('PartManager', () => {
  let partManager: PartManager;

  beforeEach(() => {
    partManager = new PartManager();
  });

  describe('addPart', () => {
    test('應該能新增零件', () => {
      const angles: PartAngles = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 30
      };

      const part = partManager.addPart(1200, 5, angles);
      
      expect(part.id).toBeDefined();
      expect(part.length).toBe(1200);
      expect(part.quantity).toBe(5);
      expect(part.angles).toEqual(angles);
      expect(part.thickness).toBe(10); // 預設厚度
      expect(partManager.getAllParts()).toHaveLength(1);
    });

    test('應該能指定厚度', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      const part = partManager.addPart(1200, 5, angles, 20);
      expect(part.thickness).toBe(20);
    });

    test('應該為每個零件生成唯一ID', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      const part1 = partManager.addPart(1200, 5, angles);
      const part2 = partManager.addPart(1500, 3, angles);
      
      expect(part1.id).not.toBe(part2.id);
    });

    test('應該允許相同規格的零件重複添加', () => {
      const angles: PartAngles = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      partManager.addPart(1200, 5, angles);
      partManager.addPart(1200, 5, angles); // 相同規格，應該被允許
      
      expect(partManager.getAllParts()).toHaveLength(2);
    });

    test('應該拒絕無效的長度', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      expect(() => {
        partManager.addPart(0, 5, angles);
      }).toThrow('零件長度必須大於0');

      expect(() => {
        partManager.addPart(-100, 5, angles);
      }).toThrow('零件長度必須大於0');

      expect(() => {
        partManager.addPart(NaN, 5, angles);
      }).toThrow('零件長度必須為有效數字');
    });

    test('應該拒絕無效的數量', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      expect(() => {
        partManager.addPart(1200, 0, angles);
      }).toThrow('零件數量必須大於0');

      expect(() => {
        partManager.addPart(1200, -5, angles);
      }).toThrow('零件數量必須大於0');

      expect(() => {
        partManager.addPart(1200, NaN, angles);
      }).toThrow('零件數量必須為有效數字');
    });

    test('應該拒絕無效的厚度', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      expect(() => {
        partManager.addPart(1200, 5, angles, 0);
      }).toThrow('零件厚度必須大於0');

      expect(() => {
        partManager.addPart(1200, 5, angles, -10);
      }).toThrow('零件厚度必須大於0');

      expect(() => {
        partManager.addPart(1200, 5, angles, NaN);
      }).toThrow('零件厚度必須為有效數字');
    });

    test('應該驗證角度的有效性', () => {
      // 無效角度
      const invalidAngles: PartAngles = {
        topLeft: 90,  // 不允許90度
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      expect(() => {
        partManager.addPart(1200, 5, invalidAngles);
      }).toThrow();
    });

    test('應該驗證角度組合的限制', () => {
      // 左側同時有上下角度
      const leftConflictAngles: PartAngles = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 30,  // 與topLeft衝突
        bottomRight: 0
      };

      expect(() => {
        partManager.addPart(1200, 5, leftConflictAngles);
      }).toThrow();
    });
  });

  describe('removePart', () => {
    test('應該能移除零件', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      const part = partManager.addPart(1200, 5, angles);
      expect(partManager.getAllParts()).toHaveLength(1);
      
      const removed = partManager.removePart(part.id);
      expect(removed).toBe(true);
      expect(partManager.getAllParts()).toHaveLength(0);
    });

    test('移除不存在的零件應該返回false', () => {
      const removed = partManager.removePart('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('getPartById', () => {
    test('應該能根據ID獲取零件', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      const part = partManager.addPart(1200, 5, angles);
      
      const found = partManager.getPartById(part.id);
      expect(found).toEqual(part);
    });

    test('獲取不存在的零件應該返回undefined', () => {
      const found = partManager.getPartById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('updatePart', () => {
    test('應該能更新零件', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      const part = partManager.addPart(1200, 5, angles);
      
      const newAngles: PartAngles = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 30
      };

      const updated = partManager.updatePart(part.id, {
        length: 1500,
        quantity: 8,
        angles: newAngles,
        thickness: 15
      });

      expect(updated).toBe(true);
      
      const found = partManager.getPartById(part.id);
      expect(found?.length).toBe(1500);
      expect(found?.quantity).toBe(8);
      expect(found?.angles).toEqual(newAngles);
      expect(found?.thickness).toBe(15);
    });

    test('更新不存在的零件應該返回false', () => {
      const updated = partManager.updatePart('non-existent-id', {
        length: 1500,
        quantity: 8
      });
      expect(updated).toBe(false);
    });

    test('更新時應該驗證新值', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      const part = partManager.addPart(1200, 5, angles);
      
      expect(() => {
        partManager.updatePart(part.id, { length: 0 });
      }).toThrow();

      expect(() => {
        partManager.updatePart(part.id, { quantity: -1 });
      }).toThrow();
    });
  });

  describe('getAllParts', () => {
    test('應該返回所有零件', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      expect(partManager.getAllParts()).toHaveLength(0);
      
      partManager.addPart(1200, 5, angles);
      partManager.addPart(1500, 3, angles);
      partManager.addPart(800, 10, angles);
      
      const parts = partManager.getAllParts();
      expect(parts).toHaveLength(3);
    });

    test('返回的零件列表應該是副本', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      partManager.addPart(1200, 5, angles);
      const parts1 = partManager.getAllParts();
      const parts2 = partManager.getAllParts();
      
      expect(parts1).not.toBe(parts2);  // 不是同一個對象
      expect(parts1).toEqual(parts2);   // 但內容相同
    });
  });

  describe('clearAll', () => {
    test('應該能清空所有零件', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      partManager.addPart(1200, 5, angles);
      partManager.addPart(1500, 3, angles);
      expect(partManager.getAllParts()).toHaveLength(2);
      
      partManager.clearAll();
      expect(partManager.getAllParts()).toHaveLength(0);
    });
  });

  describe('getCount', () => {
    test('應該返回正確的零件數量', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      expect(partManager.getCount()).toBe(0);
      
      partManager.addPart(1200, 5, angles);
      expect(partManager.getCount()).toBe(1);
      
      partManager.addPart(1500, 3, angles);
      expect(partManager.getCount()).toBe(2);
    });
  });

  describe('getTotalPartInstances', () => {
    test('應該返回正確的零件實例總數', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      expect(partManager.getTotalPartInstances()).toBe(0);
      
      partManager.addPart(1200, 5, angles);  // 5個實例
      expect(partManager.getTotalPartInstances()).toBe(5);
      
      partManager.addPart(1500, 3, angles);  // 3個實例
      expect(partManager.getTotalPartInstances()).toBe(8);
      
      partManager.addPart(800, 2, angles);   // 2個實例
      expect(partManager.getTotalPartInstances()).toBe(10);
    });
  });

  describe('getPartsWithBevelAngles', () => {
    test('應該返回有斜切角度的零件', () => {
      const straightAngles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      const bevelAngles: PartAngles = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 30
      };

      partManager.addPart(1200, 5, straightAngles);
      const bevelPart = partManager.addPart(1500, 3, bevelAngles);
      
      const bevelParts = partManager.getPartsWithBevelAngles();
      expect(bevelParts).toHaveLength(1);
      expect(bevelParts[0]).toEqual(bevelPart);
    });
  });

  describe('複雜場景測試', () => {
    test('應該能處理多種規格的零件', () => {
      const angles1: PartAngles = { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 };
      const angles2: PartAngles = { topLeft: 0, topRight: 30, bottomLeft: 0, bottomRight: 0 };
      const angles3: PartAngles = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };

      const part1 = partManager.addPart(1200, 5, angles1, 10);
      const part2 = partManager.addPart(1500, 3, angles2, 15);
      const part3 = partManager.addPart(800, 8, angles3, 20);
      
      expect(partManager.getCount()).toBe(3);
      expect(partManager.getTotalPartInstances()).toBe(16); // 5+3+8
      
      const bevelParts = partManager.getPartsWithBevelAngles();
      expect(bevelParts).toHaveLength(2); // part1 和 part2 有斜切角度
    });

    test('應該能處理大量零件', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };

      // 添加100種不同規格的零件
      for (let i = 1; i <= 100; i++) {
        partManager.addPart(i * 100, i, angles);
      }
      
      expect(partManager.getCount()).toBe(100);
      
      // 總實例數應該是 1+2+3+...+100 = 5050
      const expectedTotal = (100 * 101) / 2;
      expect(partManager.getTotalPartInstances()).toBe(expectedTotal);
    });
  });
});