import { PartAngles } from '../types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface AnglesValidationResult {
  isValid: boolean;
  errors: string[];
}

export class AngleValidator {
  private readonly MIN_ANGLE = 0;
  private readonly MAX_ANGLE = 89;
  private readonly NO_CUT_ANGLE = 90;
  private readonly MIN_PRODUCTION_ANGLE = 15; // 最小可生產角度

  /**
   * 驗證單個角度值
   */
  validateSingleAngle(angle: number): ValidationResult {
    // 檢查是否為有效數字
    if (isNaN(angle) || !isFinite(angle)) {
      return { isValid: false, error: '角度必須是有效數字' };
    }

    // 檢查負數
    if (angle < 0) {
      return { isValid: false, error: '角度不能為負數' };
    }

    // 90度不應該被輸入
    if (angle >= this.NO_CUT_ANGLE) {
      return { isValid: false, error: '角度必須在0-89度之間' };
    }

    // 檢查範圍
    if (angle > this.MAX_ANGLE) {
      return { isValid: false, error: '角度必須在0-89度之間' };
    }

    return { isValid: true };
  }

  /**
   * 驗證零件的所有角度
   */
  validatePartAngles(angles: PartAngles | undefined | null): AnglesValidationResult {
    const errors: string[] = [];

    // 如果沒有角度資訊，視為全部90度（有效）
    if (!angles) {
      return { isValid: true, errors: [] };
    }

    // 驗證每個角度值
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;
    
    for (const position of positions) {
      const angle = angles[position];
      const result = this.validateSingleAngle(angle);
      if (!result.isValid) {
        errors.push(`${this.getPositionName(position)}: ${result.error}`);
      }
    }

    // 檢查左側是否同時有上下角度（0度表示無角度）
    if (angles.topLeft > 0 && angles.bottomLeft > 0) {
      errors.push('左側不能同時有上下斜切角度');
    }

    // 檢查右側是否同時有上下角度（0度表示無角度）
    if (angles.topRight > 0 && angles.bottomRight > 0) {
      errors.push('右側不能同時有上下斜切角度');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 標準化角度值
   */
  normalizeAngles(angles: PartAngles | undefined): PartAngles {
    if (!angles) {
      return {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
      };
    }

    return {
      topLeft: this.normalizeAngle(angles.topLeft),
      topRight: this.normalizeAngle(angles.topRight),
      bottomLeft: this.normalizeAngle(angles.bottomLeft),
      bottomRight: this.normalizeAngle(angles.bottomRight)
    };
  }

  /**
   * 檢查角度組合是否適合生產
   */
  isValidForProduction(angles: PartAngles): boolean {
    // 檢查是否有太小的角度
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;
    
    for (const position of positions) {
      const angle = angles[position];
      if (angle > 0 && angle < this.MIN_PRODUCTION_ANGLE) {
        return false;
      }
    }

    // 檢查是否有太多不同的角度（複雜度）
    const uniqueAngles = new Set([
      angles.topLeft,
      angles.topRight,
      angles.bottomLeft,
      angles.bottomRight
    ]);
    
    // 移除0度（無角度）
    uniqueAngles.delete(0);
    
    // 如果有超過2個不同的角度，可能太複雜
    if (uniqueAngles.size > 2) {
      return false;
    }

    return true;
  }

  /**
   * 生成有效的隨機角度組合
   */
  generateValidAngles(): PartAngles {
    const angleOptions = [0, 30, 45, 60, 75]; // 0表示無角度
    const patterns = [
      // 無斜切
      { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
      // 單邊斜切
      { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 0 },
      { topLeft: 0, topRight: 45, bottomLeft: 0, bottomRight: 0 },
      { topLeft: 0, topRight: 0, bottomLeft: 45, bottomRight: 0 },
      { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 45 },
      // 頂部斜切
      { topLeft: 45, topRight: 45, bottomLeft: 0, bottomRight: 0 },
      // 底部斜切
      { topLeft: 0, topRight: 0, bottomLeft: 45, bottomRight: 45 },
      // 對角斜切
      { topLeft: 45, topRight: 0, bottomLeft: 0, bottomRight: 45 },
      { topLeft: 0, topRight: 45, bottomLeft: 45, bottomRight: 0 }
    ];

    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    // 替換角度值
    const result: PartAngles = { ...randomPattern };
    const positions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;
    
    for (const position of positions) {
      if (result[position] > 0) {
        // 從非零角度中隨機選擇
        const nonZeroOptions = angleOptions.filter(a => a > 0);
        const randomAngle = nonZeroOptions[Math.floor(Math.random() * nonZeroOptions.length)];
        result[position] = randomAngle;
      }
    }

    return result;
  }

  /**
   * 標準化單個角度
   */
  private normalizeAngle(angle: number): number {
    if (angle < 0) return 0;
    if (angle >= this.NO_CUT_ANGLE) return this.MAX_ANGLE; // 90度或以上限制為89度
    return angle;
  }

  /**
   * 獲取位置的中文名稱
   */
  private getPositionName(position: string): string {
    const names: Record<string, string> = {
      topLeft: '左上',
      topRight: '右上',
      bottomLeft: '左下',
      bottomRight: '右下'
    };
    return names[position] || position;
  }
}