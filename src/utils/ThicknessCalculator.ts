import { PartAngles } from '../types';

export class ThicknessCalculator {
  /**
   * 根據零件長度和斜切角度，推算零件的板材厚度
   * 這裡我們使用一個簡化的假設：板材厚度與零件長度成比例
   * 實際應用中，這個值應該由用戶提供或從其他系統獲取
   * 
   * @param length - 零件長度 (mm)
   * @param angles - 零件四個角的角度
   * @returns 推算的板材厚度 (mm)
   */
  static calculateEffectiveThickness(length: number, angles?: PartAngles): number {
    if (!angles || !this.hasAngledCut(angles)) {
      return 0;
    }

    // 簡化假設：板材厚度約為長度的 2-3%
    // 這是一個合理的假設，因為：
    // - 小零件（100-500mm）：厚度約 5-15mm
    // - 中零件（500-1000mm）：厚度約 15-25mm
    // - 大零件（1000mm+）：厚度約 25-50mm
    
    let baseThickness: number;
    if (length <= 300) {
      baseThickness = 10; // 小零件默認10mm
    } else if (length <= 600) {
      baseThickness = 15; // 中小零件默認15mm
    } else if (length <= 1000) {
      baseThickness = 20; // 中零件默認20mm
    } else if (length <= 1500) {
      baseThickness = 25; // 中大零件默認25mm
    } else {
      baseThickness = 30; // 大零件默認30mm
    }

    // 根據斜切角度調整厚度
    // 角度越小（斜切越陡），需要的板材越厚
    const minAngle = this.getMinAngle(angles);
    if (minAngle < 30) {
      baseThickness *= 1.5; // 陡角需要更厚的板材
    } else if (minAngle < 45) {
      baseThickness *= 1.2; // 中等角度
    }

    return Math.round(baseThickness);
  }

  /**
   * 獲取零件的最小角度（非90度）
   */
  private static getMinAngle(angles: PartAngles): number {
    const nonRightAngles = [
      angles.topLeft,
      angles.topRight,
      angles.bottomLeft,
      angles.bottomRight
    ].filter(angle => angle !== 90 && angle !== 0);

    return nonRightAngles.length > 0 ? Math.min(...nonRightAngles) : 90;
  }

  /**
   * 檢查零件是否有斜切角度
   */
  static hasAngledCut(angles?: PartAngles): boolean {
    if (!angles) {
      return false;
    }

    // 檢查是否有任何非90度的角度
    return (
      angles.topLeft !== 90 ||
      angles.topRight !== 90 ||
      angles.bottomLeft !== 90 ||
      angles.bottomRight !== 90
    );
  }

  /**
   * 獲取用於共刀計算的有效厚度
   * 對於共刀計算，我們使用推算的板材厚度
   */
  static getSharedCutThickness(length: number, angles?: PartAngles): number {
    return this.calculateEffectiveThickness(length, angles);
  }
}