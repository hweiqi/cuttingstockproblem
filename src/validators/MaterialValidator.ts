import { Material } from '../types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface MaterialListValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface DuplicateLengthInfo {
  length: number;
  materialIds: string[];
}

export class MaterialValidator {
  private readonly MIN_LENGTH = 100;
  private readonly MAX_LENGTH = 20000;
  private readonly STANDARD_LENGTHS = [3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000];

  /**
   * 驗證單個材料
   */
  validateSingleMaterial(material: Material): ValidationResult {
    // 檢查ID
    if (!material.id || material.id.trim() === '') {
      return { isValid: false, error: '材料必須有有效的ID' };
    }

    // 檢查長度是否為有效數字
    if (isNaN(material.length) || !isFinite(material.length)) {
      return { isValid: false, error: '材料長度必須是有效數字' };
    }

    // 檢查負數
    if (material.length < 0) {
      return { isValid: false, error: '材料長度不能為負數' };
    }

    // 檢查長度為0
    if (material.length === 0) {
      return { isValid: false, error: '材料長度必須大於0' };
    }

    // 檢查最小長度
    if (material.length < this.MIN_LENGTH) {
      return { isValid: false, error: `材料長度必須至少為${this.MIN_LENGTH}mm` };
    }

    // 檢查最大長度
    if (material.length > this.MAX_LENGTH) {
      return { isValid: false, error: `材料長度不能超過${this.MAX_LENGTH}mm` };
    }

    // 檢查是否為整數
    if (!Number.isInteger(material.length)) {
      return { isValid: false, error: '材料長度必須是整數' };
    }

    return { isValid: true };
  }

  /**
   * 驗證材料列表
   */
  validateMaterialList(materials: Material[]): MaterialListValidationResult {
    const errors: string[] = [];

    // 驗證每個材料
    materials.forEach(material => {
      const result = this.validateSingleMaterial(material);
      if (!result.isValid) {
        errors.push(`材料 ${material.id}: ${result.error}`);
      }
    });

    // 檢查重複長度
    const duplicates = this.checkDuplicateLengths(materials);
    duplicates.forEach(dup => {
      errors.push(`材料長度 ${dup.length}mm 重複出現（${dup.materialIds.join(', ')}）`);
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 檢查重複長度
   */
  checkDuplicateLengths(materials: Material[]): DuplicateLengthInfo[] {
    const lengthMap = new Map<number, string[]>();
    
    // 收集每個長度對應的材料ID
    materials.forEach(material => {
      if (!lengthMap.has(material.length)) {
        lengthMap.set(material.length, []);
      }
      lengthMap.get(material.length)!.push(material.id);
    });

    // 找出重複的長度
    const duplicates: DuplicateLengthInfo[] = [];
    lengthMap.forEach((ids, length) => {
      if (ids.length > 1) {
        duplicates.push({ length, materialIds: ids });
      }
    });

    return duplicates;
  }

  /**
   * 檢查是否為生產可用的標準長度
   */
  isValidForProduction(material: Material): boolean {
    // 檢查是否為標準長度
    return this.STANDARD_LENGTHS.includes(material.length);
  }

  /**
   * 生成不重複的材料長度
   */
  generateUniqueLengths(count: number): number[] {
    if (count <= 0) return [];

    const availableLengths = [...this.STANDARD_LENGTHS];
    const result: number[] = [];

    // 如果請求數量超過標準長度數量，需要生成額外的長度
    if (count > availableLengths.length) {
      // 添加一些非標準但合理的長度（100的倍數）
      for (let i = 3500; i <= 11500; i += 500) {
        if (!availableLengths.includes(i)) {
          availableLengths.push(i);
        }
      }
    }

    // 隨機選擇不重複的長度
    const shuffled = [...availableLengths].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * 驗證材料是否可以被添加到現有列表
   */
  canAddToList(newMaterial: Material, existingMaterials: Material[]): ValidationResult {
    // 首先驗證材料本身
    const singleValidation = this.validateSingleMaterial(newMaterial);
    if (!singleValidation.isValid) {
      return singleValidation;
    }

    // 檢查長度是否已存在
    const duplicateLength = existingMaterials.find(m => m.length === newMaterial.length);
    if (duplicateLength) {
      return { 
        isValid: false, 
        error: `長度 ${newMaterial.length}mm 已存在（${duplicateLength.id}）` 
      };
    }

    return { isValid: true };
  }

  /**
   * 獲取建議的材料長度（不與現有材料重複）
   */
  getSuggestedLengths(existingMaterials: Material[], count: number = 5): number[] {
    const existingLengths = new Set(existingMaterials.map(m => m.length));
    const suggestions = this.STANDARD_LENGTHS.filter(length => !existingLengths.has(length));
    
    return suggestions.slice(0, count);
  }
}