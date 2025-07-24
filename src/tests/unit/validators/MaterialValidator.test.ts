import { MaterialValidator } from '../../../validators/MaterialValidator';
import { Material } from '../../../types';

describe('MaterialValidator', () => {
  let validator: MaterialValidator;

  beforeEach(() => {
    validator = new MaterialValidator();
  });

  describe('validateSingleMaterial', () => {
    it('應該接受有效的材料', () => {
      const material: Material = { id: 'M1', length: 6000 };
      const result = validator.validateSingleMaterial(material);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('應該拒絕長度為0的材料', () => {
      const material: Material = { id: 'M1', length: 0 };
      const result = validator.validateSingleMaterial(material);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('材料長度必須大於0');
    });

    it('應該拒絕負數長度的材料', () => {
      const material: Material = { id: 'M1', length: -1000 };
      const result = validator.validateSingleMaterial(material);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('材料長度不能為負數');
    });

    it('應該拒絕長度過小的材料', () => {
      const material: Material = { id: 'M1', length: 50 };
      const result = validator.validateSingleMaterial(material);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('材料長度必須至少為100mm');
    });

    it('應該拒絕長度過大的材料', () => {
      const material: Material = { id: 'M1', length: 25000 };
      const result = validator.validateSingleMaterial(material);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('材料長度不能超過20000mm');
    });

    it('應該拒絕非整數長度', () => {
      const material: Material = { id: 'M1', length: 6000.5 };
      const result = validator.validateSingleMaterial(material);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('材料長度必須是整數');
    });

    it('應該拒絕NaN長度', () => {
      const material: Material = { id: 'M1', length: NaN };
      const result = validator.validateSingleMaterial(material);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('材料長度必須是有效數字');
    });

    it('應該拒絕Infinity長度', () => {
      const material: Material = { id: 'M1', length: Infinity };
      const result = validator.validateSingleMaterial(material);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('材料長度必須是有效數字');
    });

    it('應該拒絕沒有ID的材料', () => {
      const material: Material = { id: '', length: 6000 };
      const result = validator.validateSingleMaterial(material);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('材料必須有有效的ID');
    });
  });

  describe('validateMaterialList', () => {
    it('應該接受空列表', () => {
      const result = validator.validateMaterialList([]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('應該接受沒有重複長度的材料列表', () => {
      const materials: Material[] = [
        { id: 'M1', length: 3000 },
        { id: 'M2', length: 6000 },
        { id: 'M3', length: 9000 }
      ];
      const result = validator.validateMaterialList(materials);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('應該拒絕有重複長度的材料列表', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000 },
        { id: 'M2', length: 6000 },
        { id: 'M3', length: 9000 }
      ];
      const result = validator.validateMaterialList(materials);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('材料長度 6000mm 重複出現（M1, M2）');
    });

    it('應該拒絕多個重複長度', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000 },
        { id: 'M2', length: 6000 },
        { id: 'M3', length: 9000 },
        { id: 'M4', length: 9000 },
        { id: 'M5', length: 9000 }
      ];
      const result = validator.validateMaterialList(materials);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('材料長度 6000mm 重複出現（M1, M2）');
      expect(result.errors).toContain('材料長度 9000mm 重複出現（M3, M4, M5）');
    });

    it('應該同時檢查單個材料的有效性和重複性', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000 },
        { id: 'M2', length: -1000 }, // 無效
        { id: 'M3', length: 6000 }  // 重複
      ];
      const result = validator.validateMaterialList(materials);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('材料 M2: 材料長度不能為負數');
      expect(result.errors).toContain('材料長度 6000mm 重複出現（M1, M3）');
    });

    it('應該處理沒有ID的材料', () => {
      const materials: Material[] = [
        { id: '', length: 6000 },
        { id: 'M2', length: 6000 }
      ];
      const result = validator.validateMaterialList(materials);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('材料 : 材料必須有有效的ID');
    });
  });

  describe('checkDuplicateLengths', () => {
    it('應該返回空陣列當沒有重複時', () => {
      const materials: Material[] = [
        { id: 'M1', length: 3000 },
        { id: 'M2', length: 6000 },
        { id: 'M3', length: 9000 }
      ];
      const duplicates = validator.checkDuplicateLengths(materials);
      expect(duplicates).toHaveLength(0);
    });

    it('應該返回重複的長度資訊', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000 },
        { id: 'M2', length: 6000 },
        { id: 'M3', length: 9000 }
      ];
      const duplicates = validator.checkDuplicateLengths(materials);
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].length).toBe(6000);
      expect(duplicates[0].materialIds).toEqual(['M1', 'M2']);
    });

    it('應該返回多個重複長度', () => {
      const materials: Material[] = [
        { id: 'M1', length: 6000 },
        { id: 'M2', length: 6000 },
        { id: 'M3', length: 9000 },
        { id: 'M4', length: 9000 }
      ];
      const duplicates = validator.checkDuplicateLengths(materials);
      expect(duplicates).toHaveLength(2);
    });
  });

  describe('isValidForProduction', () => {
    it('應該接受合理的材料長度', () => {
      const material: Material = { id: 'M1', length: 6000 };
      expect(validator.isValidForProduction(material)).toBe(true);
    });

    it('應該拒絕非標準長度', () => {
      const material: Material = { id: 'M1', length: 6543 };
      expect(validator.isValidForProduction(material)).toBe(false);
    });

    it('應該接受常見的標準長度', () => {
      const standardLengths = [3000, 4000, 5000, 6000, 9000, 12000];
      standardLengths.forEach(length => {
        const material: Material = { id: 'M1', length };
        expect(validator.isValidForProduction(material)).toBe(true);
      });
    });
  });

  describe('generateUniqueLengths', () => {
    it('應該生成指定數量的不重複長度', () => {
      const lengths = validator.generateUniqueLengths(5);
      expect(lengths).toHaveLength(5);
      const uniqueLengths = new Set(lengths);
      expect(uniqueLengths.size).toBe(5);
    });

    it('應該生成合理範圍內的長度', () => {
      const lengths = validator.generateUniqueLengths(10);
      lengths.forEach(length => {
        expect(length).toBeGreaterThanOrEqual(3000);
        expect(length).toBeLessThanOrEqual(12000);
        expect(length % 100).toBe(0); // 應該是100的倍數
      });
    });

    it('應該處理請求數量超過可用選項的情況', () => {
      const lengths = validator.generateUniqueLengths(20);
      expect(lengths.length).toBeGreaterThan(0);
      const uniqueLengths = new Set(lengths);
      expect(uniqueLengths.size).toBe(lengths.length);
    });

    it('應該處理0或負數數量', () => {
      expect(validator.generateUniqueLengths(0)).toEqual([]);
      expect(validator.generateUniqueLengths(-5)).toEqual([]);
    });
  });

  describe('實際應用場景', () => {
    it('應該驗證實際的材料配置', () => {
      const materials: Material[] = [
        { id: 'STL-3M', length: 3000 },
        { id: 'STL-6M', length: 6000 },
        { id: 'STL-9M', length: 9000 },
        { id: 'STL-12M', length: 12000 }
      ];
      const result = validator.validateMaterialList(materials);
      expect(result.isValid).toBe(true);
    });

    it('應該拒絕不合理的材料配置', () => {
      const materials: Material[] = [
        { id: 'M1', length: 100 },    // 太短
        { id: 'M2', length: 30000 },  // 太長
        { id: 'M3', length: 6000 },
        { id: 'M4', length: 6000 }    // 重複
      ];
      const result = validator.validateMaterialList(materials);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});