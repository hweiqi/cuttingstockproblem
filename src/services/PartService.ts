import { Part, PartAngles, FlipDirection, SharedCutMatchInfo } from '../types';
import { AngleValidator } from '../validators/AngleValidator';

interface PartUpdateOptions {
  length?: number;
  quantity?: number;
  angles?: PartAngles;
}

export class PartService {
  private parts: Map<string, Part> = new Map();
  private idCounter = 0;
  private angleValidator: AngleValidator;

  constructor() {
    this.angleValidator = new AngleValidator();
  }

  addPart(length: number, quantity: number = 1, angles?: PartAngles): Part {
    this.validateLength(length);
    this.validateQuantity(quantity);

    // Validate angles if provided
    if (angles) {
      this.validateAngles(angles);
    }

    const id = this.generateId();
    
    // 自動計算厚度
    // 計算預設厚度，根據零件長度估算
    const thickness = angles ? this.calculateDefaultThickness(length, angles) : 20;
    
    const part: Part = { 
      id, 
      length, 
      quantity,
      angles: angles, // Keep undefined if not provided
      thickness: thickness // 自動計算的厚度
    };
    
    this.parts.set(id, part);
    return part;
  }

  removePart(id: string): boolean {
    return this.parts.delete(id);
  }

  getPart(id: string): Part | undefined {
    return this.parts.get(id);
  }

  getAllParts(): Part[] {
    return Array.from(this.parts.values());
  }

  updatePart(id: string, options: PartUpdateOptions): Part | undefined {
    const part = this.parts.get(id);
    if (!part) {
      return undefined;
    }

    if (options.length !== undefined) {
      this.validateLength(options.length);
      part.length = options.length;
    }

    if (options.quantity !== undefined) {
      this.validateQuantity(options.quantity);
      part.quantity = options.quantity;
    }

    if (options.angles !== undefined) {
      this.validateAngles(options.angles);
      part.angles = options.angles;
    }

    return part;
  }

  clearAllParts(): void {
    this.parts.clear();
    this.idCounter = 0;
  }

  getPartsByLength(ascending: boolean = true): Part[] {
    const parts = this.getAllParts();
    return parts.sort((a, b) => {
      return ascending ? a.length - b.length : b.length - a.length;
    });
  }

  getTotalPartsCount(): number {
    let total = 0;
    for (const part of this.parts.values()) {
      total += part.quantity;
    }
    return total;
  }

  getUniquePartsCount(): number {
    return this.parts.size;
  }

  private validateLength(length: number): void {
    if (length <= 0) {
      throw new Error('Part length must be greater than 0');
    }
    
    if (!Number.isInteger(length)) {
      throw new Error('Part length must be an integer');
    }
  }

  private validateQuantity(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Part quantity must be greater than 0');
    }
    
    if (!Number.isInteger(quantity)) {
      throw new Error('Part quantity must be an integer');
    }
  }

  private generateId(): string {
    return `P${++this.idCounter}`;
  }

  private validateAngles(angles: PartAngles): void {
    // 使用AngleValidator進行驗證
    const validationResult = this.angleValidator.validatePartAngles(angles);
    
    if (!validationResult.isValid) {
      throw new Error(`角度驗證失敗: ${validationResult.errors.join('; ')}`);
    }
  }

  /**
   * 計算預設厚度，根據零件長度估算
   */
  private calculateDefaultThickness(length: number, angles?: PartAngles): number {
    if (!angles || !this.hasAngledCut(angles)) {
      return 20; // 無角度零件預設20mm
    }

    // 根據長度範圍設定基本厚度
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
    const minAngle = this.getMinAngle(angles);
    if (minAngle < 30) {
      baseThickness *= 1.5; // 陡角需要更厚的板材
    } else if (minAngle < 45) {
      baseThickness *= 1.2; // 中等角度
    }

    return Math.round(baseThickness);
  }

  /**
   * 檢查零件是否有斜切角度
   */
  private hasAngledCut(angles?: PartAngles): boolean {
    if (!angles) return false;
    return angles.topLeft > 0 || angles.topRight > 0 || 
           angles.bottomLeft > 0 || angles.bottomRight > 0;
  }

  /**
   * 獲取零件的最小角度（非0度）
   */
  private getMinAngle(angles: PartAngles): number {
    const nonZeroAngles = [
      angles.topLeft,
      angles.topRight,
      angles.bottomLeft,
      angles.bottomRight
    ].filter(angle => angle > 0);

    return nonZeroAngles.length > 0 ? Math.min(...nonZeroAngles) : 90;
  }

  getFlippedAngles(partId: string, direction: FlipDirection): PartAngles | undefined {
    const part = this.parts.get(partId);
    if (!part || !part.angles) {
      return undefined;
    }

    const { topLeft, topRight, bottomLeft, bottomRight } = part.angles;

    switch (direction) {
      case 'horizontal':
        return {
          topLeft: topRight,
          topRight: topLeft,
          bottomLeft: bottomRight,
          bottomRight: bottomLeft
        };
      case 'vertical':
        return {
          topLeft: bottomLeft,
          topRight: bottomRight,
          bottomLeft: topLeft,
          bottomRight: topRight
        };
      case 'both':
        return {
          topLeft: bottomRight,
          topRight: bottomLeft,
          bottomLeft: topRight,
          bottomRight: topLeft
        };
    }
  }

  canPartsShareCut(
    part1Id: string, 
    part2Id: string, 
    part1Side: 'left' | 'right', 
    part2Side: 'left' | 'right'
  ): boolean {
    const part1 = this.parts.get(part1Id);
    const part2 = this.parts.get(part2Id);

    if (!part1 || !part2 || !part1.angles || !part2.angles) {
      return false;
    }

    const part1Angles = this.getSideAngles(part1.angles, part1Side);
    const part2Angles = this.getSideAngles(part2.angles, part2Side);

    // Check if angles match (for shared cutting, the angles should be complementary)
    return part1Angles.top === part2Angles.top && part1Angles.bottom === part2Angles.bottom;
  }

  private getSideAngles(angles: PartAngles, side: 'left' | 'right'): { top: number; bottom: number } {
    if (side === 'left') {
      return { top: angles.topLeft, bottom: angles.bottomLeft };
    } else {
      return { top: angles.topRight, bottom: angles.bottomRight };
    }
  }

  calculateAngleDifference(
    part1Id: string,
    part2Id: string,
    part1Side: 'left' | 'right',
    part2Side: 'left' | 'right'
  ): number {
    const part1 = this.parts.get(part1Id);
    const part2 = this.parts.get(part2Id);

    if (!part1 || !part2 || !part1.angles || !part2.angles) {
      return Infinity;
    }

    const part1Angles = this.getSideAngles(part1.angles, part1Side);
    const part2Angles = this.getSideAngles(part2.angles, part2Side);

    // Calculate the sum of absolute differences
    const topDiff = Math.abs(part1Angles.top - part2Angles.top);
    const bottomDiff = Math.abs(part1Angles.bottom - part2Angles.bottom);

    return topDiff + bottomDiff;
  }

  getBestMatchForSharedCut(part1Id: string, part2Id: string): SharedCutMatchInfo | null {
    const part1 = this.parts.get(part1Id);
    const part2 = this.parts.get(part2Id);

    if (!part1 || !part2 || !part1.angles || !part2.angles) {
      return null;
    }

    const configurations: Array<{
      part1Side: 'left' | 'right';
      part2Side: 'left' | 'right';
      requiresFlip: boolean;
      flipDirection?: FlipDirection;
    }> = [
      // Try without flipping
      { part1Side: 'right', part2Side: 'left', requiresFlip: false },
      { part1Side: 'left', part2Side: 'right', requiresFlip: false },
      // Try with horizontal flip
      { part1Side: 'right', part2Side: 'left', requiresFlip: true, flipDirection: 'horizontal' },
      { part1Side: 'left', part2Side: 'right', requiresFlip: true, flipDirection: 'horizontal' },
      // Try with vertical flip
      { part1Side: 'right', part2Side: 'left', requiresFlip: true, flipDirection: 'vertical' },
      { part1Side: 'left', part2Side: 'right', requiresFlip: true, flipDirection: 'vertical' },
      // Try with both flips (180 degree rotation)
      { part1Side: 'right', part2Side: 'left', requiresFlip: true, flipDirection: 'both' },
      { part1Side: 'left', part2Side: 'right', requiresFlip: true, flipDirection: 'both' }
    ];

    let bestMatch: SharedCutMatchInfo | null = null;
    let minDifference = Infinity;

    for (const config of configurations) {
      // Get the angles to compare (flip part2 if needed)
      const part2Angles = config.requiresFlip && config.flipDirection
        ? this.getFlippedAngles(part2Id, config.flipDirection)
        : part2.angles;

      if (!part2Angles) continue;

      // Create a temporary part with flipped angles
      const tempPart2 = { ...part2, angles: part2Angles };
      const tempPart2Id = 'temp-' + part2Id;
      this.parts.set(tempPart2Id, tempPart2);

      const difference = this.calculateAngleDifference(
        part1Id,
        tempPart2Id,
        config.part1Side,
        config.part2Side
      );

      // Clean up temporary part
      this.parts.delete(tempPart2Id);

      if (difference < minDifference) {
        minDifference = difference;
        bestMatch = {
          part1Side: config.part1Side,
          part2Side: config.part2Side,
          requiresFlip: config.requiresFlip,
          flipDirection: config.flipDirection,
          angleDifference: difference
        };
      }
    }

    // Only return a match if the angle difference is acceptable (threshold can be adjusted)
    const ANGLE_DIFFERENCE_THRESHOLD = 10; // Total difference threshold
    if (bestMatch && minDifference <= ANGLE_DIFFERENCE_THRESHOLD) {
      return bestMatch;
    }

    return null;
  }

}