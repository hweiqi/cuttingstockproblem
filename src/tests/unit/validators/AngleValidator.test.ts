import { AngleValidator } from '../../../validators/AngleValidator';
import { PartAngles } from '../../../types';

describe('AngleValidator', () => {
  let validator: AngleValidator;

  beforeEach(() => {
    validator = new AngleValidator();
  });

  describe('validateSingleAngle', () => {
    it('應該接受0度角度', () => {
      const result = validator.validateSingleAngle(0);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('應該接受89度角度', () => {
      const result = validator.validateSingleAngle(89);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('應該拒絕90度角度', () => {
      const result = validator.validateSingleAngle(90);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('角度必須在0-89度之間');
    });

    it('應該拒絕大於90度的角度', () => {
      const result = validator.validateSingleAngle(95);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('角度必須在0-89度之間');
    });

    it('應該拒絕負數角度', () => {
      const result = validator.validateSingleAngle(-5);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('角度不能為負數');
    });

    it('應該接受45.5度等小數角度', () => {
      const result = validator.validateSingleAngle(45.5);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('應該拒絕NaN', () => {
      const result = validator.validateSingleAngle(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('角度必須是有效數字');
    });

    it('應該拒絕Infinity', () => {
      const result = validator.validateSingleAngle(Infinity);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('角度必須是有效數字');
    });
  });

  describe('validatePartAngles', () => {
    it('應該拒絕所有角度都是0度（全部為0不允許）', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };
      const result = validator.validatePartAngles(angles);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('所有角度不能全部為0');
    });

    it('應該接受有效的單側斜切', () => {
      const angles: PartAngles = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };
      const result = validator.validatePartAngles(angles);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('應該拒絕左側上下同時有角度', () => {
      const angles: PartAngles = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 60,
        bottomRight: 0
      };
      const result = validator.validatePartAngles(angles);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('左側不能同時有上下斜切角度');
    });

    it('應該拒絕右側上下同時有角度', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 30,
        bottomLeft: 0,
        bottomRight: 45
      };
      const result = validator.validatePartAngles(angles);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('右側不能同時有上下斜切角度');
    });

    it('應該拒絕左右兩側都有上下角度', () => {
      const angles: PartAngles = {
        topLeft: 30,
        topRight: 45,
        bottomLeft: 60,
        bottomRight: 75
      };
      const result = validator.validatePartAngles(angles);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('左側不能同時有上下斜切角度');
      expect(result.errors).toContain('右側不能同時有上下斜切角度');
    });

    it('應該接受對角線斜切（左上右下）', () => {
      const angles: PartAngles = {
        topLeft: 45,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 30
      };
      const result = validator.validatePartAngles(angles);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('應該接受對角線斜切（右上左下）', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 60,
        bottomLeft: 30,
        bottomRight: 0
      };
      const result = validator.validatePartAngles(angles);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('應該拒絕包含無效角度的組合', () => {
      const angles: PartAngles = {
        topLeft: 91,
        topRight: -5,
        bottomLeft: 0,
        bottomRight: 0
      };
      const result = validator.validatePartAngles(angles);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2); // topLeft, topRight無效
      expect(result.errors).toContain('左上: 角度必須在0-89度之間');
      expect(result.errors).toContain('右上: 角度不能為負數');
    });

    it('應該處理undefined或null的情況', () => {
      const result1 = validator.validatePartAngles(undefined);
      expect(result1.isValid).toBe(true);
      expect(result1.errors).toHaveLength(0);

      const result2 = validator.validatePartAngles(null as any);
      expect(result2.isValid).toBe(true);
      expect(result2.errors).toHaveLength(0);
    });

    it('應該驗證實際應用場景：單邊斜切', () => {
      // 只有頂部斜切
      const topCut: PartAngles = {
        topLeft: 45,
        topRight: 45,
        bottomLeft: 0,
        bottomRight: 0
      };
      expect(validator.validatePartAngles(topCut).isValid).toBe(true);

      // 只有底部斜切
      const bottomCut: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 30,
        bottomRight: 30
      };
      expect(validator.validatePartAngles(bottomCut).isValid).toBe(true);
    });

    it('應該驗證實際應用場景：L型切割', () => {
      // L型切割（左上角）
      const lCut1: PartAngles = {
        topLeft: 45,
        topRight: 45,
        bottomLeft: 45,
        bottomRight: 0
      };
      expect(validator.validatePartAngles(lCut1).isValid).toBe(false); // 左側有上下角度

      // 正確的L型應該這樣
      const lCut2: PartAngles = {
        topLeft: 45,
        topRight: 45,
        bottomLeft: 0,
        bottomRight: 0
      };
      expect(validator.validatePartAngles(lCut2).isValid).toBe(true);
    });
  });

  describe('normalizeAngles', () => {
    it('應該將0度標準化為0', () => {
      const angles: PartAngles = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };
      const normalized = validator.normalizeAngles(angles);
      expect(normalized).toEqual(angles);
    });

    it('應該將89.9度保持為89.9', () => {
      const angles: PartAngles = {
        topLeft: 89.9,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };
      const normalized = validator.normalizeAngles(angles);
      expect(normalized.topLeft).toBe(89.9);
    });

    it('應該將90度限制為89', () => {
      const angles: PartAngles = {
        topLeft: 90,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };
      const normalized = validator.normalizeAngles(angles);
      expect(normalized.topLeft).toBe(89);
    });

    it('應該將負數角度設為0', () => {
      const angles: PartAngles = {
        topLeft: -10,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };
      const normalized = validator.normalizeAngles(angles);
      expect(normalized.topLeft).toBe(0);
    });

    it('應該處理undefined', () => {
      const normalized = validator.normalizeAngles(undefined);
      expect(normalized).toEqual({
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      });
    });
  });

  describe('isValidForProduction', () => {
    it('應該檢查生產可行性', () => {
      // 太小的角度可能難以生產
      const tooSmall: PartAngles = {
        topLeft: 1,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };
      expect(validator.isValidForProduction(tooSmall)).toBe(false);

      // 合理的生產角度
      const reasonable: PartAngles = {
        topLeft: 30,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };
      expect(validator.isValidForProduction(reasonable)).toBe(true);
    });

    it('應該拒絕過於複雜的角度組合', () => {
      // 四個不同角度太複雜
      const complex: PartAngles = {
        topLeft: 30,
        topRight: 45,
        bottomLeft: 0,
        bottomRight: 60
      };
      expect(validator.isValidForProduction(complex)).toBe(false);
    });
  });
});